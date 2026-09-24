import * as THREE from 'three';

export interface AIOpponent {
  id: string;
  name: string;
  personality: 'aggressive' | 'balanced' | 'defensive' | 'speedster';
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  speedKmh: number;
  currentCheckpointIdx: number;
  totalDistanceTraveled: number;
  lap: number;
  topSpeed: number;
  accelPower: number;
  finished: boolean;
  finishTime: number;
}

export class AIController {
  public root: THREE.Group;
  public opponents: AIOpponent[] = [];
  private checkpoints: [number, number, number][] = [];
  private laps: number = 1;

  private aiNames = ['Viper King', 'Apex Ghost', 'Phantom Red', 'Turbo Ken', 'Neon Blade'];
  private aiColors = [0xef4444, 0x3b82f6, 0x10b981, 0x8b5cf6, 0xf59e0b];

  constructor() {
    this.root = new THREE.Group();
  }

  public setup(count: number, startPos: THREE.Vector3, startDir: THREE.Vector3, checkpoints: [number, number, number][], laps: number = 1) {
    this.clear();
    this.checkpoints = checkpoints;
    this.laps = laps;

    const rightDir = new THREE.Vector3().crossVectors(startDir, new THREE.Vector3(0, 1, 0)).normalize();

    for (let i = 0; i < count; i++) {
      const color = this.aiColors[i % this.aiColors.length];
      const mesh = this.buildAICarMesh(color);

      // Grid placement: stagger behind player
      const gridDist = (i + 1) * 7.5;
      const gridSide = (i % 2 === 0 ? 1 : -1) * 3.5;
      const spawnPos = startPos.clone()
        .addScaledVector(startDir, -gridDist)
        .addScaledVector(rightDir, gridSide);

      mesh.position.copy(spawnPos);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), startDir);
      this.root.add(mesh);

      const personalities: ('aggressive' | 'balanced' | 'defensive' | 'speedster')[] = [
        'aggressive', 'balanced', 'defensive', 'speedster', 'balanced'
      ];

      this.opponents.push({
        id: `ai_${i}`,
        name: this.aiNames[i % this.aiNames.length],
        personality: personalities[i % personalities.length],
        mesh,
        position: spawnPos.clone(),
        velocity: new THREE.Vector3(),
        speedKmh: 0,
        currentCheckpointIdx: 0,
        totalDistanceTraveled: 0,
        lap: 1,
        topSpeed: 210 + i * 15,
        accelPower: 38 + i * 4,
        finished: false,
        finishTime: 0,
      });
    }
  }

  public clear() {
    while (this.root.children.length > 0) {
      this.root.remove(this.root.children[0]);
    }
    this.opponents = [];
    this.checkpoints = [];
  }

  private buildAICarMesh(color: number): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.6 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.9 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });

    // Chassis
    const bodyGeo = new THREE.BoxGeometry(1.9, 0.65, 4.3);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    group.add(body);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(1.45, 0.52, 2.0);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 1.05, -0.2);
    group.add(cabin);

    // Wing
    const wingGeo = new THREE.BoxGeometry(1.8, 0.08, 0.3);
    const wing = new THREE.Mesh(wingGeo, bodyMat);
    wing.position.set(0, 1.05, 1.9);
    group.add(wing);

    // Wheels
    const wGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 8);
    wGeo.rotateZ(Math.PI / 2);
    const wFL = new THREE.Mesh(wGeo, tireMat);
    wFL.position.set(-0.9, 0.38, -1.35);
    const wFR = new THREE.Mesh(wGeo, tireMat);
    wFR.position.set(0.9, 0.38, -1.35);
    const wRL = new THREE.Mesh(wGeo, tireMat);
    wRL.position.set(-0.9, 0.38, 1.35);
    const wRR = new THREE.Mesh(wGeo, tireMat);
    wRR.position.set(0.9, 0.38, 1.35);
    group.add(wFL, wFR, wRL, wRR);

    return group;
  }

  public update(dt: number, raceActive: boolean, raceTime: number, playerPos: THREE.Vector3) {
    if (!raceActive || this.checkpoints.length === 0) return;

    for (const ai of this.opponents) {
      if (ai.finished) continue;

      const targetCp = this.checkpoints[ai.currentCheckpointIdx];
      const targetVec = new THREE.Vector3(targetCp[0], targetCp[1], targetCp[2]);
      const toTarget = targetVec.clone().sub(ai.position);
      const distToCp = toTarget.length();

      // Checkpoint advance
      if (distToCp < 18.0) {
        ai.currentCheckpointIdx++;
        if (ai.currentCheckpointIdx >= this.checkpoints.length) {
          if (ai.lap < this.laps) {
            ai.lap++;
            ai.currentCheckpointIdx = 0;
          } else {
            ai.finished = true;
            ai.finishTime = raceTime;
            continue;
          }
        }
      }

      // Steering towards target
      toTarget.y = 0;
      const targetDir = toTarget.normalize();
      const currentForward = new THREE.Vector3(0, 0, -1).applyQuaternion(ai.mesh.quaternion).normalize();

      // Personality adjustments:
      // Aggressive: higher cornering speed, takes inside line
      let maxCornerSpeed = 160;
      if (ai.personality === 'aggressive') maxCornerSpeed = 185;
      else if (ai.personality === 'defensive') maxCornerSpeed = 145;

      const turnAngle = currentForward.angleTo(targetDir);
      let targetSpeed = ai.topSpeed;
      if (turnAngle > 0.3) {
        // Slow down for corner
        targetSpeed = Math.min(targetSpeed, maxCornerSpeed);
      }

      // Accelerate / Brake
      const currentSpeed = ai.velocity.length() * 3.6;
      if (currentSpeed < targetSpeed) {
        ai.speedKmh += ai.accelPower * dt;
      } else {
        ai.speedKmh -= 45 * dt;
      }
      ai.speedKmh = Math.max(0, Math.min(ai.topSpeed, ai.speedKmh));

      // Steer orientation smoothly towards target
      const slerpSpeed = ai.personality === 'aggressive' ? 4.5 : 3.5;
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), targetDir);
      ai.mesh.quaternion.slerp(targetQuat, slerpSpeed * dt);

      // Move forward
      const moveDir = new THREE.Vector3(0, 0, -1).applyQuaternion(ai.mesh.quaternion);
      ai.velocity.copy(moveDir).multiplyScalar(ai.speedKmh / 3.6);
      ai.position.addScaledVector(ai.velocity, dt);
      ai.mesh.position.copy(ai.position);

      ai.totalDistanceTraveled += (ai.speedKmh / 3.6) * dt;
    }
  }

  // Calculate current race positions (1st, 2nd, etc.) comparing player with AI
  public getRacePosition(playerDistTraveled: number, playerLap: number): { position: number; totalRacers: number } {
    const totalRacers = this.opponents.length + 1;
    let aheadCount = 0;

    for (const ai of this.opponents) {
      if (ai.lap > playerLap) {
        aheadCount++;
      } else if (ai.lap === playerLap && ai.totalDistanceTraveled > playerDistTraveled) {
        aheadCount++;
      }
    }

    return { position: aheadCount + 1, totalRacers };
  }
}
