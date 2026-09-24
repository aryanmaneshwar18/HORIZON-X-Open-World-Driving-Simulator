import * as THREE from 'three';
import { WeatherType } from '../types/game';

export class Weather {
  public scene: THREE.Scene;
  public currentWeather: WeatherType = 'clear';
  private rainParticles: THREE.Points | null = null;
  private rainCount: number = 3500;
  private rainGeometry: THREE.BufferGeometry | null = null;
  private lightningLight: THREE.PointLight;
  private lightningTimer: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Lightning light for storm
    this.lightningLight = new THREE.PointLight(0xdbeafe, 0, 800);
    this.lightningLight.position.set(0, 200, 0);
    this.scene.add(this.lightningLight);

    this.setupRainParticles();
  }

  private setupRainParticles() {
    this.rainGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.rainCount * 3);
    const boxSize = 120;

    for (let i = 0; i < this.rainCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * boxSize;
      positions[i * 3 + 1] = Math.random() * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * boxSize;
    }

    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const rainMaterial = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.35,
      transparent: true,
      opacity: 0.7,
    });

    this.rainParticles = new THREE.Points(this.rainGeometry, rainMaterial);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  public setWeather(weather: WeatherType) {
    this.currentWeather = weather;

    if (weather === 'rain' || weather === 'storm') {
      if (this.rainParticles) this.rainParticles.visible = true;
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.density = weather === 'storm' ? 0.0035 : 0.0022;
      }
    } else if (weather === 'fog') {
      if (this.rainParticles) this.rainParticles.visible = false;
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.density = 0.0055;
      }
    } else {
      // Clear
      if (this.rainParticles) this.rainParticles.visible = false;
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.density = 0.0016;
      }
    }
  }

  public update(dt: number, cameraPos: THREE.Vector3) {
    // Update rain position to envelope camera
    if (this.rainParticles && this.rainParticles.visible && this.rainGeometry) {
      this.rainParticles.position.x = cameraPos.x;
      this.rainParticles.position.z = cameraPos.z;

      const posAttr = this.rainGeometry.attributes.position as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;
      const fallSpeed = this.currentWeather === 'storm' ? 75 : 55;

      for (let i = 0; i < this.rainCount; i++) {
        positions[i * 3 + 1] -= fallSpeed * dt;
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 60;
        }
      }
      posAttr.needsUpdate = true;
    }

    // Storm lightning
    if (this.currentWeather === 'storm') {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        this.triggerLightning(cameraPos);
        this.lightningTimer = 3.0 + Math.random() * 6.0;
      } else if (this.lightningLight.intensity > 0) {
        this.lightningLight.intensity *= 0.82;
        if (this.lightningLight.intensity < 0.1) this.lightningLight.intensity = 0;
      }
    } else {
      this.lightningLight.intensity = 0;
    }
  }

  private triggerLightning(cameraPos: THREE.Vector3) {
    this.lightningLight.position.set(
      cameraPos.x + (Math.random() - 0.5) * 300,
      180,
      cameraPos.z + (Math.random() - 0.5) * 300,
    );
    this.lightningLight.intensity = 8.0;
  }
}
