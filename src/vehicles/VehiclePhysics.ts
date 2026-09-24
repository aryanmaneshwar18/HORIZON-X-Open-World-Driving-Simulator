import * as THREE from 'three';
import { CarDefinition, CarUpgrades, SurfaceType } from '../types/game';

export interface PhysicsState {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  quaternion: THREE.Quaternion;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  speedKmh: number;
  rpm: number;           // 0.0 to 1.0 (idle to redline)
  gear: number;          // -1 (R), 0 (N), 1 to 6
  steerAngle: number;    // current front wheel angle in radians
  isDrifting: boolean;
  driftAngleDeg: number;
  driftScore: number;
  driftMultiplier: number;
  isNitroActive: boolean;
  nitroLevel: number;    // 0.0 to 1.0
  isGrounded: boolean;
  pitch: number;         // chassis pitch tilt (radians)
  roll: number;          // chassis roll tilt (radians)
  surface: 'asphalt' | 'dirt' | 'grass' | 'water';
}

export class VehiclePhysics {
  public state: PhysicsState;
  private carDef: CarDefinition;
  private upgrades: CarUpgrades;

  // Physical parameters derived from car stats & upgrades
  private mass: number = 1300;
  private maxPowerForce: number = 7500;
  private maxBrakeForce: number = 11000;
  private maxSteerAngle: number = 0.58; // ~33 deg
  private topSpeedKmh: number = 230;
  private gripMultiplier: number = 1.0;
  private driftEaseMultiplier: number = 1.0;

  // Internal states
  private heading: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
  private lateralSlip: number = 0;
  private driftDuration: number = 0;
  private driftChainTimer: number = 0;
  private consecutiveDrifts: number = 0;
  private lastGearShiftTime: number = 0;

  // Gear transmission ratios (approximate)
  private gearMaxSpeeds: number[] = [0, 55, 95, 140, 185, 235, 310];

  constructor(carDef: CarDefinition, upgrades: CarUpgrades, initialPos: THREE.Vector3 = new THREE.Vector3(0, 0.5, 0)) {
    this.carDef = carDef;
    this.upgrades = upgrades;
    this.state = {
      position: initialPos.clone(),
      rotation: new THREE.Euler(0, 0, 0, 'YXZ'),
      quaternion: new THREE.Quaternion(),
      velocity: new THREE.Vector3(0, 0, 0),
      angularVelocity: new THREE.Vector3(0, 0, 0),
      speedKmh: 0,
      rpm: 0.15,
      gear: 1,
      steerAngle: 0,
      isDrifting: false,
      driftAngleDeg: 0,
      driftScore: 0,
      driftMultiplier: 1,
      isNitroActive: false,
      nitroLevel: 1.0,
      isGrounded: true,
      pitch: 0,
      roll: 0,
      surface: 'asphalt',
    };

    this.recalculatePerformance();
  }

  public updateCarConfig(carDef: CarDefinition, upgrades: CarUpgrades) {
    this.carDef = carDef;
    this.upgrades = upgrades;
    this.recalculatePerformance();
  }

  private recalculatePerformance() {
    const stats = this.carDef.stats;
    const upg = this.upgrades;

    // Weight
    this.mass = stats.weight * (1.0 - (upg.weightReduction || 0) * 0.04);

    // Power & Top Speed
    const powerBonus = 1.0 + (upg.engine || 0) * 0.12 + (upg.turbo || 0) * 0.15;
    this.topSpeedKmh = stats.topSpeed * (1.0 + (upg.engine || 0) * 0.05 + (upg.turbo || 0) * 0.08) * (upg.gearRatio || 1.0);
    this.maxPowerForce = (stats.power * 950 + 2000) * powerBonus;

    // Braking
    this.maxBrakeForce = (stats.braking * 1400 + 4000) * (1.0 + (upg.brakes || 0) * 0.15);

    // Grip & Handling
    const tireBonus = 1.0 + (upg.tires || 0) * 0.12;
    const suspBonus = 1.0 + (upg.suspension || 0) * 0.10;
    this.gripMultiplier = (stats.grip / 7.0) * tireBonus * suspBonus;
    this.driftEaseMultiplier = (stats.drift / 6.5);

    // Transmission gear distribution scaled by top speed
    this.gearMaxSpeeds = [
      0,
      this.topSpeedKmh * 0.22,
      this.topSpeedKmh * 0.40,
      this.topSpeedKmh * 0.60,
      this.topSpeedKmh * 0.78,
      this.topSpeedKmh * 0.92,
      this.topSpeedKmh * 1.15,
    ];
  }

