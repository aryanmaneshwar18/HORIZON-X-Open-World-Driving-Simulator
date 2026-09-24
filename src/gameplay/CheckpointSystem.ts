import * as THREE from 'three';

export class CheckpointSystem {
  public root: THREE.Group;
  private currentRing: THREE.Mesh | null = null;
  private nextRing: THREE.Mesh | null = null;
  private checkpoints: [number, number, number][] = [];
  public currentIdx: number = 0;
  public totalCheckpoints: number = 0;
  public isCompleted: boolean = false;

  private ringMatActive: THREE.MeshBasicMaterial;
  private ringMatNext: THREE.MeshBasicMaterial;

  constructor() {
    this.root = new THREE.Group();
    this.ringMatActive = new THREE.MeshBasicMaterial({
      color: 0x06b6d4, // Cyan active
      side: THREE.DoubleSide,
    });
    this.ringMatNext = new THREE.MeshBasicMaterial({
      color: 0xf97316, // Orange next
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });
  }

  public setup(checkpoints: [number, number, number][]) {
    this.clear();
    this.checkpoints = checkpoints;
    this.currentIdx = 0;
    this.totalCheckpoints = checkpoints.length;
    this.isCompleted = false;

    if (this.totalCheckpoints === 0) return;

    // Create Active Checkpoint Gate
    const ringGeo = new THREE.TorusGeometry(6.5, 0.45, 8, 24);
    ringGeo.rotateX(Math.PI / 2);

    this.currentRing = new THREE.Mesh(ringGeo, this.ringMatActive);
    this.nextRing = new THREE.Mesh(ringGeo, this.ringMatNext);

    this.root.add(this.currentRing, this.nextRing);
    this.updateRingPositions();
  }

  public clear() {
    while (this.root.children.length > 0) {
      this.root.remove(this.root.children[0]);
    }
    this.currentRing = null;
    this.nextRing = null;
    this.checkpoints = [];
    this.currentIdx = 0;
    this.isCompleted = false;
  }

  private updateRingPositions() {
    if (this.currentIdx >= this.checkpoints.length) {
      this.isCompleted = true;
      if (this.currentRing) this.currentRing.visible = false;
      if (this.nextRing) this.nextRing.visible = false;
      return;
    }

    const curPt = this.checkpoints[this.currentIdx];
    if (this.currentRing) {
      this.currentRing.position.set(curPt[0], curPt[1] + 3.0, curPt[2]);
      this.currentRing.visible = true;

      // Orient ring toward next checkpoint or along road
      if (this.currentIdx + 1 < this.checkpoints.length) {
        const nextPt = this.checkpoints[this.currentIdx + 1];
        const dir = new THREE.Vector3(nextPt[0] - curPt[0], 0, nextPt[2] - curPt[2]).normalize();
        this.currentRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      }
    }

    if (this.currentIdx + 1 < this.checkpoints.length) {
      const nextPt = this.checkpoints[this.currentIdx + 1];
      if (this.nextRing) {
        this.nextRing.position.set(nextPt[0], nextPt[1] + 3.0, nextPt[2]);
        this.nextRing.visible = true;
      }
    } else if (this.nextRing) {
      this.nextRing.visible = false;
    }
  }

  // Check if player vehicle passed the current checkpoint
  public checkPass(playerPos: THREE.Vector3): { passed: boolean; finished: boolean; distToCurrent: number; dirToCurrent: THREE.Vector3 } {
    if (this.isCompleted || this.checkpoints.length === 0) {
      return { passed: false, finished: true, distToCurrent: 0, dirToCurrent: new THREE.Vector3() };
    }

    const cur = this.checkpoints[this.currentIdx];
    const curVec = new THREE.Vector3(cur[0], cur[1], cur[2]);
    const dist = playerPos.distanceTo(curVec);
    const dir = curVec.clone().sub(playerPos).normalize();

    // Checkpoint pass radius
    if (dist < 14.0) {
      this.currentIdx++;
      if (this.currentIdx >= this.checkpoints.length) {
        this.isCompleted = true;
        this.updateRingPositions();
        return { passed: true, finished: true, distToCurrent: 0, dirToCurrent: dir };
      }
      this.updateRingPositions();
      return { passed: true, finished: false, distToCurrent: dist, dirToCurrent: dir };
    }

    return { passed: false, finished: false, distToCurrent: dist, dirToCurrent: dir };
  }

  public update(time: number) {
    if (this.currentRing && this.currentRing.visible) {
      this.currentRing.scale.setScalar(1.0 + Math.sin(time * 6) * 0.06);
    }
  }

  public getCurrentCheckpointPos(): THREE.Vector3 | null {
    if (this.isCompleted || this.checkpoints.length === 0 || this.currentIdx >= this.checkpoints.length) {
      return null;
    }
    const c = this.checkpoints[this.currentIdx];
    return new THREE.Vector3(c[0], c[1], c[2]);
  }
}
