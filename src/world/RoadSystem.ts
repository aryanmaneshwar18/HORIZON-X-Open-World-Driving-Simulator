import * as THREE from 'three';
import { Terrain } from './Terrain';

export interface RoadPoint {
  position: THREE.Vector3;
  width: number;
  isBridge?: boolean;
}

export interface RoadSpline {
  id: string;
  name: string;
  region: 'city' | 'mountains' | 'desert' | 'coast';
  points: THREE.Vector3[];
  curve: THREE.CatmullRomCurve3;
  width: number;
  isLoop: boolean;
}

export class RoadSystem {
  public root: THREE.Group;
  public roadSplines: RoadSpline[] = [];
  private roadMeshes: THREE.Mesh[] = [];
  private terrain: Terrain;

  // Road materials
  private asphaltMat: THREE.MeshStandardMaterial;
  private markingYellowMat: THREE.MeshBasicMaterial;
  private markingWhiteMat: THREE.MeshBasicMaterial;
  private curbMat: THREE.MeshStandardMaterial;
  private sidewalkMat: THREE.MeshStandardMaterial;
  private guardrailMat: THREE.MeshStandardMaterial;
  private bridgePillarMat: THREE.MeshStandardMaterial;

  constructor(terrain: Terrain) {
    this.terrain = terrain;
    this.root = new THREE.Group();

    // Procedural textured asphalt material
    const asphaltTex = this.createAsphaltTexture();
    this.asphaltMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.82,
      metalness: 0.12,
    });

    this.markingYellowMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15, // Golden Highway Yellow
    });

    this.markingWhiteMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc, // Bright traffic white
    });

    this.curbMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Light concrete curb
      roughness: 0.85,
    });

    this.sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x64748b, // Paved sidewalk slate
      roughness: 0.9,
    });

    this.guardrailMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.3,
    });

    this.bridgePillarMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.9,
    });

    this.createRoadNetwork();
  }

  private createAsphaltTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Base dark asphalt tone
    ctx.fillStyle = '#232832';
    ctx.fillRect(0, 0, 512, 512);

    // Subtle aggregate noise and surface speckling
    const imgData = ctx.getImageData(0, 0, 512, 512);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 26;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Subtle worn tire tracks
    ctx.fillStyle = 'rgba(15, 18, 24, 0.25)';
    ctx.fillRect(80, 0, 100, 512);
    ctx.fillRect(332, 0, 100, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 12);
    return texture;
  }

  private createRoadNetwork() {
    // 1. Grand Outer Perimeter Highway Loop (Connects City -> Mountains -> Desert -> Coast -> City)
    const grandLoopPoints = [
      new THREE.Vector3(450, 1.2, -450),   // City Downtown
      new THREE.Vector3(700, 1.2, -450),   // City Harbor
      new THREE.Vector3(750, 1.2, -200),   // City South
      new THREE.Vector3(750, 4.0, 200),    // Coast North Bridge
      new THREE.Vector3(700, 8.0, 600),    // Coast Cliffs
      new THREE.Vector3(450, 3.0, 750),    // Coast South
      new THREE.Vector3(150, 1.5, 750),    // Coast-Desert Transition
      new THREE.Vector3(-400, 1.5, 750),   // Desert South
      new THREE.Vector3(-750, 1.5, 600),   // Desert Airfield Strip
      new THREE.Vector3(-750, 3.0, 200),   // Desert North
      new THREE.Vector3(-750, 25.0, -200), // Mountain Ascent
      new THREE.Vector3(-650, 60.0, -600), // Mountain Summit Pass
      new THREE.Vector3(-350, 20.0, -750), // Mountain East Descent
      new THREE.Vector3(100, 1.5, -750),   // Mountain-City Highway
      new THREE.Vector3(450, 1.2, -700),   // City North
    ];
    this.addSpline('grand_highway', 'Grand Horizon Highway', 'city', grandLoopPoints, 11.5, true);

    // 2. City Downtown Internal Grid / Boulevards
    const cityAvenue1 = [
      new THREE.Vector3(300, 1.0, -300),
      new THREE.Vector3(500, 1.0, -300),
      new THREE.Vector3(700, 1.0, -300),
    ];
    this.addSpline('city_ave_1', 'Neon Boulevard', 'city', cityAvenue1, 8.5, false);

    const cityAvenue2 = [
      new THREE.Vector3(300, 1.0, -550),
      new THREE.Vector3(500, 1.0, -550),
      new THREE.Vector3(700, 1.0, -550),
    ];
    this.addSpline('city_ave_2', 'Metro Central Street', 'city', cityAvenue2, 8.5, false);

    const cityCross1 = [
      new THREE.Vector3(400, 1.0, -200),
      new THREE.Vector3(400, 1.0, -450),
      new THREE.Vector3(400, 1.0, -700),
    ];
    this.addSpline('city_cross_1', 'Apex Expressway', 'city', cityCross1, 8.5, false);

    const cityCross2 = [
      new THREE.Vector3(600, 1.0, -200),
      new THREE.Vector3(600, 1.0, -450),
      new THREE.Vector3(600, 1.0, -700),
    ];
    this.addSpline('city_cross_2', 'Harbor Way', 'city', cityCross2, 8.5, false);

    // 3. Mountain Touge Hairpins (Winding Pass)
    const mountainTouge = [
      new THREE.Vector3(-350, 8.0, -350),
      new THREE.Vector3(-450, 22.0, -420),
      new THREE.Vector3(-400, 35.0, -500),
      new THREE.Vector3(-550, 52.0, -520),
      new THREE.Vector3(-480, 70.0, -620),
      new THREE.Vector3(-620, 92.0, -650),
      new THREE.Vector3(-520, 115.0, -720),
    ];
    this.addSpline('mountain_touge', 'Akina Touge Pass', 'mountains', mountainTouge, 7.2, false);

    // 4. Desert Dragway & Canyon Run
    const desertDrag = [
      new THREE.Vector3(-250, 1.2, 300),
      new THREE.Vector3(-450, 1.2, 450),
      new THREE.Vector3(-650, 1.2, 600),
    ];
    this.addSpline('desert_canyon', 'Red Rock Canyon', 'desert', desertDrag, 8.5, false);

    // 5. Coastal Scenic Cliff Run
    const coastalCliffs = [
      new THREE.Vector3(700, 8.0, 600),
      new THREE.Vector3(650, 15.0, 450),
      new THREE.Vector3(620, 12.0, 300),
      new THREE.Vector3(750, 4.0, 200),
    ];
    this.addSpline('coast_cliffs', 'Pacific Ridge Way', 'coast', coastalCliffs, 8.0, false);

    // Build crosswalks at city intersections
    this.buildCityCrosswalks();
  }

  private addSpline(
    id: string,
    name: string,
    region: 'city' | 'mountains' | 'desert' | 'coast',
    points: THREE.Vector3[],
    width: number,
    isLoop: boolean
  ) {
    const curve = new THREE.CatmullRomCurve3(points, isLoop, 'catmullrom', 0.2);
    const spline: RoadSpline = { id, name, region, points, curve, width, isLoop };
    this.roadSplines.push(spline);

    this.buildRoadMesh(spline);
  }

  private buildRoadMesh(spline: RoadSpline) {
    const segments = spline.isLoop ? 240 : 120;
    const curvePoints = spline.curve.getSpacedPoints(segments);

    const roadGeo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const halfW = spline.width * 0.5;

    for (let i = 0; i <= segments; i++) {
      const pt = curvePoints[i % curvePoints.length];
      const nextPt = curvePoints[(i + 1) % curvePoints.length];
      const tangent = new THREE.Vector3().subVectors(nextPt, pt).normalize();
      const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      const terrainHeight = this.terrain.calculateTerrainHeight(pt.x, pt.z);
      const y = Math.max(pt.y, terrainHeight + 0.16);

      // Left vertex
      const lX = pt.x - right.x * halfW;
      const lZ = pt.z - right.z * halfW;
      positions.push(lX, y, lZ);
      normals.push(0, 1, 0);
      uvs.push(0, i * 0.35);

      // Right vertex
      const rX = pt.x + right.x * halfW;
      const rZ = pt.z + right.z * halfW;
      positions.push(rX, y, rZ);
      normals.push(0, 1, 0);
      uvs.push(1, i * 0.35);

      // Bridge pillars if road is substantially higher than terrain
      if (y - terrainHeight > 3.5 && i % 4 === 0) {
        this.createBridgePillar(pt.x, terrainHeight, y, pt.z);
      }
    }

    for (let i = 0; i < segments; i++) {
      const row1 = i * 2;
      const row2 = (i + 1) * 2;
      indices.push(row1, row1 + 1, row2);
      indices.push(row1 + 1, row2 + 1, row2);
    }

    roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    roadGeo.setIndex(indices);

    const roadMesh = new THREE.Mesh(roadGeo, this.asphaltMat);
    roadMesh.receiveShadow = true;
    this.root.add(roadMesh);
    this.roadMeshes.push(roadMesh);

    // Build center dashed lines
    this.buildRoadMarkings(spline, curvePoints);

    // Build solid white edge lines
    this.buildEdgeLines(spline, curvePoints);

    // Build urban concrete sidewalks & curbs
    if (spline.region === 'city') {
      this.buildSidewalks(spline, curvePoints);
    }

    // Build steel guardrails on elevated bridges and mountain hairpins
    this.buildGuardrails(spline, curvePoints);
  }

  // Raised concrete curbs & pedestrian sidewalks along city boulevards
  private buildSidewalks(spline: RoadSpline, curvePoints: THREE.Vector3[]) {
    const curbGeo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const indices: number[] = [];

    const segments = curvePoints.length - 1;
    const halfW = spline.width * 0.5;
    const sidewalkW = 2.4; // 2.4m wide pedestrian walkway
    const curbH = 0.22;    // 22cm raised curb
    let vertIdx = 0;

    for (let i = 0; i < segments; i++) {
      const p1 = curvePoints[i];
      const p2 = curvePoints[i + 1] || p1;
      const tangent = new THREE.Vector3().subVectors(p2, p1).normalize();
      const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      const y1 = Math.max(p1.y, this.terrain.calculateTerrainHeight(p1.x, p1.z) + 0.16) + curbH;
      const y2 = Math.max(p2.y, this.terrain.calculateTerrainHeight(p2.x, p2.z) + 0.16) + curbH;

      // Left Sidewalk
      const l1_in_x = p1.x - right.x * halfW;
      const l1_in_z = p1.z - right.z * halfW;
      const l1_out_x = p1.x - right.x * (halfW + sidewalkW);
      const l1_out_z = p1.z - right.z * (halfW + sidewalkW);

      const l2_in_x = p2.x - right.x * halfW;
      const l2_in_z = p2.z - right.z * halfW;
      const l2_out_x = p2.x - right.x * (halfW + sidewalkW);
      const l2_out_z = p2.z - right.z * (halfW + sidewalkW);

      positions.push(
        l1_in_x, y1, l1_in_z,
        l1_out_x, y1, l1_out_z,
        l2_in_x, y2, l2_in_z,
        l2_out_x, y2, l2_out_z
      );
      indices.push(vertIdx, vertIdx + 1, vertIdx + 2, vertIdx + 1, vertIdx + 3, vertIdx + 2);
      vertIdx += 4;

      // Right Sidewalk
      const r1_in_x = p1.x + right.x * halfW;
      const r1_in_z = p1.z + right.z * halfW;
      const r1_out_x = p1.x + right.x * (halfW + sidewalkW);
      const r1_out_z = p1.z + right.z * (halfW + sidewalkW);

      const r2_in_x = p2.x + right.x * halfW;
      const r2_in_z = p2.z + right.z * halfW;
      const r2_out_x = p2.x + right.x * (halfW + sidewalkW);
      const r2_out_z = p2.z + right.z * (halfW + sidewalkW);

      positions.push(
        r1_in_x, y1, r1_in_z,
        r1_out_x, y1, r1_out_z,
        r2_in_x, y2, r2_in_z,
        r2_out_x, y2, r2_out_z
      );
      indices.push(vertIdx, vertIdx + 1, vertIdx + 2, vertIdx + 1, vertIdx + 3, vertIdx + 2);
      vertIdx += 4;
    }

    curbGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    curbGeo.computeVertexNormals();
    curbGeo.setIndex(indices);

    const sidewalkMesh = new THREE.Mesh(curbGeo, this.sidewalkMat);
    sidewalkMesh.receiveShadow = true;
    this.root.add(sidewalkMesh);
  }

  // Solid white continuous edge lines
  private buildEdgeLines(spline: RoadSpline, curvePoints: THREE.Vector3[]) {
    const edgeGeo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const indices: number[] = [];

    const segments = curvePoints.length - 1;
    const halfW = spline.width * 0.47;
    const lineW = 0.2;
    let vertIdx = 0;

    for (let i = 0; i < segments; i++) {
      const p1 = curvePoints[i];
      const p2 = curvePoints[i + 1] || p1;
      const tangent = new THREE.Vector3().subVectors(p2, p1).normalize();
      const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      const y1 = Math.max(p1.y, this.terrain.calculateTerrainHeight(p1.x, p1.z) + 0.18);
      const y2 = Math.max(p2.y, this.terrain.calculateTerrainHeight(p2.x, p2.z) + 0.18);

      // Left edge line
      const l1X = p1.x - right.x * halfW;
      const l1Z = p1.z - right.z * halfW;
      const l2X = p2.x - right.x * halfW;
      const l2Z = p2.z - right.z * halfW;

      positions.push(
        l1X, y1, l1Z,
        l1X + right.x * lineW, y1, l1Z + right.z * lineW,
        l2X, y2, l2Z,
        l2X + right.x * lineW, y2, l2Z + right.z * lineW
      );
      indices.push(vertIdx, vertIdx + 1, vertIdx + 2, vertIdx + 1, vertIdx + 3, vertIdx + 2);
      vertIdx += 4;

      // Right edge line
      const r1X = p1.x + right.x * halfW;
      const r1Z = p1.z + right.z * halfW;
      const r2X = p2.x + right.x * halfW;
      const r2Z = p2.z + right.z * halfW;

      positions.push(
        r1X - right.x * lineW, y1, r1Z - right.z * lineW,
        r1X, y1, r1Z,
        r2X - right.x * lineW, y2, r2Z - right.z * lineW,
        r2X, y2, r2Z
      );
      indices.push(vertIdx, vertIdx + 1, vertIdx + 2, vertIdx + 1, vertIdx + 3, vertIdx + 2);
      vertIdx += 4;
    }

    edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    edgeGeo.setIndex(indices);
    const edgeMesh = new THREE.Mesh(edgeGeo, this.markingWhiteMat);
    this.root.add(edgeMesh);
  }

  // Steel Armco Guardrails along bridges, cliffs, and mountain roads
  private buildGuardrails(spline: RoadSpline, curvePoints: THREE.Vector3[]) {
    const isMountain = spline.region === 'mountains';
    const isBridge = spline.points.some(p => p.y - this.terrain.calculateTerrainHeight(p.x, p.z) > 3.0);
    if (!isMountain && !isBridge && spline.id !== 'grand_highway') return;

    const segments = curvePoints.length - 1;
    const halfW = spline.width * 0.52;

    for (let i = 0; i < segments; i += 3) {
      const pt = curvePoints[i];
      const terrainHeight = this.terrain.calculateTerrainHeight(pt.x, pt.z);
      const roadY = Math.max(pt.y, terrainHeight + 0.16);
      const isElevated = (roadY - terrainHeight) > 2.5;

      if (isMountain || isElevated || (spline.id === 'grand_highway' && (pt.z > 500 || pt.x < -600))) {
        const tangent = spline.curve.getTangentAt(i / segments).normalize();
        const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

        // Left post & rail
        const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 6), this.guardrailMat);
        postL.position.set(pt.x - right.x * halfW, roadY + 0.55, pt.z - right.z * halfW);
        this.root.add(postL);

        // Right post & rail
        const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 6), this.guardrailMat);
        postR.position.set(pt.x + right.x * halfW, roadY + 0.55, pt.z + right.z * halfW);
        this.root.add(postR);

        // Longitudinal beams
        const railL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 7.5), this.guardrailMat);
        railL.position.set(pt.x - right.x * halfW, roadY + 0.8, pt.z - right.z * halfW);
        railL.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        this.root.add(railL);

        const railR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 7.5), this.guardrailMat);
        railR.position.set(pt.x + right.x * halfW, roadY + 0.8, pt.z + right.z * halfW);
        railR.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        this.root.add(railR);
      }
    }
  }

  // Yellow dashed / double yellow center markings
  private buildRoadMarkings(spline: RoadSpline, curvePoints: THREE.Vector3[]) {
    const markGeo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const indices: number[] = [];
    const segments = curvePoints.length - 1;
    let markCount = 0;

    for (let i = 0; i < segments; i += 2) {
      const p1 = curvePoints[i];
      const p2 = curvePoints[i + 1] || p1;
      const tangent = new THREE.Vector3().subVectors(p2, p1).normalize();
      const right = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();
      const mW = 0.22;

      const y1 = Math.max(p1.y, this.terrain.calculateTerrainHeight(p1.x, p1.z) + 0.18);
      const y2 = Math.max(p2.y, this.terrain.calculateTerrainHeight(p2.x, p2.z) + 0.18);

      const baseIdx = markCount * 4;
      positions.push(
        p1.x - right.x * mW, y1, p1.z - right.z * mW,
        p1.x + right.x * mW, y1, p1.z + right.z * mW,
        p2.x - right.x * mW, y2, p2.z - right.z * mW,
        p2.x + right.x * mW, y2, p2.z + right.z * mW
      );

      indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
      indices.push(baseIdx + 1, baseIdx + 3, baseIdx + 2);
      markCount++;
    }

    markGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    markGeo.setIndex(indices);
    const markMesh = new THREE.Mesh(markGeo, this.markingYellowMat);
    this.root.add(markMesh);
  }

  // White zebra crosswalk markings at major city intersections
  private buildCityCrosswalks() {
    const intersections = [
      { x: 400, z: -300 },
      { x: 600, z: -300 },
      { x: 400, z: -550 },
      { x: 600, z: -550 },
    ];

    const crosswalkGeo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const indices: number[] = [];
    let vertIdx = 0;

    intersections.forEach(inter => {
      // 4 crosswalk zebra strips (North, South, East, West of intersection)
      const arms = [
        { dx: 0, dz: -9, w: 8.0, h: 2.2, dir: 'horiz' },
        { dx: 0, dz: 9, w: 8.0, h: 2.2, dir: 'horiz' },
        { dx: -9, dz: 0, w: 2.2, h: 8.0, dir: 'vert' },
        { dx: 9, dz: 0, w: 2.2, h: 8.0, dir: 'vert' },
      ];

      arms.forEach(arm => {
        const cx = inter.x + arm.dx;
        const cz = inter.z + arm.dz;
        const y = 1.0 + 0.18;

        if (arm.dir === 'horiz') {
          for (let s = -3.2; s <= 3.2; s += 1.4) {
            positions.push(
              cx + s - 0.35, y, cz - arm.h * 0.5,
              cx + s + 0.35, y, cz - arm.h * 0.5,
              cx + s - 0.35, y, cz + arm.h * 0.5,
              cx + s + 0.35, y, cz + arm.h * 0.5
            );
            indices.push(vertIdx, vertIdx + 1, vertIdx + 2, vertIdx + 1, vertIdx + 3, vertIdx + 2);
            vertIdx += 4;
          }
        } else {
          for (let s = -3.2; s <= 3.2; s += 1.4) {
            positions.push(
              cx - arm.w * 0.5, y, cz + s - 0.35,
              cx + arm.w * 0.5, y, cz + s - 0.35,
              cx - arm.w * 0.5, y, cz + s + 0.35,
              cx + arm.w * 0.5, y, cz + s + 0.35
            );
            indices.push(vertIdx, vertIdx + 1, vertIdx + 2, vertIdx + 1, vertIdx + 3, vertIdx + 2);
            vertIdx += 4;
          }
        }
      });
    });

    crosswalkGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    crosswalkGeo.setIndex(indices);
    const crosswalkMesh = new THREE.Mesh(crosswalkGeo, this.markingWhiteMat);
    this.root.add(crosswalkMesh);
  }

  private createBridgePillar(x: number, groundY: number, roadY: number, z: number) {
    const height = roadY - groundY;
    const pillarGeo = new THREE.CylinderGeometry(0.8, 1.2, height, 8);
    const pillar = new THREE.Mesh(pillarGeo, this.bridgePillarMat);
    pillar.position.set(x, groundY + height * 0.5, z);
    pillar.castShadow = true;
    this.root.add(pillar);
  }

  // Check if coordinates fall within road boundaries + margin
  public isNearRoad(x: number, z: number, margin: number = 20): boolean {
    for (const spline of this.roadSplines) {
      const sampled = spline.curve.getSpacedPoints(45);
      const thresh = spline.width * 0.5 + margin;
      for (let i = 0; i < sampled.length; i++) {
        const pt = sampled[i];
        if (Math.hypot(x - pt.x, z - pt.z) < thresh) {
          return true;
        }
      }
    }
    return false;
  }

  // Fast road height check: If vehicle is near a road, get road elevation
  public sampleRoadHeight(x: number, z: number): { onRoad: boolean; height: number; roadName: string } {
    let nearestDist = 999;
    let roadY = 0;
    let foundRoadName = '';

    for (const spline of this.roadSplines) {
      const halfW = spline.width * 0.65;
      for (let i = 0; i < spline.points.length; i++) {
        const pt = spline.points[i];
        const dist = Math.hypot(x - pt.x, z - pt.z);
        if (dist < halfW + 15 && dist < nearestDist) {
          nearestDist = dist;
          roadY = pt.y;
          foundRoadName = spline.name;
        }
      }
    }

    return {
      onRoad: nearestDist < 12,
      height: roadY,
      roadName: foundRoadName,
    };
  }

  // Get nearest road point for vehicle reset
  public getNearestRoadPoint(pos: THREE.Vector3): { position: THREE.Vector3; yaw: number } {
    let minDist = Infinity;
    let bestPt = new THREE.Vector3(0, 1.5, 0);
    let bestYaw = 0;

    for (const spline of this.roadSplines) {
      const sampled = spline.curve.getSpacedPoints(30);
      for (let i = 0; i < sampled.length - 1; i++) {
        const pt = sampled[i];
        const nextPt = sampled[i + 1];
        const dist = pos.distanceTo(pt);
        if (dist < minDist) {
          minDist = dist;
          bestPt = pt.clone();
          bestYaw = Math.atan2(nextPt.x - pt.x, nextPt.z - pt.z);
        }
      }
    }

    return { position: bestPt, yaw: bestYaw };
  }
}
