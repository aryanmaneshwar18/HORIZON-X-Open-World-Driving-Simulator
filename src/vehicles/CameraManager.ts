import * as THREE from 'three';

export type CameraViewMode = 'chase' | 'close' | 'far' | 'hood' | 'cinematic';

export class CameraManager {
  public camera: THREE.PerspectiveCamera;
  public mode: CameraViewMode = 'chase';
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private targetLookAt: THREE.Vector3 = new THREE.Vector3();
  private shakeIntensity: number = 0;
  private orbitAngle: number = 0;

  constructor() {
    // 3400 far clipping plane ensures distant mountains and sky horizon are always visible
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.2, 3600);
    this.camera.position.set(0, 6, 12);
  }

  public setMode(mode: CameraViewMode) {
    this.mode = mode;
  }

  public cycleMode() {
    const modes: CameraViewMode[] = ['chase', 'close', 'far', 'hood'];
    const idx = modes.indexOf(this.mode);
    this.mode = modes[(idx + 1) % modes.length];
  }

  public triggerShake(intensity: number = 1.0) {
    // Soft, controlled camera shake
    this.shakeIntensity = Math.min(1.2, this.shakeIntensity + intensity * 0.4);
  }

  public update(
    dt: number,
    carPos: THREE.Vector3,
    carQuaternion: THREE.Quaternion,
    speedKmh: number,
    isDrifting: boolean,
    driftAngleDeg: number,
    isNitroActive: boolean
  ) {
    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 4.5);
    }

    // Dynamic FOV based on speed & nitro (subtle speed sensation without distortion)
    const baseFov = 62;
    const speedRatio = Math.min(1.0, speedKmh / 260);
    const targetFov = baseFov + speedRatio * 14 + (isNitroActive ? 8 : 0);
    this.camera.fov += (targetFov - this.camera.fov) * Math.min(1.0, dt * 5.0);
    this.camera.updateProjectionMatrix();

    let offset = new THREE.Vector3();
    let lookOffset = new THREE.Vector3(0, 1.2, -9.0);
    let lerpSpeed = 6.0;

    switch (this.mode) {
      case 'close':
        offset.set(0, 2.8, 7.5);
        lookOffset.set(0, 1.1, -7.0);
        lerpSpeed = 8.0;
        break;

      case 'far':
        offset.set(0, 5.2, 13.5);
        lookOffset.set(0, 1.4, -12.0);
        lerpSpeed = 4.5;
        break;

      case 'hood':
        offset.set(0, 1.15, -0.3);
        lookOffset.set(0, 0.9, -20.0);
        lerpSpeed = 16.0;
        break;

      case 'cinematic':
        this.orbitAngle += dt * 0.35;
        const orbitRadius = 11.0;
        const camX = carPos.x + Math.cos(this.orbitAngle) * orbitRadius;
        const camZ = carPos.z + Math.sin(this.orbitAngle) * orbitRadius;
        this.camera.position.set(camX, carPos.y + 3.2, camZ);
        this.camera.lookAt(carPos.x, carPos.y + 1.2, carPos.z);
        return;

      case 'chase':
      default:
        // Ideal third-person driving camera: elevated above car, viewing the road ahead
        offset.set(0, 3.8, 9.8);
        lookOffset.set(0, 1.2, -9.0);
        lerpSpeed = 6.5;
        break;
    }

    // Apply vehicle orientation to camera offset
    const worldOffset = offset.applyQuaternion(carQuaternion);
    const desiredPos = carPos.clone().add(worldOffset);

    // Drifting camera tilt
    if (isDrifting && this.mode !== 'hood') {
      const tilt = Math.min(0.14, (driftAngleDeg / 180) * 0.25);
      this.camera.rotation.z += (tilt - this.camera.rotation.z) * 5 * dt;
    }

    // Gentle camera shake
    if (this.shakeIntensity > 0.01) {
      desiredPos.x += (Math.random() - 0.5) * this.shakeIntensity * 0.18;
      desiredPos.y += (Math.random() - 0.5) * this.shakeIntensity * 0.18;
    }

    // Smooth position interpolation
    this.camera.position.lerp(desiredPos, Math.min(1.0, lerpSpeed * dt));

    // Look target
    const worldLookTarget = carPos.clone().add(lookOffset.applyQuaternion(carQuaternion));
    this.targetLookAt.lerp(worldLookTarget, Math.min(1.0, (lerpSpeed + 2.0) * dt));
    this.camera.lookAt(this.targetLookAt);
  }

  public handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