  public update(dt: number, inputs: {
    throttle: number;
    brake: number;
    steer: number;
    handbrake: boolean;
    nitro: boolean;
  }, getGroundHeight: (x: number, z: number) => { height: number; surface: 'asphalt' | 'dirt' | 'grass' | 'water'; normal: THREE.Vector3 }) {
    if (dt > 0.1) dt = 0.1; // clamp delta to prevent tunneling

    // 1. Calculate heading & local directions
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.state.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.state.quaternion).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.state.quaternion).normalize();
    this.heading.copy(forward);

    // 2. Velocity projection
    const forwardVel = this.state.velocity.dot(forward);
    const lateralVel = this.state.velocity.dot(right);
    const verticalVel = this.state.velocity.y;
    const currentSpeed = this.state.velocity.length();
    this.state.speedKmh = currentSpeed * 3.6;

    // 3. Ground check & terrain sampling
    const groundInfo = getGroundHeight(this.state.position.x, this.state.position.z);
    this.state.surface = groundInfo.surface;
    const targetGroundY = groundInfo.height;

    // Grounded threshold
    const carBaseHeight = 0.4;
    const distToGround = this.state.position.y - targetGroundY;
    if (distToGround <= carBaseHeight + 0.15 && verticalVel <= 1.0) {
      this.state.isGrounded = true;
      // Snap to ground with smooth suspension
      this.state.position.y += (targetGroundY + carBaseHeight - this.state.position.y) * 15 * dt;
      if (this.state.velocity.y < 0) {
        this.state.velocity.y = 0;
      }
    } else {
      this.state.isGrounded = false;
      // Gravity
      this.state.velocity.y -= 19.6 * dt;
    }

    // 4. Nitro Boost System
    let nitroForce = 0;
    if (inputs.nitro && this.state.nitroLevel > 0.05 && this.state.isGrounded && inputs.throttle > 0.1) {
      this.state.isNitroActive = true;
      this.state.nitroLevel = Math.max(0, this.state.nitroLevel - dt * 0.28);
      nitroForce = this.maxPowerForce * 0.85;
    } else {
      this.state.isNitroActive = false;
      // Nitro regenerates slowly during clean drive or faster during drifts
      const regenRate = this.state.isDrifting ? 0.12 : 0.035;
      this.state.nitroLevel = Math.min(1.0, this.state.nitroLevel + dt * regenRate);
    }

    // 5. Surface grip modifier
    let surfaceGrip = 1.0;
    if (this.state.surface === 'dirt') surfaceGrip = 0.65;
    else if (this.state.surface === 'grass') surfaceGrip = 0.50;
    else if (this.state.surface === 'water') surfaceGrip = 0.35;

    // 6. Steering calculation (Speed-sensitive steering)
    // As speed increases, max steering lock smoothly scales down for stable handling
    const speedRatio = Math.min(1.0, this.state.speedKmh / 220);
    const dynamicMaxSteer = this.maxSteerAngle * (1.0 - speedRatio * 0.65);
    const targetSteerAngle = -inputs.steer * dynamicMaxSteer;
    const steerSpeed = 6.5;
    this.state.steerAngle += (targetSteerAngle - this.state.steerAngle) * steerSpeed * dt;

    // 7. Longitudinal Drive & Brake Forces
    let driveForce = 0;
    const isReversing = forwardVel < -0.5 && inputs.brake > 0.1 && inputs.throttle === 0;

    if (this.state.isGrounded) {
      if (inputs.throttle > 0) {
        // Forward acceleration
        const effectiveTopSpeed = this.state.isNitroActive ? this.topSpeedKmh * 1.22 : this.topSpeedKmh;
        const speedHeadroom = Math.max(0, 1.0 - (this.state.speedKmh / effectiveTopSpeed));
        driveForce = (inputs.throttle * this.maxPowerForce + nitroForce) * speedHeadroom;
        
        // Reverse if stopped or rolling back
        if (forwardVel < -1.0) {
          // Braking while reversing
          driveForce += inputs.throttle * this.maxBrakeForce;
        }
      } else if (inputs.brake > 0) {
        if (forwardVel > 0.8) {
          // Normal forward braking
          driveForce = -inputs.brake * this.maxBrakeForce;
        } else {
          // Reverse drive
          driveForce = -inputs.brake * (this.maxPowerForce * 0.45);
        }
      }

      // Handbrake
      if (inputs.handbrake) {
        driveForce *= 0.2;
      }
    }

    // 8. Transmission & RPM calculation
    if (this.state.speedKmh < 1 && inputs.throttle < 0.1) {
      this.state.gear = 1;
      this.state.rpm = 0.15; // idle
    } else if (isReversing) {
      this.state.gear = -1;
      this.state.rpm = Math.min(1.0, 0.2 + (Math.abs(forwardVel) / 15) * 0.8);
    } else {
      // Find suitable gear
      let currentGear = 1;
      for (let g = 1; g <= 6; g++) {
        if (this.state.speedKmh > this.gearMaxSpeeds[g - 1] * 0.88 && g < 6) {
          currentGear = g + 1;
        }
      }
      this.state.gear = currentGear;
      const gearMin = this.gearMaxSpeeds[currentGear - 1] || 0;
      const gearMax = this.gearMaxSpeeds[currentGear] || (this.topSpeedKmh * 1.15);
      const ratio = (this.state.speedKmh - gearMin) / Math.max(1, gearMax - gearMin);
      this.state.rpm = Math.min(1.0, Math.max(0.18, 0.25 + ratio * 0.75 + (this.state.isNitroActive ? 0.1 : 0)));
    }

    // 9. Lateral grip & Drifting Physics
    let lateralFriction = 7.5 * this.gripMultiplier * surfaceGrip;
    const driftTriggerSpeed = 25; // km/h

    // Drift initiation conditions:
    // a) Handbrake + steering at speed
    // b) Hard countersteer with high lateral momentum
    const isHandbrakeSlide = inputs.handbrake && this.state.speedKmh > driftTriggerSpeed && Math.abs(inputs.steer) > 0.15;
    const isPowerOversteer = inputs.throttle > 0.8 && Math.abs(lateralVel) > 4.5 && this.state.speedKmh > 40;
    const isHighSlip = Math.abs(lateralVel) > 6.0 && this.state.speedKmh > 35;

    const shouldDrift = (isHandbrakeSlide || isPowerOversteer || isHighSlip) && this.state.isGrounded;

    if (shouldDrift) {
      this.state.isDrifting = true;
      // Lower lateral friction allows sliding
      lateralFriction = 2.4 * surfaceGrip * (1.0 / this.driftEaseMultiplier);
      if (inputs.handbrake) lateralFriction *= 0.6;
    } else if (Math.abs(lateralVel) < 1.8 || this.state.speedKmh < 15) {
      this.state.isDrifting = false;
    }

    // 10. Drift Angle & Scoring
    const slipAngleRad = Math.atan2(lateralVel, Math.max(1, Math.abs(forwardVel)));
    this.state.driftAngleDeg = Math.abs(slipAngleRad * (180 / Math.PI));

    if (this.state.isDrifting && this.state.driftAngleDeg > 12 && this.state.speedKmh > 30) {
      this.driftDuration += dt;
      this.driftChainTimer = 1.8; // grace period to link slides

      // Drift multiplier increments with duration & clean countersteer
      const angleMultiplier = Math.min(3.5, 1.0 + (this.state.driftAngleDeg - 12) / 25);
      const speedMultiplier = (this.state.speedKmh / 80);
      const points = Math.floor(dt * 350 * angleMultiplier * speedMultiplier * this.state.driftMultiplier);
      this.state.driftScore += points;

      if (this.driftDuration > 2.2 && this.state.driftMultiplier === 1) this.state.driftMultiplier = 2;
      if (this.driftDuration > 4.5 && this.state.driftMultiplier === 2) this.state.driftMultiplier = 3;
      if (this.driftDuration > 7.0 && this.state.driftMultiplier === 3) this.state.driftMultiplier = 4;
      if (this.driftDuration > 10.0 && this.state.driftMultiplier === 4) this.state.driftMultiplier = 5;
    } else {
      if (this.driftChainTimer > 0) {
        this.driftChainTimer -= dt;
      } else {
        // Reset drift combo
        this.driftDuration = 0;
        this.state.driftMultiplier = 1;
      }
    }

    // 11. Angular rotation (Yaw rate)
    if (this.state.isGrounded) {
      let yawRate = 0;
      if (Math.abs(forwardVel) > 0.5) {
        const directionSign = forwardVel >= 0 ? 1 : -1;
        yawRate = (this.state.steerAngle * forwardVel * 0.16) * directionSign;

        // Extra yaw rotation when sliding / drifting
        if (this.state.isDrifting) {
          const driftYawKick = -Math.sign(lateralVel) * (0.85 * this.driftEaseMultiplier) * dt;
          yawRate += driftYawKick * (Math.abs(forwardVel) / 15);
        }
      }

      this.state.angularVelocity.y = yawRate;
      this.state.rotation.y += this.state.angularVelocity.y;
    }

    // Update quaternion from rotation
    this.state.quaternion.setFromEuler(this.state.rotation);

    // 12. Apply forces & integrate velocity
    if (this.state.isGrounded) {
      // Forward force acceleration
      const forwardAccel = (driveForce / this.mass) * dt;
      const newForwardVel = forwardVel + forwardAccel;

      // Lateral drag / tire friction
      const newLateralVel = lateralVel - (lateralVel * lateralFriction * dt);

      // Rolling resistance & air drag
      const airDragCoeff = 0.0018;
      const dragForce = 0.5 * 1.225 * airDragCoeff * (forwardVel * Math.abs(forwardVel));
      const rollingResistance = 1.8 * Math.sign(forwardVel);

      const netForwardVel = newForwardVel - ((dragForce + rollingResistance) / this.mass) * dt;

      // Reconstruct velocity in world coordinates
      const worldForward = forward.clone().multiplyScalar(netForwardVel);
      const worldLateral = right.clone().multiplyScalar(newLateralVel);

      this.state.velocity.x = worldForward.x + worldLateral.x;
      this.state.velocity.z = worldForward.z + worldLateral.z;
    } else {
      // In air: aerodynamic pitch & roll stabilization
      this.state.velocity.x *= 0.998;
      this.state.velocity.z *= 0.998;
    }

    // 13. Weight transfer chassis pitch & roll (visual lean)
    const targetPitch = -(driveForce / (this.mass * 9.8)) * 0.12;
    const targetRoll = (lateralVel * (this.state.speedKmh / 150)) * 0.05;
    this.state.pitch += (targetPitch - this.state.pitch) * 8.0 * dt;
    this.state.roll += (targetRoll - this.state.roll) * 8.0 * dt;

    // 14. Integrate position
    this.state.position.addScaledVector(this.state.velocity, dt);
  }

  // Crash collision response
  public handleCollision(normal: THREE.Vector3, bounceFactor: number = 0.45) {
    const velDot = this.state.velocity.dot(normal);
    if (velDot < 0) {
      // Reflect velocity along normal
      const impulse = normal.clone().multiplyScalar(-(1 + bounceFactor) * velDot);
      this.state.velocity.add(impulse);
      // Slight angular kick
      this.state.rotation.y += (Math.random() - 0.5) * 0.15;
    }
  }

  // Reset vehicle onto nearest road / safe position
  public resetTo(position: THREE.Vector3, yawAngle: number = 0) {
    this.state.position.copy(position);
    this.state.position.y += 0.5;
    this.state.rotation.set(0, yawAngle, 0, 'YXZ');
    this.state.quaternion.setFromEuler(this.state.rotation);
    this.state.velocity.set(0, 0, 0);
    this.state.angularVelocity.set(0, 0, 0);
    this.state.speedKmh = 0;
    this.state.rpm = 0.15;
    this.state.gear = 1;
    this.state.steerAngle = 0;
    this.state.isDrifting = false;
    this.state.driftScore = 0;
    this.state.pitch = 0;
    this.state.roll = 0;
  }
}
