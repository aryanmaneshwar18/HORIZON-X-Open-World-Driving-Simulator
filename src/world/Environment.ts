import * as THREE from 'three';
import { Terrain } from './Terrain';
import { RoadSystem } from './RoadSystem';
import { GAME_EVENTS } from '../data/events';

export interface WorldObstacle {
  x: number;
  z: number;
  radius: number;
  height: number;
}

export class Environment {
  public root: THREE.Group;
  public obstacles: WorldObstacle[] = [];
  private terrain: Terrain;
  private roadSystem?: RoadSystem;

  // Architectural & Natural Materials
  private whiteFacadeMat: THREE.MeshStandardMaterial;
  private concreteMat: THREE.MeshStandardMaterial;
  private glassTowerMat: THREE.MeshStandardMaterial;
  private darkGraniteMat: THREE.MeshStandardMaterial;
  private warmBronzeMat: THREE.MeshStandardMaterial;
  private windowLitMat: THREE.MeshStandardMaterial;
  private neonCyanMat: THREE.MeshBasicMaterial;
  private neonAmberMat: THREE.MeshBasicMaterial;
  private neonMagentaMat: THREE.MeshBasicMaterial;
  private treeTrunkMat: THREE.MeshStandardMaterial;
  private oakLeafMat: THREE.MeshStandardMaterial;
  private pineLeafMat: THREE.MeshStandardMaterial;
  private palmLeafMat: THREE.MeshStandardMaterial;
  private rockMat: THREE.MeshStandardMaterial;
  private streetlightGlowMat: THREE.MeshBasicMaterial;

