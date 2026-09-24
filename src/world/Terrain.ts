import * as THREE from 'three';

export interface GroundSample {
  height: number;
  surface: 'asphalt' | 'dirt' | 'grass' | 'water';
  normal: THREE.Vector3;
}

export class Terrain {
  public mesh: THREE.Mesh;
  public oceanMesh: THREE.Mesh;
  private size: number = 2400; // 2400 x 2400 world
  private segments: number = 120; // grid detail

  constructor() {
    // 1. Create Terrain Geometry
    const geo = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position;
    const colors: number[] = [];

    // Color definitions for biomes
    const colorMountain = new THREE.Color(0x475569); // slate rock
    const colorMountainGrass = new THREE.Color(0x166534); // alpine pine green
    const colorCityGround = new THREE.Color(0x475569); // urban concrete & paved plazas
    const colorDesert = new THREE.Color(0xd97706); // warm golden sand
    const colorCoastBeach = new THREE.Color(0xfde047); // beach sand
    const colorGrass = new THREE.Color(0x15803d); // rich lawn green

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const h = this.calculateTerrainHeight(x, z);
      posAttr.setY(i, h);

      // Vertex coloring based on region & altitude
      const vertexColor = new THREE.Color();
      if (x < 0 && z < 0) {
        // Mountain region
        if (h > 45) {
          vertexColor.copy(colorMountain);
        } else {
          vertexColor.copy(colorMountainGrass);
        }
      } else if (x >= 0 && z < 0) {
        // Metro city region
        vertexColor.copy(colorCityGround);
      } else if (x < 0 && z >= 0) {
        // Desert region
        vertexColor.copy(colorDesert);
      } else {
        // Coast region
        if (h < 2.5) {
          vertexColor.copy(colorCoastBeach);
        } else {
          vertexColor.copy(colorGrass);
        }
      }

      colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true,
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;

    // 2. Add Perimeter Cliff Skirt (eliminates paper-thin terrain edges)
    this.createTerrainSkirts();

    // 3. Ocean Mesh in the South-East Coast with fine wave resolution
    const oceanGeo = new THREE.PlaneGeometry(1600, 1600, 48, 48);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // vibrant coastal blue
      roughness: 0.12,
      metalness: 0.82,
      transparent: true,
      opacity: 0.88,
    });
    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.position.set(700, -0.4, 700);
  }

  // Create vertical skirt walls around terrain boundary to avoid seeing empty underside
  private createTerrainSkirts() {
    const skirtMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
    });

    const skirtDepth = 65;
    const half = this.size * 0.5;

    // 4 borders: North, South, East, West
    const borders = [
      { start: [-half, -half], end: [half, -half] },
      { start: [half, -half], end: [half, half] },
      { start: [half, half], end: [-half, half] },
      { start: [-half, half], end: [-half, -half] },
    ];

    for (const b of borders) {
      const segs = 30;
      const skirtGeo = new THREE.BufferGeometry();
      const pos: number[] = [];
      const indices: number[] = [];

      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const x = b.start[0] + (b.end[0] - b.start[0]) * t;
        const z = b.start[1] + (b.end[1] - b.start[1]) * t;
        const topY = this.calculateTerrainHeight(x, z);
        const botY = topY - skirtDepth;

        pos.push(x, topY, z);
        pos.push(x, botY, z);

        if (s < segs) {
          const i1 = s * 2;
          const i2 = i1 + 1;
          const i3 = (s + 1) * 2;
          const i4 = i3 + 1;
          indices.push(i1, i2, i3);
          indices.push(i2, i4, i3);
        }
      }

      skirtGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      skirtGeo.setIndex(indices);
      skirtGeo.computeVertexNormals();

      const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
      this.mesh.add(skirtMesh);
    }
  }

  // Animate ocean waves
  public update(time: number) {
    if (!this.oceanMesh) return;
    const pos = this.oceanMesh.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i);
      const v = pos.getY(i);
      const wave = Math.sin(u * 0.04 + time * 2.0) * Math.cos(v * 0.04 + time * 1.5) * 0.35;
      pos.setZ(i, wave);
    }
    pos.needsUpdate = true;
  }

  // Smooth terrain altitude function
  public calculateTerrainHeight(x: number, z: number): number {
    // 1. Mountain Region (x < 0, z < 0)
    if (x < -100 && z < -100) {
      const distFromCorner = Math.hypot(x + 700, z + 700);
      const mountainFactor = Math.max(0, 1.0 - distFromCorner / 750);
      const hills = Math.sin(x * 0.008) * Math.cos(z * 0.008) * 35;
      const peaks = Math.sin(x * 0.02) * Math.cos(z * 0.018) * 18;
      const baseHeight = mountainFactor * 120;
      return Math.max(0, baseHeight + (hills + peaks) * mountainFactor);
    }

    // 2. Desert Region (x < -100, z > 100)
    if (x < -100 && z > 100) {
      // Rolling sand dunes
      const dune1 = Math.sin(x * 0.015 + z * 0.008) * 6;
      const dune2 = Math.cos(x * 0.008 - z * 0.012) * 4;
      return Math.max(0, dune1 + dune2);
    }

    // 3. Coast Region (x > 100, z > 100)
    if (x > 100 && z > 100) {
      // Slopes down towards water at eastern border
      const distToOcean = Math.hypot(x - 650, z - 650);
      if (x > 500 && z > 500) {
        return -1.0; // Under ocean water
      }
      const coastalCliffs = Math.sin(x * 0.01) * 8 + Math.cos(z * 0.01) * 5;
      return Math.max(0, coastalCliffs * 0.6);
    }

    // 4. Metro City Region (x > 0, z < 0)
    // Flat urban plain with slight variation
    return 0;
  }

  // Fast ground sampling for physics & collisions
  public sample(x: number, z: number): GroundSample {
    const height = this.calculateTerrainHeight(x, z);

    // Determine surface type
    let surface: 'asphalt' | 'dirt' | 'grass' | 'water' = 'grass';
    if (x >= 0 && z <= 0) {
      surface = 'asphalt'; // City area
    } else if (x < 0 && z > 0) {
      surface = 'dirt'; // Desert area
    } else if (x > 480 && z > 480) {
      surface = 'water'; // Ocean
    } else if (x < 0 && z < 0) {
      surface = height > 35 ? 'dirt' : 'grass'; // Mountain
    }

    // Compute approximate slope normal
    const delta = 1.0;
    const hL = this.calculateTerrainHeight(x - delta, z);
    const hR = this.calculateTerrainHeight(x + delta, z);
    const hD = this.calculateTerrainHeight(x, z - delta);
    const hU = this.calculateTerrainHeight(x, z + delta);

    const normal = new THREE.Vector3(hL - hR, 2 * delta, hD - hU).normalize();

    return { height, surface, normal };
  }

  public updateOcean(time: number) {
    // Gentle water shimmer
    this.oceanMesh.position.y = -0.5 + Math.sin(time * 1.5) * 0.15;
  }
}
