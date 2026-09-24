// Web Audio API procedural sound synthesizer for Horizon X

export class AudioManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;

  // Engine audio nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  // Tire screech audio nodes
  private tireNoiseNode: AudioBufferSourceNode | null = null;
  private tireGain: GainNode | null = null;
  private tireFilter: BiquadFilterNode | null = null;

  // Wind audio nodes
  private windNode: AudioBufferSourceNode | null = null;
  private windGain: GainNode | null = null;

  // Nitro audio nodes
  private nitroOsc: OscillatorNode | null = null;
  private nitroNoiseNode: AudioBufferSourceNode | null = null;
  private nitroGain: GainNode | null = null;

  // Police siren nodes
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenMod: OscillatorNode | null = null;
  private isSirenActive: boolean = false;

  private isInitialized: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  public init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.setupEngineSynth();
      this.setupTireSynth();
      this.setupWindSynth();
      this.setupNitroSynth();
      this.setupSirenSynth();
      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio not supported or failed to initialize:', e);
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private createWhiteNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error('No audio context');
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private setupEngineSynth() {
    if (!this.ctx) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    // Dual oscillator for rich rumbling engine harmonic tone
    this.engineOsc1 = this.ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.setValueAtTime(50, this.ctx.currentTime);

    this.engineOsc2 = this.ctx.createOscillator();
    this.engineOsc2.type = 'triangle';
    this.engineOsc2.frequency.setValueAtTime(25, this.ctx.currentTime);

    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  private setupTireSynth() {
    if (!this.ctx) return;
    const noiseBuffer = this.createWhiteNoiseBuffer();

    this.tireGain = this.ctx.createGain();
    this.tireGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.tireFilter = this.ctx.createBiquadFilter();
    this.tireFilter.type = 'bandpass';
    this.tireFilter.frequency.setValueAtTime(1400, this.ctx.currentTime);
    this.tireFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

    const playTireLoop = () => {
      if (!this.ctx) return;
      this.tireNoiseNode = this.ctx.createBufferSource();
      this.tireNoiseNode.buffer = noiseBuffer;
      this.tireNoiseNode.loop = true;
      this.tireNoiseNode.connect(this.tireFilter!);
      this.tireNoiseNode.start();
    };
    playTireLoop();

    this.tireFilter.connect(this.tireGain);
    this.tireGain.connect(this.ctx.destination);
  }

  private setupWindSynth() {
    if (!this.ctx) return;
    const noiseBuffer = this.createWhiteNoiseBuffer();

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.setValueAtTime(600, this.ctx.currentTime);

    this.windNode = this.ctx.createBufferSource();
    this.windNode.buffer = noiseBuffer;
    this.windNode.loop = true;
    this.windNode.connect(windFilter);
    windFilter.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);
    this.windNode.start();
  }

  private setupNitroSynth() {
    if (!this.ctx) return;
    this.nitroGain = this.ctx.createGain();
    this.nitroGain.gain.setValueAtTime(0, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.nitroOsc = this.ctx.createOscillator();
    this.nitroOsc.type = 'sine';
    this.nitroOsc.frequency.setValueAtTime(180, this.ctx.currentTime);

    const noiseBuffer = this.createWhiteNoiseBuffer();
    this.nitroNoiseNode = this.ctx.createBufferSource();
    this.nitroNoiseNode.buffer = noiseBuffer;
    this.nitroNoiseNode.loop = true;

    this.nitroNoiseNode.connect(filter);
    this.nitroOsc.connect(filter);
    filter.connect(this.nitroGain);
    this.nitroGain.connect(this.ctx.destination);

    this.nitroOsc.start();
    this.nitroNoiseNode.start();
  }

  private setupSirenSynth() {
    if (!this.ctx) return;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sine';
    this.sirenOsc.frequency.setValueAtTime(750, this.ctx.currentTime);

    this.sirenMod = this.ctx.createOscillator();
    this.sirenMod.type = 'sine';
    this.sirenMod.frequency.setValueAtTime(0.5, this.ctx.currentTime); // LFO for wailing siren

    const modGain = this.ctx.createGain();
    modGain.gain.setValueAtTime(250, this.ctx.currentTime);

    this.sirenMod.connect(modGain);
    modGain.connect(this.sirenOsc.frequency);

    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.ctx.destination);

    this.sirenOsc.start();
    this.sirenMod.start();
  }

  // Update loop for vehicle sound effects based on speed, RPM, drift, nitro
  public updateVehicleAudio(params: {
    speedKmh: number;
    rpm: number; // 0.0 to 1.0
    gear: number;
    isDrifting: boolean;
    driftIntensity: number; // 0.0 to 1.0
    isNitroActive: boolean;
    isBraking: boolean;
  }) {
    if (!this.ctx || this.isMuted) return;

    const { speedKmh, rpm, isDrifting, driftIntensity, isNitroActive } = params;
    const now = this.ctx.currentTime;

    // Engine Pitch & Volume
    if (this.engineOsc1 && this.engineOsc2 && this.engineGain && this.engineFilter) {
      const baseFreq = 45 + rpm * 180 + (params.gear > 0 ? params.gear * 8 : 0);
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);

      const targetFilterFreq = 300 + rpm * 1800 + (isNitroActive ? 400 : 0);
      this.engineFilter.frequency.setTargetAtTime(targetFilterFreq, now, 0.05);

      const targetGain = (0.08 + rpm * 0.22 + (isNitroActive ? 0.08 : 0)) * this.volume;
      this.engineGain.gain.setTargetAtTime(targetGain, now, 0.05);
    }

    // Tire Screech Volume & Filter
    if (this.tireGain && this.tireFilter) {
      let tireVol = 0;
      if (isDrifting && speedKmh > 20) {
        tireVol = Math.min(1.0, driftIntensity * 0.45 + (speedKmh / 200) * 0.25);
      } else if (params.isBraking && speedKmh > 40) {
        tireVol = 0.25;
      }
      this.tireGain.gain.setTargetAtTime(tireVol * this.volume, now, 0.04);
      this.tireFilter.frequency.setTargetAtTime(1100 + speedKmh * 4, now, 0.05);
    }

    // Wind volume based on speed
    if (this.windGain) {
      const windVol = Math.min(0.35, (speedKmh / 350) * 0.35) * this.volume;
      this.windGain.gain.setTargetAtTime(windVol, now, 0.1);
    }

    // Nitro sound
    if (this.nitroGain) {
      const nitroVol = (isNitroActive ? 0.35 : 0) * this.volume;
      this.nitroGain.gain.setTargetAtTime(nitroVol, now, 0.04);
    }
  }

  // Turbo blow-off valve hiss when lifting throttle / gear change
  public playTurboBlowOff() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createWhiteNoiseBuffer();

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(3000, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.3);
  }

  // Collision crash impact sound
  public playCollisionSound(intensity: number = 1.0) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(25, now + 0.25);

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.createWhiteNoiseBuffer();

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);

    const gain = this.ctx.createGain();
    const peakVol = Math.min(0.6, intensity * 0.4) * this.volume;
    gain.gain.setValueAtTime(peakVol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 0.35);
    noise.stop(now + 0.35);
  }

  // Countdown beep for race start
  public playCountdownBeep(isGo: boolean = false) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isGo ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isGo ? 980 : 540, now);

    const duration = isGo ? 0.6 : 0.2;
    gain.gain.setValueAtTime(0.35 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  }

  // Speed trap flash / checkpoint passed chime
  public playCheckpointChime() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.15);

    gain.gain.setValueAtTime(0.3 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Police pursuit siren toggle
  public setPoliceSiren(active: boolean) {
    if (!this.ctx || !this.sirenGain) return;
    this.isSirenActive = active;
    const targetGain = active && !this.isMuted ? 0.25 * this.volume : 0;
    this.sirenGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
  }

  // UI button click sound
  public playUiClick() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);

    gain.gain.setValueAtTime(0.15 * this.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // Purchase cash register / upgrade sound
  public playCashSound() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    [1046.5, 1318.5, 1567.98, 2093].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.2 * this.volume, now + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.15);
    });
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && this.ctx) {
      if (this.engineGain) this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      if (this.tireGain) this.tireGain.gain.setValueAtTime(0, this.ctx.currentTime);
      if (this.windGain) this.windGain.gain.setValueAtTime(0, this.ctx.currentTime);
      if (this.nitroGain) this.nitroGain.gain.setValueAtTime(0, this.ctx.currentTime);
      if (this.sirenGain) this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }
}
