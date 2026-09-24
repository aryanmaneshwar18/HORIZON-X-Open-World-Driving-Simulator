import * as THREE from 'three';
import { RoadSystem } from './RoadSystem';

export interface TrafficCar {
  mesh: THREE.Group;
  splineIdx: number;
  progress: number; // 0.0 to 1.0 along spline
  speed: number;    // units/sec
  color: string;
  active: boolean;
  length: number;
  width: number;
}

export class Traffic {
  public root: THREE.Group;
  private roadSystem: RoadSystem;
  public cars: TrafficCar[] = [];
  private maxCars: number = 10;
  private carColors: number[] = [
    0x3b82f6, 0xef4444, 0x10b981, 0xf59e0b, 0x8b5cf6, 0x64748b, 0xffffff, 0x18181b
  ];

  constructor(roadSystem: RoadSystem) {
    this.roadSystem = roadSystem;
    this.root = new THREE.Group();
    this.initPool();
  }

  private initPool() {
    for (let i = 0; i < this.maxCars; i++) {
      const color = this.carColors[i % this.carColors.length];
      const mesh = this.buildTrafficCarMesh(color);
      mesh.visible = false;
      this.root.add(mesh);

      this.cars.push({
        mesh,
        splineIdx: 0,
        progress: Math.random(),
        speed: 15 + Math.random() * 8, // ~55 - 85 km/h
        color: '#' + color.toString(16),
        active: false,
        length: 4.2,
        width: 1.8,
      });
    }
  }

  private buildTrafficCarMesh(color: number): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.1, metalness: 0.8 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    // Lower Body
    const bodyGeo = new THREE.BoxGeometry(1.8, 0.65, 4.2);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    group.add(body);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(1.45, 0.55, 2.1);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, 1.05, -0.2);
    group.add(cabin);

    // Headlights
    const hlGeo = new THREE.BoxGeometry(0.35, 0.15, 0.05);
    const hlL = new THREE.Mesh(hlGeo, hlMat);
    hlL.position.set(-0.6, 0.65, -2.12);
    const hlR = new THREE.Mesh(hlGeo, hlMat);
    hlR.position.set(0.6, 0.65, -2.12);
    group.add(hlL, hlR);

    // Taillights
    const tlL = new THREE.Mesh(hlGeo, tlMat);
    tlL.position.set(-0.6, 0.65, 2.12);
    const tlR = new THREE.Mesh(hlGeo, tlMat);
    tlR.position.set(0.6, 0.65, 2.12);
    group.add(tlL, tlR);

    // 4 Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 8);
    wheelGeo.rotateZ(Math.PI / 2);
    const wFL = new THREE.Mesh(wheelGeo, tireMat);
    wFL.position.set(-0.85, 0.35, -1.3);
    const wFR = new THREE.Mesh(wheelGeo, tireMat);
    wFR.position.set(0.85, 0.35, -1.3);
    const wRL = new THREE.Mesh(wheelGeo, tireMat);
    wRL.position.set(-0.85, 0.35, 1.3);
    const wRR = new THREE.Mesh(wheelGeo, tireMat);
    wRR.position.set(0.85, 0.35, 1.3);
    group.add(wFL, wFR, wRL, wRR);

    return group;
  }

  public update(dt: number, playerPos: THREE.Vector3) {
    const splines = this.roadSystem.roadSplines;
    if (splines.length === 0) return;

    for (const car of this.cars) {
      if (!car.active) {
        // Spawn car near player along random road
        const randSplineIdx = Math.floor(Math.random() * splines.length);
        const spline = splines[randSplineIdx];
        const randProgress = Math.random();
        const spawnPt = spline.curve.getPointAt(randProgress);

        const distToPlayer = spawnPt.distanceTo(playerPos);
        if (distToPlayer > 80 && distToPlayer < 240) {
          car.active = true;
          car.splineIdx = randSplineIdx;
          car.progress = randProgress;
          car.mesh.position.copy(spawnPt);
          car.mesh.visible = true;
        }
        continue;
      }

      // Active car movement along road
      const spline = splines[car.splineIdx];
      const curveLength = spline.curve.getLength();
      const progressDelta = (car.speed * dt) / Math.max(10, curveLength);

      car.progress += progressDelta;
      if (car.progress >= 1.0) {
        if (spline.isLoop) {
          car.progress %= 1.0;
        } else {
          // Despawn
          car.active = false;
          car.mesh.visible = false;
          continue;
        }
      }

      // Check distance to player for recycling
      const curPos = spline.curve.getPointAt(car.progress);
      const dist = curPos.distanceTo(playerPos);
      if (dist > 320) {
        car.active = false;
        car.mesh.visible = false;
        continue;
      }

      // Position & Orient car
      const tangent = spline.curve.getTangentAt(car.progress).normalize();
      const offsetRight = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      // Right-side lane driving offset (e.g. 2.2m right from center)
      const laneOffset = 2.2;
      const targetPos = curPos.clone().addScaledVector(offsetRight, laneOffset);

      car.mesh.position.copy(targetPos);
      car.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), tangent);
    }
  }

  // Check collision with player
  public checkPlayerCollision(playerPos: THREE.Vector3, playerRadius: number = 2.0): TrafficCar | null {
    for (const car of this.cars) {
      if (!car.active) continue;
      const dist = car.mesh.position.distanceTo(playerPos);
      if (dist < playerRadius + 1.8) {
        return car;
      }
    }
    return null;
  }
}
