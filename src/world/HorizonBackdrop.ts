import * as THREE from 'three';

export class HorizonBackdrop {
  public root: THREE.Group;

  constructor() {
    this.root = new THREE.Group();

    this.createDistantMountainRanges();
    this.createDistantCitySkyline();
    this.createDistantDesertMesas();
    this.createExtendedOceanHorizon();
  }

  // 1. NATURAL CONTINUOUS ALPINE MOUNTAIN RANGES (North & North-West Horizons)
  // Replaces the repeating low-poly triangular cones with organic, overlapping ridgelines
  private createDistantMountainRanges() {
    const mountainGroup = new THREE.Group();

    // Far alpine granite & snowcap material
    const farRidgeMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Muted slate mountain rock with natural atmospheric perspective
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
    });

    const snowCapMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Crisp alpine snowpack
      roughness: 0.6,
      metalness: 0.05,
      flatShading: true,
    });

    const midRidgeMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Darker pine-covered foothill ridge
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true,
    });

    // Build Layer 1: Massive Far Alpine Massif (Spanning from West x = -1900 to North-East x = 200, z = -1500 to -2100)
    // We create a continuous terrain ribbon with multi-frequency procedural ridges
    const buildRidgeRibbon = (
      startAngle: number,
      endAngle: number,
      radius: number,
      baseH: number,
      ampH: number,
      mat: THREE.Material,
      snowThreshold: number = -1
    ) => {
      const segs = 70;
      const positions: number[] = [];
      const indices: number[] = [];
      const snowPositions: number[] = [];
      const snowIndices: number[] = [];
      let vertIdx = 0;
      let snowVertIdx = 0;

      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const angle = startAngle + (endAngle - startAngle) * t;
        const dist = radius + Math.sin(t * 12.0) * 120 + Math.cos(t * 7.5) * 80;

        const x = Math.cos(angle) * dist;
        const z = Math.sin(angle) * dist;

        // Multi-frequency natural organic ridge profile (avoids regular triangle cones)
        const harm1 = Math.sin(t * 9.4) * 0.45;
        const harm2 = Math.cos(t * 18.2) * 0.28;
        const harm3 = Math.sin(t * 31.0) * 0.15;
        const harm4 = Math.abs(Math.sin(t * 6.2)) * 0.35; // broad massif domes
        const ridgeFactor = Math.max(0.08, harm1 + harm2 + harm3 + harm4);

        const peakY = baseH + ridgeFactor * ampH;
        const baseY = -20; // well below terrain

        // Mountain ribbon wall from baseY to peakY
        positions.push(x, baseY, z);
        positions.push(x, peakY, z);

        if (i < segs) {
          const i1 = vertIdx;
          const i2 = vertIdx + 1;
          const i3 = vertIdx + 2;
          const i4 = vertIdx + 3;
          indices.push(i1, i2, i3);
          indices.push(i2, i4, i3);
        }
        vertIdx += 2;

        // Snowcaps on high peaks
        if (snowThreshold > 0 && peakY > snowThreshold) {
          const snowBaseY = peakY - (peakY - snowThreshold) * 0.65;
          snowPositions.push(x, snowBaseY, z);
          snowPositions.push(x, peakY + 0.5, z);

          if (snowVertIdx > 0 && i > 0) {
            const s1 = snowVertIdx - 2;
            const s2 = snowVertIdx - 1;
            const s3 = snowVertIdx;
            const s4 = snowVertIdx + 1;
            snowIndices.push(s1, s2, s3);
            snowIndices.push(s2, s4, s3);
          }
          snowVertIdx += 2;
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();

      const mesh = new THREE.Mesh(geo, mat);
      mountainGroup.add(mesh);

      if (snowPositions.length > 6) {
        const snowGeo = new THREE.BufferGeometry();
        snowGeo.setAttribute('position', new THREE.Float32BufferAttribute(snowPositions, 3));
        snowGeo.setIndex(snowIndices);
        snowGeo.computeVertexNormals();
        const snowMesh = new THREE.Mesh(snowGeo, snowCapMat);
        mountainGroup.add(snowMesh);
      }
    };

    // Layer 1: High Alpine Peaks (Far distance, radius ~2100m, heights up to 550m)
    buildRidgeRibbon(Math.PI * 0.70, Math.PI * 1.45, 2100, 180, 380, farRidgeMat, 360);

    // Layer 2: Mid Foothills (Closer distance, radius ~1600m, heights up to 260m)
    buildRidgeRibbon(Math.PI * 0.75, Math.PI * 1.40, 1600, 80, 190, midRidgeMat);

    // Layer 3: Secondary Northern Mountain Range (Connecting across towards city outskirts)
    buildRidgeRibbon(Math.PI * 1.35, Math.PI * 1.85, 1950, 120, 240, farRidgeMat, 250);

    this.root.add(mountainGroup);
  }

  // 2. MODERN METROPOLITAN SKYLINE (North-East Horizon, x: 800 to 1400, z: -1400 to -800)
  // Clean architectural silhouettes with stepped setbacks and varied proportions
  private createDistantCitySkyline() {
    const skylineGroup = new THREE.Group();

    // Distinct materials for architectural realism
    const glassTowerMat = new THREE.MeshStandardMaterial({
      color: 0x64748b, // Slate blue glass
      metalness: 0.65,
      roughness: 0.3,
    });

    const concreteTowerMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Light architectural concrete
      metalness: 0.2,
      roughness: 0.75,
    });

    const darkTowerMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Midnight granite skyscraper
      metalness: 0.5,
      roughness: 0.4,
    });

    const redBeaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444, fog: false });
    const cyanCrownMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const amberCrownMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    // Cluster of 42 diverse skyscrapers with stepped setbacks
    const random = (seed: number) => {
      const x = Math.sin(seed * 999.123) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < 42; i++) {
      const r1 = random(i * 1.3 + 0.1);
      const r2 = random(i * 2.7 + 0.4);
      const r3 = random(i * 3.9 + 0.9);

      const x = 750 + r1 * 600;
      const z = -750 - r2 * 600;
      const height = 90 + r3 * 220;
      const width = 30 + r1 * 35;
      const depth = 30 + r2 * 35;

      const mat = i % 3 === 0 ? glassTowerMat : i % 3 === 1 ? concreteTowerMat : darkTowerMat;

      // Base & Lower Tower Body
      const bGeo = new THREE.BoxGeometry(width, height, depth);
      const tower = new THREE.Mesh(bGeo, mat);
      tower.position.set(x, height * 0.5, z);
      skylineGroup.add(tower);

      // Upper Setback Tier on tall skyscrapers
      if (height > 140) {
        const topH = height * 0.28;
        const topW = width * 0.68;
        const topD = depth * 0.68;
        const topGeo = new THREE.BoxGeometry(topW, topH, topD);
        const topMesh = new THREE.Mesh(topGeo, glassTowerMat);
        topMesh.position.set(x, height + topH * 0.5, z);
        skylineGroup.add(topMesh);

        // Antenna Spire & Red Aviation Warning Beacon
        const spireH = 25 + r1 * 20;
        const spire = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 1.0, spireH, 6),
          darkTowerMat
        );
        spire.position.set(x, height + topH + spireH * 0.5, z);
        skylineGroup.add(spire);

        const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.5, 6, 6), redBeaconMat);
        beacon.position.set(x, height + topH + spireH + 1, z);
        skylineGroup.add(beacon);
      } else if (i % 2 === 0) {
        // Glowing architectural skyline crown band
        const crownGeo = new THREE.BoxGeometry(width * 1.02, 2.5, depth * 1.02);
        const crown = new THREE.Mesh(crownGeo, i % 4 === 0 ? cyanCrownMat : amberCrownMat);
        crown.position.set(x, height - 1.25, z);
        skylineGroup.add(crown);
      }
    }

    this.root.add(skylineGroup);
  }

  // 3. STEPPED DESERT CANYON MESAS & BUTTES (South-West Horizon, x: -1600 to -850, z: 850 to 1600)
  private createDistantDesertMesas() {
    const mesaGroup = new THREE.Group();

    const mesaMat = new THREE.MeshStandardMaterial({
      color: 0xc2410c, // Rich terracotta red sandstone
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true,
    });

    const mesaCapMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Golden sun-baked caprock
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });

    // 14 distinctive stepped mesas with sheer cliff walls and flat plateau summits
    for (let i = 0; i < 14; i++) {
      const angle = Math.PI * 0.22 + (i / 14) * Math.PI * 0.52;
      const dist = 1450 + (i % 3) * 160;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const baseR = 120 + (i % 4) * 45;
      const topR = baseR * 0.72;
      const height = 90 + (i % 5) * 35;

      // Truncated cylinder mesa body
      const bodyGeo = new THREE.CylinderGeometry(topR, baseR, height, 9);
      const mesa = new THREE.Mesh(bodyGeo, mesaMat);
      mesa.position.set(x, height * 0.5, z);
      mesaGroup.add(mesa);

      // Distinctive hard caprock plateau lid
      const capGeo = new THREE.CylinderGeometry(topR * 1.04, topR * 1.04, 6, 9);
      const cap = new THREE.Mesh(capGeo, mesaCapMat);
      cap.position.set(x, height + 3, z);
      mesaGroup.add(cap);
    }

    this.root.add(mesaGroup);
  }

  // 4. INFINITE OCEAN WATER HORIZON (South-East Horizon, x: 800 to 3500, z: 800 to 3500)
  private createExtendedOceanHorizon() {
    const oceanGroup = new THREE.Group();

    const deepOceanMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Deep sapphire Pacific blue
      roughness: 0.2,
      metalness: 0.8,
    });

    // Vast ocean plane seamlessly meeting the horizon haze
    const planeGeo = new THREE.PlaneGeometry(3500, 3500, 16, 16);
    planeGeo.rotateX(-Math.PI / 2);

    const oceanPlane = new THREE.Mesh(planeGeo, deepOceanMat);
    oceanPlane.position.set(1800, -0.6, 1800);
    oceanGroup.add(oceanPlane);

    this.root.add(oceanGroup);
  }
}