  constructor(terrain: Terrain, roadSystem?: RoadSystem) {
    this.terrain = terrain;
    this.roadSystem = roadSystem;
    this.root = new THREE.Group();

    // 1. Realistic Modern Architectural Palette (Never pitch-black!)
    this.whiteFacadeMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9, // Clean architectural white composite
      roughness: 0.6,
      metalness: 0.1,
    });

    this.concreteMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Light urban stone/concrete
      roughness: 0.8,
      metalness: 0.15,
    });

    this.glassTowerMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8, // Reflective sky-blue glass curtain
      roughness: 0.2,
      metalness: 0.85,
    });

    this.darkGraniteMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Muted slate granite (not pitch black!)
      roughness: 0.5,
      metalness: 0.3,
    });

    this.warmBronzeMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Architectural bronze / terracotta
      roughness: 0.5,
      metalness: 0.5,
    });

    this.windowLitMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: new THREE.Color(0xfde047),
      emissiveIntensity: 0.7,
      roughness: 0.3,
    });

    this.neonCyanMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    this.neonAmberMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    this.neonMagentaMat = new THREE.MeshBasicMaterial({ color: 0xec4899 });

    this.treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.9 });
    this.oakLeafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.75, flatShading: true });
    this.pineLeafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8, flatShading: true });
    this.palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.8 });
    this.rockMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9, flatShading: true });
    this.streetlightGlowMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });

    this.buildMetroCity();
    this.buildCityStreetsideFurniture();
    this.buildMountainScenery();
    this.buildDesertScenery();
    this.buildCoastScenery();
    this.buildHighwayInfrastructure();
    this.buildEventWorldMarkers();
  }

  // 1. METRO CITY (Modern high-density downtown with realistic skyscraper architecture)
  private buildMetroCity() {
    const cityGroup = new THREE.Group();

    // Deterministic random generator for consistent city layout
    const pseudoRandom = (seed: number) => {
      const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
      return x - Math.floor(x);
    };

    let seed = 1;
    const blockStep = 75;

    for (let bx = 320; bx <= 700; bx += blockStep) {
      for (let bz = -700; bz <= -320; bz += blockStep) {
        seed++;
        const r1 = pseudoRandom(seed);
        const r2 = pseudoRandom(seed + 10);
        const r3 = pseudoRandom(seed + 20);

        const width = 26 + r1 * 20;
        const depth = 26 + r2 * 20;
        const posX = bx + (r1 - 0.5) * 12;
        const posZ = bz + (r2 - 0.5) * 12;

        // CRITICAL CHECK: Never spawn buildings into roads or roadside sidewalks!
        const requiredClearance = Math.max(width, depth) * 0.5 + 8;
        if (this.roadSystem && this.roadSystem.isNearRoad(posX, posZ, requiredClearance)) {
          continue;
        }

        // Height ranges from 45m mid-rise to 150m mega-skyscrapers
        const isSkyscraper = (bx === 470 || bx === 545) && (bz === -475 || bz === -400);
        const height = isSkyscraper ? 110 + r3 * 70 : 45 + r3 * 65;

        // Choose architectural style
        const styleIdx = Math.floor(r1 * 4);
        let baseMat = this.whiteFacadeMat;
        if (styleIdx === 1) baseMat = this.concreteMat;
        else if (styleIdx === 2) baseMat = this.glassTowerMat;
        else if (styleIdx === 3) baseMat = this.warmBronzeMat;

        // Base Tower Block
        const bGeo = new THREE.BoxGeometry(width, height, depth);
        const building = new THREE.Mesh(bGeo, baseMat);
        building.position.set(posX, height * 0.5, posZ);
        building.castShadow = true;
        building.receiveShadow = true;
        cityGroup.add(building);

        // Ground Floor Entrance Lobby (Warm lit glass)
        const lobbyGeo = new THREE.BoxGeometry(width * 1.01, 5.0, depth * 1.01);
        const lobby = new THREE.Mesh(lobbyGeo, this.windowLitMat);
        lobby.position.set(posX, 2.5, posZ);
        cityGroup.add(lobby);

        // Stepped Upper Setback / Penthouse Tier for tall towers
        if (height > 65) {
          const topH = height * 0.28;
          const topW = width * 0.72;
          const topD = depth * 0.72;
          const topGeo = new THREE.BoxGeometry(topW, topH, topD);
          const topMesh = new THREE.Mesh(topGeo, this.glassTowerMat);
          topMesh.position.set(posX, height + topH * 0.5, posZ);
          topMesh.castShadow = true;
          cityGroup.add(topMesh);

          // Rooftop Helipad or Antenna Spire
          if (r3 > 0.5) {
            const spireH = 22 + r1 * 14;
            const spire = new THREE.Mesh(
              new THREE.CylinderGeometry(0.3, 0.8, spireH, 6),
              this.darkGraniteMat
            );
            spire.position.set(posX, height + topH + spireH * 0.5, posZ);
            cityGroup.add(spire);

            const redBeacon = new THREE.Mesh(
              new THREE.SphereGeometry(1.2, 6, 6),
              new THREE.MeshBasicMaterial({ color: 0xef4444, fog: false })
            );
            redBeacon.position.set(posX, height + topH + spireH + 0.8, posZ);
            cityGroup.add(redBeacon);
          } else {
            // Illuminated architectural crown ring
            const crownGeo = new THREE.BoxGeometry(topW * 1.04, 2.0, topD * 1.04);
            const crown = new THREE.Mesh(crownGeo, r1 > 0.5 ? this.neonCyanMat : this.neonAmberMat);
            crown.position.set(posX, height + topH - 1.0, posZ);
            cityGroup.add(crown);
          }
        }

        this.obstacles.push({
          x: posX,
          z: posZ,
          radius: Math.max(width, depth) * 0.55,
          height,
        });
      }
    }

    this.root.add(cityGroup);
  }

  // 2. STREETSIDE FURNITURE (Streetlamps, Leafy Street Trees, Bus Stops, Benches)
  private buildCityStreetsideFurniture() {
    const furnitureGroup = new THREE.Group();

    // Place elegant street lamps and lush deciduous trees along major avenues
    const streetNodes = [
      // Along Apex Expressway (x = 400, z = -200 to -700)
      { start: [400, -220], end: [400, -680], step: 35, offsetSide: 6.2 },
      // Along Harbor Way (x = 600, z = -220 to -680)
      { start: [600, -220], end: [600, -680], step: 35, offsetSide: 6.2 },
      // Along Neon Boulevard (z = -300, x = 320 to 680)
      { start: [320, -300], end: [680, -300], step: 35, offsetSide: 6.2, isZRoad: false },
      // Along Metro Central (z = -550, x = 320 to 680)
      { start: [320, -550], end: [680, -550], step: 35, offsetSide: 6.2, isZRoad: false },
    ];

    streetNodes.forEach(node => {
      const isZ = node.isZRoad !== false;
      const startVal = isZ ? node.start[1] : node.start[0];
      const endVal = isZ ? node.end[1] : node.end[0];
      const fixedVal = isZ ? node.start[0] : node.start[1];

      for (let v = startVal; v <= endVal; v += node.step) {
        // Left side lamp & tree
        const lampX = isZ ? fixedVal - node.offsetSide : v;
        const lampZ = isZ ? v : fixedVal - node.offsetSide;
        this.createModernStreetlamp(furnitureGroup, lampX, 1.22, lampZ);

        // Right side deciduous street tree
        const treeX = isZ ? fixedVal + node.offsetSide + 1.2 : v + 17;
        const treeZ = isZ ? v + 17 : fixedVal + node.offsetSide + 1.2;
        this.createDeciduousStreetTree(furnitureGroup, treeX, 1.22, treeZ);
      }
    });

    // Modern glass bus stops at city transit locations
    this.createBusStop(furnitureGroup, 400 + 7.5, 1.22, -370);
    this.createBusStop(furnitureGroup, 400 - 7.5, 1.22, -490);
    this.createBusStop(furnitureGroup, 600 + 7.5, 1.22, -370);

    // Wall-mounted illuminated neon storefront signs
    this.createBuildingNeon(furnitureGroup, 420, 9.0, -315, 'METRO HOTEL', 0x38bdf8);
    this.createBuildingNeon(furnitureGroup, 580, 8.5, -315, 'TURBO DINER', 0xf97316);
    this.createBuildingNeon(furnitureGroup, 420, 11.0, -535, 'CYBER ARCADE', 0xec4899);
    this.createBuildingNeon(furnitureGroup, 580, 9.0, -535, 'APEX TUNING', 0x22c55e);

    this.root.add(furnitureGroup);
  }

  private createModernStreetlamp(parent: THREE.Group, x: number, y: number, z: number) {
    const lamp = new THREE.Group();
    lamp.position.set(x, y, z);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });

    // Vertical mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7.0, 8), metalMat);
    mast.position.y = 3.5;
    lamp.add(mast);

    // Curved horizontal light arm
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.12, 0.12), metalMat);
    arm.position.set(0.8, 6.8, 0);
    lamp.add(arm);

    // Light fixture hood
    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.4), metalMat);
    hood.position.set(1.6, 6.7, 0);
    lamp.add(hood);

    // Glowing warm LED lens
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.05, 0.3), this.streetlightGlowMat);
    lens.position.set(1.6, 6.6, 0);
    lamp.add(lens);

    parent.add(lamp);
    this.obstacles.push({ x, z, radius: 0.4, height: 7.0 });
  }

  private createDeciduousStreetTree(parent: THREE.Group, x: number, y: number, z: number) {
    const tree = new THREE.Group();
    tree.position.set(x, y, z);

    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.35, 3.8, 7), this.treeTrunkMat);
    trunk.position.y = 1.9;
    tree.add(trunk);

    // Rounded multi-layered lush leafy canopy (not a cone!)
    const canopy1 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2, 1), this.oakLeafMat);
    canopy1.position.set(0, 4.2, 0);
    canopy1.scale.set(1.2, 1.0, 1.1);

    const canopy2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.6, 1), this.oakLeafMat);
    canopy2.position.set(0.6, 5.0, 0.4);

    const canopy3 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.5, 1), this.oakLeafMat);
    canopy3.position.set(-0.5, 4.8, -0.4);

    tree.add(canopy1, canopy2, canopy3);
    parent.add(tree);

    this.obstacles.push({ x, z, radius: 0.6, height: 6.5 });
  }

  private createBusStop(parent: THREE.Group, x: number, y: number, z: number) {
    const shelter = new THREE.Group();
    shelter.position.set(x, y, z);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65, roughness: 0.1 });

    // Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.15, 2.2), metalMat);
    roof.position.set(0, 2.6, 0);
    shelter.add(roof);

    // Back glass pane
    const backGlass = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.4), glassMat);
    backGlass.position.set(0, 1.3, -1.0);
    shelter.add(backGlass);

    // Wooden passenger bench
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.12, 0.5), this.treeTrunkMat);
    bench.position.set(0, 0.55, -0.6);
    shelter.add(bench);

    parent.add(shelter);
    this.obstacles.push({ x, z, radius: 2.2, height: 2.8 });
  }

  private createBuildingNeon(parent: THREE.Group, x: number, y: number, z: number, text: string, colorHex: number) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 80;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 300, 80);
    ctx.strokeStyle = `#${colorHex.toString(16).padStart(6, '0')}`;
    ctx.lineWidth = 5;
    ctx.strokeRect(4, 4, 292, 72);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 150, 52);

    const texture = new THREE.CanvasTexture(canvas);
    const neonMat = new THREE.MeshBasicMaterial({ map: texture });
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 2.0), neonMat);
    signMesh.position.set(x, y, z);
    parent.add(signMesh);
  }

  // 3. MOUNTAIN SCENERY (Alpine pines, Boulders, Summit Lookout Pavilion)
  private buildMountainScenery() {
    const mountainGroup = new THREE.Group();

    // Plant 85 alpine pine trees on mountainsides
    for (let i = 0; i < 85; i++) {
      const x = -200 - Math.random() * 550;
      const z = -200 - Math.random() * 550;
      const groundH = this.terrain.calculateTerrainHeight(x, z);

      if (groundH > 6 && groundH < 95) {
        const tree = this.createPineTree();
        tree.position.set(x, groundH, z);
        const s = 0.8 + Math.random() * 0.6;
        tree.scale.set(s, s, s);
        mountainGroup.add(tree);

        this.obstacles.push({ x, z, radius: 1.2, height: 12 });
      }
    }

    // Mountain Summit Lookout Platform at (-520, 115, -720)
    const lookoutGeo = new THREE.CylinderGeometry(8, 9, 3, 16);
    const lookout = new THREE.Mesh(lookoutGeo, this.concreteMat);
    lookout.position.set(-520, 116.5, -720);
    mountainGroup.add(lookout);

    this.root.add(mountainGroup);
  }

  private createPineTree(): THREE.Group {
    const group = new THREE.Group();

    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 4.5, 6), this.treeTrunkMat);
    trunk.position.y = 2.25;
    group.add(trunk);

    // 3 tiered conical foliage tiers
    for (let i = 0; i < 3; i++) {
      const coneGeo = new THREE.ConeGeometry(2.3 - i * 0.5, 3.4, 7);
      const cone = new THREE.Mesh(coneGeo, this.pineLeafMat);
      cone.position.y = 3.6 + i * 2.1;
      group.add(cone);
    }

    return group;
  }

  // 4. DESERT SCENERY (Service Station Outpost, Airfield Hangar, Saguaro Cacti)
  private buildDesertScenery() {
    const desertGroup = new THREE.Group();

    // Abandoned Airfield Hangar at (-680, 1.5, 320)
    const hangarGeo = new THREE.CylinderGeometry(14, 14, 38, 16, 1, false, 0, Math.PI);
    hangarGeo.rotateZ(Math.PI / 2);
    const hangarMat = new THREE.MeshStandardMaterial({ color: 0x71717a, metalness: 0.7, roughness: 0.5 });
    const hangar = new THREE.Mesh(hangarGeo, hangarMat);
    hangar.position.set(-680, 7, 320);
    desertGroup.add(hangar);
    this.obstacles.push({ x: -680, z: 320, radius: 15, height: 14 });

    // Route 66 Desert Gas Service Station at (-620, 1.5, 450)
    this.buildDesertOutpost(desertGroup);

    // Saguaro Cacti across desert
    for (let i = 0; i < 40; i++) {
      const x = -300 - Math.random() * 450;
      const z = 350 + Math.random() * 400;
      const gH = this.terrain.calculateTerrainHeight(x, z);
      const cactus = this.createSaguaroCactus();
      cactus.position.set(x, gH, z);
      desertGroup.add(cactus);
      this.obstacles.push({ x, z, radius: 0.8, height: 6 });
    }

    this.root.add(desertGroup);
  }

  private buildDesertOutpost(parent: THREE.Group) {
    const stationGroup = new THREE.Group();
    stationGroup.position.set(-620, 1.5, 450);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });

    // Canopy Roof
    const canopyRoof = new THREE.Mesh(new THREE.BoxGeometry(18, 0.8, 12), redMat);
    canopyRoof.position.set(0, 6, 0);
    stationGroup.add(canopyRoof);

    // Canopy Pillars
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6, 8), metalMat);
    p1.position.set(-7, 3, -4);
    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6, 8), metalMat);
    p2.position.set(7, 3, -4);
    stationGroup.add(p1, p2);

    // Dual Fuel Dispenser Pumps
    for (let i = -1; i <= 1; i += 2) {
      const pump = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.9), redMat);
      pump.position.set(i * 4, 1.1, 0);
      stationGroup.add(pump);
    }

    parent.add(stationGroup);
    this.obstacles.push({ x: -620, z: 450, radius: 10, height: 7 });
  }

  private createSaguaroCactus(): THREE.Group {
    const group = new THREE.Group();
    const cactusMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 });

    // Main stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 5.5, 8), cactusMat);
    stem.position.y = 2.75;
    group.add(stem);

    // Arms
    const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.0, 6), cactusMat);
    arm1.position.set(0.8, 3.2, 0);
    arm1.rotation.z = Math.PI / 4;
    group.add(arm1);

    return group;
  }

  // 5. COAST SCENERY (Coastal Lighthouse, Palm Trees, Piers)
  private buildCoastScenery() {
    const coastGroup = new THREE.Group();

    // Lighthouse on Coastal Bluffs at (780, 16, 420)
    const lhBase = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 5.5, 24, 16), this.whiteFacadeMat);
    lhBase.position.set(780, 28, 420);
    coastGroup.add(lhBase);

    // Red beacon lantern house
    const lhTop = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, 5, 12), new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    lhTop.position.set(780, 42.5, 420);
    coastGroup.add(lhTop);

    // Glowing beacon lens
    const lhLens = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false }));
    lhLens.position.set(780, 42.5, 420);
    coastGroup.add(lhLens);

    // Palm Trees along coastal beach
    for (let i = 0; i < 30; i++) {
      const x = 550 + Math.random() * 200;
      const z = 250 + Math.random() * 450;
      const gH = this.terrain.calculateTerrainHeight(x, z);

      if (gH > 0.5 && gH < 18) {
        const palm = this.createPalmTree();
        palm.position.set(x, gH, z);
        coastGroup.add(palm);
        this.obstacles.push({ x, z, radius: 0.8, height: 8 });
      }
    }

    this.root.add(coastGroup);
  }

  private createPalmTree(): THREE.Group {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 7.5, 7), this.treeTrunkMat);
    trunk.position.set(0, 3.75, 0);
    trunk.rotation.z = 0.08;
    group.add(trunk);

    // Palm fronds
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 0.6), this.palmLeafMat);
      frond.position.set(Math.cos(angle) * 1.4, 7.5, Math.sin(angle) * 1.4);
      frond.rotation.y = angle;
      frond.rotation.z = -0.35;
      group.add(frond);
    }

    return group;
  }

  // 6. HIGHWAY INFRASTRUCTURE (Overhead Gantries, Roadside Billboards)
  private buildHighwayInfrastructure() {
    const hwGroup = new THREE.Group();

    // Overhead Highway Signs
    this.createHighwayGantry(hwGroup, 450, 1.2, -600, 'METRO CITY // NORTH ENTRANCE', 'AKINA PASS 5 KM ↗');
    this.createHighwayGantry(hwGroup, 720, 1.2, -320, 'PORT OF HORIZON // HARBOR', 'COAST EXPRESS ↗');
    this.createHighwayGantry(hwGroup, 550, 4.0, 400, 'PACIFIC COAST HIGHWAY', 'LIGHTHOUSE COVE 2 KM ↗');
    this.createHighwayGantry(hwGroup, -550, 1.5, 680, 'RED ROCK HIGHWAY', 'ABANDONED AIRFIELD 3 KM ↗');

    // Roadside Billboards
    this.createRoadsideBillboard(hwGroup, 480, 1.2, -260, 'HORIZON X', 'OPEN WORLD RACING CHAMPIONSHIP');
    this.createRoadsideBillboard(hwGroup, -350, 1.5, 780, 'OCTANE RACING', 'MAXIMUM DRIFT VELOCITY');

    this.root.add(hwGroup);
  }

  private createHighwayGantry(parent: THREE.Group, x: number, y: number, z: number, line1: string, line2: string) {
    const gantry = new THREE.Group();
    gantry.position.set(x, y, z);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const signMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.4 });

    // 2 Pillars (spanning 16m across highway)
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 8, 8), metalMat);
    p1.position.set(-8, 4, 0);
    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 8, 8), metalMat);
    p2.position.set(8, 4, 0);
    gantry.add(p1, p2);

    // Crossbeam
    const crossbeam = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.5, 0.5), metalMat);
    crossbeam.position.set(0, 7.8, 0);
    gantry.add(crossbeam);

    // Green Sign Board
    const signMesh = new THREE.Mesh(new THREE.BoxGeometry(9.0, 2.2, 0.15), signMat);
    signMesh.position.set(0, 7.8, 0.2);
    gantry.add(signMesh);

    // Dynamic canvas label
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#065f46';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(line1, 256, 50);
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(line2, 256, 92);

    const texture = new THREE.CanvasTexture(canvas);
    const textMat = new THREE.MeshBasicMaterial({ map: texture });
    const textPlane = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 2.0), textMat);
    textPlane.position.set(0, 7.8, 0.3);
    gantry.add(textPlane);

    parent.add(gantry);
    this.obstacles.push({ x: x - 8, z, radius: 1, height: 8 });
    this.obstacles.push({ x: x + 8, z, radius: 1, height: 8 });
  }

  private createRoadsideBillboard(parent: THREE.Group, x: number, y: number, z: number, title: string, subtitle: string) {
    const bb = new THREE.Group();
    bb.position.set(x, y, z);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.2 });

    // Single sturdy mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 12, 8), metalMat);
    mast.position.y = 6;
    bb.add(mast);

    // Frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 0.4), metalMat);
    frame.position.set(0, 11, 0);
    bb.add(frame);

    // Canvas face
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(0, 0, 512, 24);
    ctx.fillRect(0, 232, 512, 24);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 256, 120);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(subtitle, 256, 170);

    const texture = new THREE.CanvasTexture(canvas);
    const faceMat = new THREE.MeshBasicMaterial({ map: texture });
    const faceFront = new THREE.Mesh(new THREE.PlaneGeometry(13.5, 5.5), faceMat);
    faceFront.position.set(0, 11, 0.22);
    bb.add(faceFront);

    parent.add(bb);
    this.obstacles.push({ x, z, radius: 1.5, height: 14 });
  }

  // 7. EVENT WORLD MARKERS (Holographic Arches & Floating Rings)
  private buildEventWorldMarkers() {
    GAME_EVENTS.forEach((evt) => {
      const markerGroup = new THREE.Group();
      markerGroup.position.set(evt.position[0], evt.position[1], evt.position[2]);

      let markerColor = 0xf97316; // sprint/race
      if (evt.type === 'circuit') markerColor = 0x06b6d4;
      if (evt.type === 'drift_zone') markerColor = 0xec4899;
      if (evt.type === 'speed_trap') markerColor = 0xeab308;
      if (evt.type === 'police_escape') markerColor = 0xef4444;
      if (evt.type === 'championship') markerColor = 0xa855f7;

      // Vertical holographic light column
      const colGeo = new THREE.CylinderGeometry(1.8, 1.8, 14, 16, 1, true);
      const colMat = new THREE.MeshBasicMaterial({
        color: markerColor,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      });
      const col = new THREE.Mesh(colGeo, colMat);
      col.position.y = 7;
      markerGroup.add(col);

      // Rotating glowing ring
      const ringGeo = new THREE.TorusGeometry(3.5, 0.22, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: markerColor });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 8;
      ring.rotation.x = Math.PI / 2;
      markerGroup.add(ring);

      this.root.add(markerGroup);
    });
  }

  public checkCollision(carPos: THREE.Vector3, carRadius: number = 1.8): WorldObstacle | null {
    for (const obs of this.obstacles) {
      const dx = carPos.x - obs.x;
      const dz = carPos.z - obs.z;
      const dist = Math.hypot(dx, dz);
      if (dist < obs.radius + carRadius && carPos.y < obs.height + 1.0) {
        return obs;
      }
    }
    return null;
  }

  public update(timeSec: number) {
    // Optional animations for environment markers
  }

  public checkObstacleCollision(carPos: THREE.Vector3, carRadius: number = 1.4): { collided: boolean; normal: THREE.Vector3 } {
    for (const obs of this.obstacles) {
      const dx = carPos.x - obs.x;
      const dz = carPos.z - obs.z;
      const dist = Math.hypot(dx, dz);
      const minDist = obs.radius + carRadius;

      if (dist < minDist && carPos.y < obs.height + 1.0) {
        const normal = new THREE.Vector3(dx / (dist || 1), 0, dz / (dist || 1));
        return { collided: true, normal };
      }
    }
    return { collided: false, normal: new THREE.Vector3(0, 0, 0) };
  }
}
