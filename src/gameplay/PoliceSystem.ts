import * as THREE from 'three';

export interface PoliceCruiser {
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  speedKmh: number;
  lightbarLeft: THREE.Mesh;
  lightbarRight: THREE.Mesh;
  active: boolean;
}

export class PoliceSystem {
  public root: THREE.Group;
  public wantedLevel: number = 0; // 0 to 5
  public isPursuitActive: boolean = false;
  public evadeProgress: number = 0; // 0.0 to 1.0 (1.0 = Escaped)
  public bustProgress: number = 0;  // 0.0 to 1.0 (1.0 = Busted)
  public cruisers: PoliceCruiser[] = [];

  private lightTimer: number = 0;
  private lightState: boolean = false;

  constructor() {
    this.root = new THREE.Group();
    this.initCruisers();
  }

  private initCruisers() {
    for (let i = 0; i < 4; i++) {
      const { mesh, lightbarLeft, lightbarRight } = this.buildPoliceCruiserMesh();
      mesh.visible = false;
      this.root.add(mesh);
      this.cruisers.push({
        mesh,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        speedKmh: 0,
        lightbarLeft,
        lightbarRight,
        active: false,
      });
    }
  }

  private buildPoliceCruiserMesh(): { mesh: THREE.Group; lightbarLeft: THREE.Mesh; lightbarRight: THREE.Mesh } {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.7 });
    const whiteDoorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.1, metalness: 0.9 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });

    // Chassis
    const bodyGeo = new THREE.BoxGeometry(1.9, 0.7, 4.5);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    group.add(body);

    // White Police Door panels
    const doorGeo = new THREE.BoxGeometry(1.92, 0.5, 1.8);
    const door = new THREE.Mesh(doorGeo, whiteDoorMat);
    door.position.set(0, 0.55, 0);
    group.add(door);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(1.48, 0.55, 2.2);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 1.1, -0.2);
    group.add(cabin);

    // Roof Police Lightbar
    const lbBaseGeo = new THREE.BoxGeometry(1.1, 0.08, 0.25);
    const lbBase = new THREE.Mesh(lbBaseGeo, bodyMat);
    lbBase.position.set(0, 1.4, -0.2);
    group.add(lbBase);

    // Blue & Red flashing pods
    const podGeo = new THREE.BoxGeometry(0.45, 0.12, 0.22);
    const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const blueMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });

    const lightbarLeft = new THREE.Mesh(podGeo, redMat);
    lightbarLeft.position.set(-0.3, 1.48, -0.2);
    const lightbarRight = new THREE.Mesh(podGeo, blueMat);
    lightbarRight.position.set(0.3, 1.48, -0.2);
    group.add(lightbarLeft, lightbarRight);

    // Wheels
    const wGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8);
    wGeo.rotateZ(Math.PI / 2);
    const wFL = new THREE.Mesh(wGeo, tireMat);
    wFL.position.set(-0.9, 0.4, -1.4);
    const wFR = new THREE.Mesh(wGeo, tireMat);
    wFR.position.set(0.9, 0.4, -1.4);
    const wRL = new THREE.Mesh(wGeo, tireMat);
    wRL.position.set(-0.9, 0.4, 1.4);
    const wRR = new THREE.Mesh(wGeo, tireMat);
    wRR.position.set(0.9, 0.4, 1.4);
    group.add(wFL, wFR, wRL, wRR);

    return { mesh: group, lightbarLeft, lightbarRight };
  }

  public startPursuit(level: number = 2, playerPos: THREE.Vector3, playerHeading: THREE.Vector3) {
    this.wantedLevel = level;
    this.isPursuitActive = true;
    this.evadeProgress = 0;
    this.bustProgress = 0;

    // Spawn cruisers according to wanted level
    const count = Math.min(this.cruisers.length, Math.max(1, level));
    for (let i = 0; i < this.cruisers.length; i++) {
      const cruiser = this.cruisers[i];
      if (i < count) {
        cruiser.active = true;
        cruiser.mesh.visible = true;

        // Spawn behind player
        const spawnDist = 45 + i * 20;
        const sideOffset = (i % 2 === 0 ? 1 : -1) * 6;
        cruiser.position.copy(playerPos)
          .addScaledVector(playerHeading, -spawnDist);
        cruiser.position.x += sideOffset;
        cruiser.mesh.position.copy(cruiser.position);
        cruiser.speedKmh = 120;
      } else {
        cruiser.active = false;
        cruiser.mesh.visible = false;
      }
    }
  }

  public stopPursuit() {
    this.isPursuitActive = false;
    this.wantedLevel = 0;
    this.evadeProgress = 0;
    this.bustProgress = 0;
    for (const c of this.cruisers) {
      c.active = false;
      c.mesh.visible = false;
    }
  }

  public update(dt: number, playerPos: THREE.Vector3, playerSpeedKmh: number): { escaped: boolean; busted: boolean } {
    if (!this.isPursuitActive) return { escaped: false, busted: false };

    // Animate emergency strobe lights
    this.lightTimer += dt;
    if (this.lightTimer > 0.12) {
      this.lightTimer = 0;
      this.lightState = !this.lightState;
      for (const c of this.cruisers) {
        if (!c.active) continue;
        c.lightbarLeft.visible = this.lightState;
        c.lightbarRight.visible = !this.lightState;
      }
    }

    let nearestCruiserDist = Infinity;

    for (const cruiser of this.cruisers) {
      if (!cruiser.active) continue;

      const toPlayer = playerPos.clone().sub(cruiser.position);
      const dist = toPlayer.length();
      if (dist < nearestCruiserDist) nearestCruiserDist = dist;

      // Pursuit steering
      toPlayer.y = 0;
      const chaseDir = toPlayer.normalize();
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), chaseDir);
      cruiser.mesh.quaternion.slerp(targetQuat, 4.0 * dt);

      // Max cruiser speed scales with wanted level
      const maxCruiserSpeed = 190 + this.wantedLevel * 20;
      cruiser.speedKmh = Math.min(maxCruiserSpeed, cruiser.speedKmh + 35 * dt);

      // Move forward
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cruiser.mesh.quaternion);
      cruiser.velocity.copy(forward).multiplyScalar(cruiser.speedKmh / 3.6);
      cruiser.position.addScaledVector(cruiser.velocity, dt);
      cruiser.mesh.position.copy(cruiser.position);
    }

    // Evade vs Busted Mechanics
    if (nearestCruiserDist > 90) {
      // Player is pulling away: Evade meter fills
      this.evadeProgress += dt * 0.12;
      this.bustProgress = Math.max(0, this.bustProgress - dt * 0.5);
      if (this.evadeProgress >= 1.0) {
        this.stopPursuit();
        return { escaped: true, busted: false };
      }
    } else if (nearestCruiserDist < 12 && playerSpeedKmh < 20) {
      // Player is pinned or stopped: Busted meter fills
      this.bustProgress += dt * 0.35;
      this.evadeProgress = Math.max(0, this.evadeProgress - dt * 0.5);
      if (this.bustProgress >= 1.0) {
        this.stopPursuit();
        return { escaped: false, busted: true };
      }
    } else {
      // Active chase in medium range
      this.evadeProgress = Math.max(0, this.evadeProgress - dt * 0.08);
      this.bustProgress = Math.max(0, this.bustProgress - dt * 0.2);
    }

    return { escaped: false, busted: false };
  }
}
