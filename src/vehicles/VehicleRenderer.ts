import * as THREE from 'three';
import { CarDefinition, CarCustomization } from '../types/game';

export class VehicleRenderer {
  public root: THREE.Group;
  public chassisGroup: THREE.Group;
  private carDef: CarDefinition;
  private custom: CarCustomization;

  // Materials for live visual tuning
  private paintMaterial: THREE.MeshStandardMaterial;
  private glassMaterial: THREE.MeshStandardMaterial;
  private carbonMaterial: THREE.MeshStandardMaterial;
  private rimMaterial: THREE.MeshStandardMaterial;
  private tireMaterial: THREE.MeshStandardMaterial;
  private taillightMaterial: THREE.MeshStandardMaterial;
  private headlightMaterial: THREE.MeshStandardMaterial;
  private drlMaterial: THREE.MeshBasicMaterial;
  private underglowMesh: THREE.Mesh | null = null;
  private underglowLight: THREE.PointLight | null = null;

  // Wheels
  private wheelFL: THREE.Group = new THREE.Group();
  private wheelFR: THREE.Group = new THREE.Group();
  private wheelRL: THREE.Group = new THREE.Group();
  private wheelRR: THREE.Group = new THREE.Group();

  // Nitro exhaust flame meshes
  private exhaustFlameLeft: THREE.Mesh | null = null;
  private exhaustFlameRight: THREE.Mesh | null = null;

  // Headlight spot lights for night driving
  private leftHeadlight: THREE.SpotLight | null = null;
  private rightHeadlight: THREE.SpotLight | null = null;

