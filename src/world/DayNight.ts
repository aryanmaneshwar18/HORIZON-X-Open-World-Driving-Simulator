import * as THREE from 'three';
import { TimeOfDay } from '../types/game';
import { SkyDome } from './SkyDome';

export class DayNight {
  public scene: THREE.Scene;
  public skyDome: SkyDome;
  public sunLight: THREE.DirectionalLight;
  public ambientLight: THREE.AmbientLight;
  public hemisphereLight: THREE.HemisphereLight;
  public timeOfDay: TimeOfDay = 'day';
  public cycleProgress: number = 0.25; // 0.0 (Dawn) -> 0.25 (Noon) -> 0.55 (Sunset) -> 0.8 (Night)
  public autoCycle: boolean = true;
  private cycleSpeed: number = 0.003; // full day-night cycle

  // Procedural sky gradient canvas texture
  private skyCanvas: HTMLCanvasElement;
  private skyCtx: CanvasRenderingContext2D;
  private skyTexture: THREE.CanvasTexture;
  private lastDrawnPhase: string = '';

  // Fog colors
  private fogColorDay = new THREE.Color(0xb2e0f9);
  private fogColorSunset = new THREE.Color(0xfba572);
  private fogColorNight = new THREE.Color(0x0a1122);
  private fogColorDawn = new THREE.Color(0xfbcfe8);

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Procedural High-Definition Sky Background Canvas Texture
    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = 512;
    this.skyCanvas.height = 512;
    this.skyCtx = this.skyCanvas.getContext('2d')!;
    this.skyTexture = new THREE.CanvasTexture(this.skyCanvas);
    this.skyTexture.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.background = this.skyTexture;

    // 2. Atmospheric Celestial Dome (Sun, Moon, Stars, Clouds)
    this.skyDome = new SkyDome();
    scene.add(this.skyDome.root);

    // 3. Ambient & Hemisphere Lighting (High enough so shadows are never pure black!)
    this.ambientLight = new THREE.AmbientLight(0xdbeafe, 0.75);
    scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x7dd3fc, 0x94a3b8, 0.65);
    scene.add(this.hemisphereLight);

    // 4. Directional Sunlight
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.6);
    this.sunLight.position.set(220, 380, 160);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 900;
    const d = 140;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    scene.add(this.sunLight);

    // 5. Believable Atmospheric Depth Fog
    scene.fog = new THREE.Fog(0xb2e0f9, 450, 3400);

    this.setTimeOfDay('day');
  }

  public setTimeOfDay(time: TimeOfDay) {
    this.timeOfDay = time;
    if (time === 'dawn') this.cycleProgress = 0.05;
    else if (time === 'day') this.cycleProgress = 0.28;
    else if (time === 'sunset') this.cycleProgress = 0.58;
    else if (time === 'night') this.cycleProgress = 0.85;

    this.updateLighting(0, true);
  }

  public update(dt: number, playerPos: THREE.Vector3) {
    if (this.autoCycle) {
      this.cycleProgress = (this.cycleProgress + this.cycleSpeed * dt) % 1.0;
    }

    // Keep sun light following player for crisp shadows around vehicle
    const sunAngle = this.cycleProgress * Math.PI * 2;
    this.sunLight.position.x = playerPos.x + 220 * Math.cos(sunAngle);
    this.sunLight.position.z = playerPos.z + 220 * Math.sin(sunAngle);
    this.sunLight.position.y = Math.max(35, 420 * Math.sin(sunAngle));
    this.sunLight.target.position.copy(playerPos);
    this.sunLight.target.updateMatrixWorld();

    // Update celestial sky dome
    this.skyDome.update(dt, this.cycleProgress, playerPos);

    this.updateLighting(dt);
  }

  private updateLighting(dt: number, forceRedraw: boolean = false) {
    const p = this.cycleProgress;

    let targetFog = this.fogColorDay;
    let sunIntensity = 1.6;
    let ambientIntensity = 0.75;
    let phaseName = 'day';

    if (p >= 0.0 && p < 0.16) {
      // Dawn
      phaseName = 'dawn';
      this.timeOfDay = 'dawn';
      targetFog = this.fogColorDawn;
      sunIntensity = 1.1;
      ambientIntensity = 0.6;
    } else if (p >= 0.16 && p < 0.52) {
      // Day
      phaseName = 'day';
      this.timeOfDay = 'day';
      targetFog = this.fogColorDay;
      sunIntensity = 1.7;
      ambientIntensity = 0.78;
    } else if (p >= 0.52 && p < 0.70) {
      // Sunset
      phaseName = 'sunset';
      this.timeOfDay = 'sunset';
      targetFog = this.fogColorSunset;
      sunIntensity = 1.3;
      ambientIntensity = 0.65;
    } else {
      // Night
      phaseName = 'night';
      this.timeOfDay = 'night';
      targetFog = this.fogColorNight;
      sunIntensity = 0.35; // moonlight
      ambientIntensity = 0.35;
    }

    // Smoothly update fog color
    if (this.scene.fog && 'color' in this.scene.fog) {
      this.scene.fog.color.lerp(targetFog, 0.08);
    }
    this.sunLight.intensity = sunIntensity;
    this.ambientLight.intensity = ambientIntensity;

    // Redraw sky gradient canvas if phase changed or forced
    if (forceRedraw || phaseName !== this.lastDrawnPhase) {
      this.drawSkyGradient(phaseName);
      this.lastDrawnPhase = phaseName;
    }
  }

  private drawSkyGradient(phase: string) {
    const ctx = this.skyCtx;
    const grad = ctx.createLinearGradient(0, 0, 0, 512);

    if (phase === 'day') {
      // Vibrant daylight sky with atmospheric horizon haze
      grad.addColorStop(0.00, '#0369a1'); // Deep sapphire zenith
      grad.addColorStop(0.35, '#0ea5e9'); // Clear azure
      grad.addColorStop(0.68, '#7dd3fc'); // Atmospheric cyan
      grad.addColorStop(0.88, '#bae6fd'); // Bright horizon glow
      grad.addColorStop(1.00, '#e0f2fe'); // Ground haze blend
    } else if (phase === 'sunset') {
      // Warm golden hour & sunset
      grad.addColorStop(0.00, '#1e1b4b'); // Twilight violet zenith
      grad.addColorStop(0.28, '#831843'); // Deep magenta
      grad.addColorStop(0.55, '#c2410c'); // Radiant orange
      grad.addColorStop(0.78, '#f59e0b'); // Golden amber
      grad.addColorStop(0.92, '#fde047'); // Horizon fire
      grad.addColorStop(1.00, '#fed7aa'); // Ground haze
    } else if (phase === 'dawn') {
      // Crisp early morning dawn
      grad.addColorStop(0.00, '#1e293b'); // Dark indigo zenith
      grad.addColorStop(0.35, '#4338ca'); // Royal purple
      grad.addColorStop(0.65, '#db2777'); // Rose pink
      grad.addColorStop(0.85, '#fb923c'); // Morning apricot
      grad.addColorStop(1.00, '#fef08a'); // Horizon light
    } else {
      // Atmospheric clear night
      grad.addColorStop(0.00, '#020617'); // Obsidian black zenith
      grad.addColorStop(0.40, '#090d16'); // Midnight navy
      grad.addColorStop(0.75, '#0f172a'); // Slate horizon
      grad.addColorStop(0.92, '#1e293b'); // Distant city horizon haze
      grad.addColorStop(1.00, '#334155'); // Low ambient bounce
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    this.skyTexture.needsUpdate = true;
  }

  public isNight(): boolean {
    return this.timeOfDay === 'night';
  }
}
