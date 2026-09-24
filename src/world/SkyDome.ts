import * as THREE from 'three';

export class SkyDome {
  public root: THREE.Group;
  private sunMesh: THREE.Mesh;
  private sunGlow: THREE.Sprite;
  private moonMesh: THREE.Mesh;
  private moonGlow: THREE.Sprite;
  private starField: THREE.Points;
  private cloudsGroup: THREE.Group;
  private cloudMeshes: { mesh: THREE.Group; speed: number; startX: number; rangeX: number }[] = [];

  constructor() {
    this.root = new THREE.Group();

    // 1. CELESTIAL BODIES: 3D SUN WITH RADIANT CORONA
    const sunGeo = new THREE.SphereGeometry(65, 16, 16);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xfff7ed,
      fog: false,
    });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.root.add(this.sunMesh);

    // Sun radiant corona flare
    const coronaTexture = this.createGlowTexture('#ffedd5', '#f97316');
    const sunCoronaMat = new THREE.SpriteMaterial({
      map: coronaTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.9,
    });
    this.sunGlow = new THREE.Sprite(sunCoronaMat);
    this.sunGlow.scale.set(650, 650, 1);
    this.sunMesh.add(this.sunGlow);

    // 2. CELESTIAL BODIES: 3D MOON WITH HALO
    const moonGeo = new THREE.SphereGeometry(50, 16, 16);
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.8,
      metalness: 0.1,
      emissive: new THREE.Color(0x94a3b8),
      emissiveIntensity: 0.4,
    });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.root.add(this.moonMesh);

    // Moon soft halo
    const moonTexture = this.createGlowTexture('#e0f2fe', '#0284c7');
    const moonCoronaMat = new THREE.SpriteMaterial({
      map: moonTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.65,
    });
    this.moonGlow = new THREE.Sprite(moonCoronaMat);
    this.moonGlow.scale.set(400, 400, 1);
    this.moonMesh.add(this.moonGlow);

    // 3. TWINKLING NIGHT STARFIELD
    this.starField = this.createStarField(1400);
    this.root.add(this.starField);

    // 4. DRIFTING LOW-POLY CUMULUS CLOUDS
    this.cloudsGroup = new THREE.Group();
    this.createCloudDeck();
    this.root.add(this.cloudsGroup);
  }

  private createGlowTexture(centerColor: string, edgeColor: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, centerColor);
    gradient.addColorStop(0.3, edgeColor);
    gradient.addColorStop(0.7, 'rgba(0,0,0,0.15)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  private createStarField(count: number): THREE.Points {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Upper hemisphere distribution
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0) * 0.45; // strictly upper sky
      const r = 2400 + Math.random() * 200;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = Math.abs(r * Math.cos(phi)) + 100;
      const z = r * Math.sin(phi) * Math.sin(theta);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Color variation between pure white, cyan, and amber stars
      const cType = Math.random();
      if (cType > 0.8) {
        colors[i * 3] = 0.7; colors[i * 3 + 1] = 0.85; colors[i * 3 + 2] = 1.0; // blue
      } else if (cType > 0.6) {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.85; colors[i * 3 + 2] = 0.6; // warm
      } else {
        colors[i * 3] = 1.0; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 1.0;   // diamond
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 4.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.0,
      sizeAttenuation: true,
      fog: false,
    });

    return new THREE.Points(geo, mat);
  }

  private createCloudDeck() {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.05,
      transparent: true,
      opacity: 0.85,
    });

    // Generate 18 distinct cumulus cloud clusters at altitudes 350 - 550
    for (let i = 0; i < 18; i++) {
      const cluster = new THREE.Group();
      const puffs = 4 + Math.floor(Math.random() * 4);

      for (let p = 0; p < puffs; p++) {
        const radius = 35 + Math.random() * 40;
        const puffGeo = new THREE.DodecahedronGeometry(radius, 1);
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.position.set(
          (p - puffs * 0.5) * 35 + (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 25
        );
        puff.scale.set(1.4, 0.7, 1.1); // flatter bottom, cumulus profile
        cluster.add(puff);
      }

      const x = (Math.random() - 0.5) * 2600;
      const z = (Math.random() - 0.5) * 2600;
      const y = 380 + Math.random() * 160;
      cluster.position.set(x, y, z);
      this.cloudsGroup.add(cluster);

      this.cloudMeshes.push({
        mesh: cluster,
        speed: 2.5 + Math.random() * 3.5,
        startX: x,
        rangeX: 3000,
      });
    }
  }

  public update(dt: number, cycleProgress: number, playerPos: THREE.Vector3) {
    // Keep celestial objects centered on player position
    this.root.position.copy(playerPos);

    // Orbital position of Sun and Moon
    const sunAngle = cycleProgress * Math.PI * 2;
    const orbitRadius = 2200;

    const sunX = Math.cos(sunAngle) * orbitRadius;
    const sunY = Math.sin(sunAngle) * orbitRadius;
    const sunZ = Math.sin(sunAngle * 0.7) * 750;

    this.sunMesh.position.set(sunX, sunY, sunZ);
    this.moonMesh.position.set(-sunX, -sunY, -sunZ);

    // Stars visibility during night
    const p = cycleProgress;
    if (p >= 0.70 || p < 0.12) {
      this.setStarOpacity(p >= 0.75 ? 0.95 : 0.6);
    } else {
      this.setStarOpacity(0.0);
    }

    // Slowly drift clouds
    for (const c of this.cloudMeshes) {
      c.mesh.position.x += c.speed * dt;
      if (c.mesh.position.x > c.rangeX * 0.5) {
        c.mesh.position.x = -c.rangeX * 0.5;
      }
    }
  }

  private setStarOpacity(opacity: number) {
    if (this.starField.material instanceof THREE.PointsMaterial) {
      this.starField.material.opacity = Math.max(0, Math.min(1, opacity));
    }
  }
}