  constructor(carDef: CarDefinition, custom: CarCustomization) {
    this.carDef = carDef;
    this.custom = custom;
    this.root = new THREE.Group();
    this.chassisGroup = new THREE.Group();
    this.root.add(this.chassisGroup);

    // 1. High-Grade Specular Metallic Car Paint
    const isMetallic = custom.finish === 'metallic' || custom.finish === undefined;
    this.paintMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(custom.paintColor || carDef.baseColor || '#e11d48'),
      roughness: custom.finish === 'matte' ? 0.65 : 0.22,
      metalness: isMetallic ? 0.85 : 0.4,
    });

    this.glassMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(custom.windowTint || '#0f172a'),
      roughness: 0.08,
      metalness: 0.9,
      transparent: true,
      opacity: 0.82,
    });

    this.carbonMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.35,
      metalness: 0.8,
    });

    this.rimMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(custom.rimColor || '#e2e8f0'),
      roughness: 0.2,
      metalness: 0.9,
    });

    this.tireMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.92,
      metalness: 0.05,
    });

    this.headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 1.5,
      roughness: 0.1,
    });

    this.drlMaterial = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
    });

    this.taillightMaterial = new THREE.MeshStandardMaterial({
      color: 0xff1e1e,
      emissive: new THREE.Color(0xef4444),
      emissiveIntensity: 0.85,
      roughness: 0.2,
    });

    this.buildCarModel();
  }

  private buildCarModel() {
    // Clear previous
    while (this.chassisGroup.children.length > 0) {
      this.chassisGroup.remove(this.chassisGroup.children[0]);
    }

    const { chassisScale, cabinOffset, cabinScale, wheelRadius, wheelWidth, wheelBase, trackWidth } = this.carDef.modelStyle;
    const [cW, cH, cL] = chassisScale;

    // 1. Sleek Aerodynamic Lower Tub / Chassis
    const lowerBodyGeo = new THREE.BoxGeometry(cW * 0.95, cH * 0.42, cL);
    const lowerBody = new THREE.Mesh(lowerBodyGeo, this.paintMaterial);
    lowerBody.position.y = cH * 0.36;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    this.chassisGroup.add(lowerBody);

    // Front Carbon Splitter / Air Dam
    const splitterGeo = new THREE.BoxGeometry(cW * 0.98, 0.06, 0.45);
    const splitter = new THREE.Mesh(splitterGeo, this.carbonMaterial);
    splitter.position.set(0, cH * 0.12, -cL * 0.5 - 0.12);
    splitter.castShadow = true;
    this.chassisGroup.add(splitter);

    // Aerodynamic Side Skirts
    const skirtL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, cL * 0.65), this.carbonMaterial);
    skirtL.position.set(-cW * 0.49, cH * 0.14, 0);
    const skirtR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, cL * 0.65), this.carbonMaterial);
    skirtR.position.set(cW * 0.49, cH * 0.14, 0);
    this.chassisGroup.add(skirtL, skirtR);

    // 2. Sloped Aerodynamic Front Hood with Center Power Bulge
    const hoodL = cL * 0.44;
    const hoodGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.28, hoodL);
    const hood = new THREE.Mesh(hoodGeo, this.paintMaterial);
    hood.position.set(0, cH * 0.58, -cL * 0.24);
    hood.rotation.x = 0.045; // subtle forward wedge rake
    hood.castShadow = true;
    this.chassisGroup.add(hood);

    // Hood Center Power Vent / Bulge
    const bulgeGeo = new THREE.BoxGeometry(cW * 0.32, 0.05, hoodL * 0.65);
    const bulge = new THREE.Mesh(bulgeGeo, this.carbonMaterial);
    bulge.position.set(0, cH * 0.74, -cL * 0.24);
    this.chassisGroup.add(bulge);

    // 3. Flared Muscular Wheel Arches (Front & Rear Widebody)
    const archMat = this.paintMaterial;
    const archRadius = wheelRadius * 1.25;
    const archDepth = cL * 0.22;

    const makeArch = (x: number, z: number) => {
      const arch = new THREE.Mesh(new THREE.BoxGeometry(0.12, archRadius, archDepth), archMat);
      arch.position.set(x, cH * 0.46, z);
      arch.castShadow = true;
      return arch;
    };

    const halfTrack = trackWidth * 0.5;
    const halfBase = wheelBase * 0.5;
    this.chassisGroup.add(
      makeArch(-cW * 0.48, -halfBase),
      makeArch(cW * 0.48, -halfBase),
      makeArch(-cW * 0.49, halfBase),
      makeArch(cW * 0.49, halfBase)
    );

    // 4. Rear Trunk Deck & Fastback
    const trunkL = cL * 0.34;
    const trunkGeo = new THREE.BoxGeometry(cW * 0.92, cH * 0.32, trunkL);
    const trunk = new THREE.Mesh(trunkGeo, this.paintMaterial);
    trunk.position.set(0, cH * 0.62, cL * 0.32);
    trunk.castShadow = true;
    this.chassisGroup.add(trunk);

    // 5. Streamlined Aerodynamic Cockpit & Windows
    const [cabW, cabH, cabL] = cabinScale;
    const cabinGeo = new THREE.BoxGeometry(cabW, cabH, cabL);
    const cabin = new THREE.Mesh(cabinGeo, this.glassMaterial);
    cabin.position.set(cabinOffset[0], cabinOffset[1] + cH * 0.52, cabinOffset[2]);
    cabin.castShadow = true;
    this.chassisGroup.add(cabin);

    // Tapered Carbon/Paint Roof Plate
    const roofGeo = new THREE.BoxGeometry(cabW * 0.88, 0.06, cabL * 0.82);
    const roof = new THREE.Mesh(roofGeo, this.carbonMaterial);
    roof.position.set(cabinOffset[0], cabinOffset[1] + cH * 0.52 + cabH * 0.51, cabinOffset[2]);
    roof.castShadow = true;
    this.chassisGroup.add(roof);

    // Raked Windshield Black A-Pillars
    const aPillarL = new THREE.Mesh(new THREE.BoxGeometry(0.04, cabH * 1.1, 0.05), this.carbonMaterial);
    aPillarL.position.set(-cabW * 0.44, cabinOffset[1] + cH * 0.52, cabinOffset[2] - cabL * 0.45);
    aPillarL.rotation.x = -0.35;
    const aPillarR = new THREE.Mesh(new THREE.BoxGeometry(0.04, cabH * 1.1, 0.05), this.carbonMaterial);
    aPillarR.position.set(cabW * 0.44, cabinOffset[1] + cH * 0.52, cabinOffset[2] - cabL * 0.45);
    aPillarR.rotation.x = -0.35;
    this.chassisGroup.add(aPillarL, aPillarR);

    // Side Mirrors
    const mirrorL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.14), this.carbonMaterial);
    mirrorL.position.set(-cW * 0.52, cH * 0.72, -cL * 0.08);
    const mirrorR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.14), this.carbonMaterial);
    mirrorR.position.set(cW * 0.52, cH * 0.72, -cL * 0.08);
    this.chassisGroup.add(mirrorL, mirrorR);

    // 6. Modern Aggressive Projector LED Headlights with DRL Blades
    const hlW = cW * 0.24;
    const hlH = cH * 0.15;
    const hlGeo = new THREE.BoxGeometry(hlW, hlH, 0.1);
    const hlL = new THREE.Mesh(hlGeo, this.headlightMaterial);
    hlL.position.set(-cW * 0.32, cH * 0.54, -cL * 0.5 - 0.02);
    hlL.rotation.y = -0.15;

    const hlR = new THREE.Mesh(hlGeo, this.headlightMaterial);
    hlR.position.set(cW * 0.32, cH * 0.54, -cL * 0.5 - 0.02);
    hlR.rotation.y = 0.15;
    this.chassisGroup.add(hlL, hlR);

    // Glowing White DRL Daytime Eyebrows
    const drlGeo = new THREE.BoxGeometry(hlW * 1.08, 0.03, 0.11);
    const drlL = new THREE.Mesh(drlGeo, this.drlMaterial);
    drlL.position.set(-cW * 0.32, cH * 0.62, -cL * 0.5 - 0.03);
    const drlR = new THREE.Mesh(drlGeo, this.drlMaterial);
    drlR.position.set(cW * 0.32, cH * 0.62, -cL * 0.5 - 0.03);
    this.chassisGroup.add(drlL, drlR);

    // Spotlights for night driving
    this.leftHeadlight = new THREE.SpotLight(0xfffaed, 2.8, 55, Math.PI / 6, 0.35, 1.2);
    this.leftHeadlight.position.set(-cW * 0.32, cH * 0.55, -cL * 0.5);
    const leftTarget = new THREE.Object3D();
    leftTarget.position.set(-cW * 0.32, 0, -cL * 0.5 - 25);
    this.leftHeadlight.target = leftTarget;
    this.chassisGroup.add(this.leftHeadlight, leftTarget);

    this.rightHeadlight = new THREE.SpotLight(0xfffaed, 2.8, 55, Math.PI / 6, 0.35, 1.2);
    this.rightHeadlight.position.set(cW * 0.32, cH * 0.55, -cL * 0.5);
    const rightTarget = new THREE.Object3D();
    rightTarget.position.set(cW * 0.32, 0, -cL * 0.5 - 25);
    this.rightHeadlight.target = rightTarget;
    this.chassisGroup.add(this.rightHeadlight, rightTarget);

    // 7. Full-Width Smoked LED Rear Light Bar
    const tlGeo = new THREE.BoxGeometry(cW * 0.88, cH * 0.12, 0.08);
    const taillight = new THREE.Mesh(tlGeo, this.taillightMaterial);
    taillight.position.set(0, cH * 0.6, cL * 0.5 + 0.02);
    this.chassisGroup.add(taillight);

    // 8. Rear Carbon Diffuser with Strakes & Quad Chrome Exhaust Tips
    const diffuserGeo = new THREE.BoxGeometry(cW * 0.82, 0.16, 0.32);
    const diffuser = new THREE.Mesh(diffuserGeo, this.carbonMaterial);
    diffuser.position.set(0, cH * 0.18, cL * 0.48);
    this.chassisGroup.add(diffuser);

    // Quad Chrome Exhaust Tips
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.15 });
    const exhaustGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.22, 10);
    exhaustGeo.rotateX(Math.PI / 2);

    const pipeOffsets = [-cW * 0.3, -cW * 0.2, cW * 0.2, cW * 0.3];
    pipeOffsets.forEach(ox => {
      const tip = new THREE.Mesh(exhaustGeo, exhaustMat);
      tip.position.set(ox, cH * 0.22, cL * 0.5 + 0.08);
      this.chassisGroup.add(tip);
    });

    // Dual Nitro Boost Flame Jets
    const flameGeo = new THREE.ConeGeometry(0.14, 0.85, 8);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4, // Intense electric cyan flame
      transparent: true,
      opacity: 0.92,
    });
    this.exhaustFlameLeft = new THREE.Mesh(flameGeo, flameMat);
    this.exhaustFlameLeft.position.set(-cW * 0.25, cH * 0.22, cL * 0.5 + 0.55);
    this.exhaustFlameLeft.visible = false;

    this.exhaustFlameRight = new THREE.Mesh(flameGeo, flameMat);
    this.exhaustFlameRight.position.set(cW * 0.25, cH * 0.22, cL * 0.5 + 0.55);
    this.exhaustFlameRight.visible = false;

    this.chassisGroup.add(this.exhaustFlameLeft, this.exhaustFlameRight);

    // 9. Aerodynamic Rear Spoilers
    this.buildSpoiler(cW, cH, cL);

    // 10. Neon Underglow
    if (this.custom.underglow) {
      const underglowGeo = new THREE.PlaneGeometry(cW * 0.9, cL * 0.85);
      underglowGeo.rotateX(-Math.PI / 2);
      const underglowMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(this.custom.underglow),
        transparent: true,
        opacity: 0.75,
      });
      this.underglowMesh = new THREE.Mesh(underglowGeo, underglowMat);
      this.underglowMesh.position.set(0, 0.08, 0);
      this.chassisGroup.add(this.underglowMesh);

      this.underglowLight = new THREE.PointLight(new THREE.Color(this.custom.underglow), 2.0, 4.5);
      this.underglowLight.position.set(0, 0.2, 0);
      this.chassisGroup.add(this.underglowLight);
    }

    // 11. Wheels Setup
    this.setupWheels(wheelRadius, wheelWidth, wheelBase, trackWidth);
  }

  private buildSpoiler(cW: number, cH: number, cL: number) {
    const style = this.custom.spoilerStyle || 'none';
    if (style === 'none') return;

    const spoilerGroup = new THREE.Group();
    spoilerGroup.position.set(0, cH * 0.76, cL * 0.44);

    if (style === 'ducktail') {
      const duckGeo = new THREE.BoxGeometry(cW * 0.86, 0.09, 0.24);
      duckGeo.rotateX(0.28);
      const duck = new THREE.Mesh(duckGeo, this.carbonMaterial);
      spoilerGroup.add(duck);
    } else if (style === 'gt_wing' || style === 'carbon_race') {
      const wingMat = style === 'carbon_race' ? this.carbonMaterial : this.paintMaterial;

      // Upright struts
      const strutGeo = new THREE.BoxGeometry(0.04, 0.4, 0.16);
      const strutL = new THREE.Mesh(strutGeo, this.carbonMaterial);
      strutL.position.set(-cW * 0.35, 0.18, 0);
      const strutR = new THREE.Mesh(strutGeo, this.carbonMaterial);
      strutR.position.set(cW * 0.35, 0.18, 0);

      // Main Wing Airfoil
      const wingGeo = new THREE.BoxGeometry(cW * 1.08, 0.05, 0.35);
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.set(0, 0.38, 0);

      // Endplates
      const epGeo = new THREE.BoxGeometry(0.02, 0.2, 0.36);
      const epL = new THREE.Mesh(epGeo, this.carbonMaterial);
      epL.position.set(-cW * 0.54, 0.38, 0);
      const epR = new THREE.Mesh(epGeo, this.carbonMaterial);
      epR.position.set(cW * 0.54, 0.38, 0);

      spoilerGroup.add(strutL, strutR, wing, epL, epR);
    }

    this.chassisGroup.add(spoilerGroup);
  }

  private createWheelMesh(radius: number, width: number): THREE.Group {
    const wheelGroup = new THREE.Group();

    // Tire outer ring
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 18);
    tireGeo.rotateZ(Math.PI / 2);
    const tire = new THREE.Mesh(tireGeo, this.tireMaterial);
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Rim inner cylinder & outer polished lip
    const rimRadius = radius * 0.72;
    const rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, width * 1.02, 14);
    rimGeo.rotateZ(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeo, this.rimMaterial);
    wheelGroup.add(rim);

    // 5-Spoke Split Sport Alloy
    const spokeCount = 5;
    for (let i = 0; i < spokeCount; i++) {
      const angle = (i / spokeCount) * Math.PI * 2;
      const spokeGeo = new THREE.BoxGeometry(width * 1.04, rimRadius * 0.92, 0.05);
      const spoke = new THREE.Mesh(spokeGeo, this.rimMaterial);
      spoke.rotation.x = angle;
      wheelGroup.add(spoke);
    }

    // Drilled Brake Rotor Disc
    const discGeo = new THREE.CylinderGeometry(rimRadius * 0.82, rimRadius * 0.82, 0.03, 14);
    discGeo.rotateZ(Math.PI / 2);
    const discMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.25 });
    const disc = new THREE.Mesh(discGeo, discMat);
    wheelGroup.add(disc);

    // Brembo Red Brake Caliper
    const caliperGeo = new THREE.BoxGeometry(0.09, 0.14, 0.16);
    const caliperMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.6 });
    const caliper = new THREE.Mesh(caliperGeo, caliperMat);
    caliper.position.set(0, rimRadius * 0.48, 0);
    wheelGroup.add(caliper);

    return wheelGroup;
  }

  private setupWheels(radius: number, width: number, wheelBase: number, trackWidth: number) {
    this.root.remove(this.wheelFL, this.wheelFR, this.wheelRL, this.wheelRR);

    this.wheelFL = this.createWheelMesh(radius, width);
    this.wheelFR = this.createWheelMesh(radius, width);
    this.wheelRL = this.createWheelMesh(radius, width);
    this.wheelRR = this.createWheelMesh(radius, width);

    const halfBase = wheelBase * 0.5;
    const halfTrack = trackWidth * 0.5;

    this.wheelFL.position.set(-halfTrack, radius, -halfBase);
    this.wheelFR.position.set(halfTrack, radius, -halfBase);
    this.wheelRL.position.set(-halfTrack, radius, halfBase);
    this.wheelRR.position.set(halfTrack, radius, halfBase);

    this.root.add(this.wheelFL, this.wheelFR, this.wheelRL, this.wheelRR);
  }

  public update(dt: number, params: {
    steerAngle: number;
    speedKmh: number;
    isBraking: boolean;
    isNitroActive: boolean;
    pitch: number;
    roll: number;
  }) {
    // Pitch & roll suspension tilt on chassis
    this.chassisGroup.rotation.x = params.pitch;
    this.chassisGroup.rotation.z = params.roll;

    // Steer front wheels
    this.wheelFL.rotation.y = params.steerAngle;
    this.wheelFR.rotation.y = params.steerAngle;

    // Wheel spin rotation from velocity
    const wheelRotSpeed = (params.speedKmh / 3.6) / this.carDef.modelStyle.wheelRadius;
    const rotDelta = wheelRotSpeed * dt;
    this.wheelFL.rotation.x += rotDelta;
    this.wheelFR.rotation.x += rotDelta;
    this.wheelRL.rotation.x += rotDelta;
    this.wheelRR.rotation.x += rotDelta;

    // Brake lights: bright high-output LED bloom during deceleration
    if (params.isBraking) {
      this.taillightMaterial.emissiveIntensity = 2.6;
    } else {
      this.taillightMaterial.emissiveIntensity = 0.85;
    }

    // Nitro twin flame exhausts
    if (this.exhaustFlameLeft && this.exhaustFlameRight) {
      if (params.isNitroActive) {
        this.exhaustFlameLeft.visible = true;
        this.exhaustFlameRight.visible = true;
        const scaleJitter = 0.9 + Math.random() * 0.45;
        this.exhaustFlameLeft.scale.set(scaleJitter, scaleJitter, scaleJitter * 1.4);
        this.exhaustFlameRight.scale.set(scaleJitter, scaleJitter, scaleJitter * 1.4);
      } else {
        this.exhaustFlameLeft.visible = false;
        this.exhaustFlameRight.visible = false;
      }
    }
  }

  public setHeadlightsEnabled(enabled: boolean) {
    if (this.leftHeadlight) this.leftHeadlight.intensity = enabled ? 2.8 : 0;
    if (this.rightHeadlight) this.rightHeadlight.intensity = enabled ? 2.8 : 0;
    this.headlightMaterial.emissiveIntensity = enabled ? 1.6 : 0.2;
  }

  public updateCustomization(custom: CarCustomization) {
    this.custom = custom;
    this.paintMaterial.color.set(custom.paintColor);
    this.paintMaterial.roughness = custom.finish === 'matte' ? 0.65 : 0.22;
    this.paintMaterial.metalness = custom.finish === 'metallic' ? 0.85 : 0.4;
    this.rimMaterial.color.set(custom.rimColor);
    this.glassMaterial.color.set(custom.windowTint);

    this.buildCarModel();
  }
}
