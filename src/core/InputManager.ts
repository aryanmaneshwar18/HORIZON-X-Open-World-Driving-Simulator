export interface InputState {
  throttle: number;   // 0.0 to 1.0
  brake: number;      // 0.0 to 1.0
  steer: number;      // -1.0 (left) to 1.0 (right)
  handbrake: boolean;
  nitro: boolean;
  reset: boolean;
  cameraToggle: boolean;
  mapToggle: boolean;
  pauseToggle: boolean;
  debugToggle: boolean;
  cheatCredits: boolean;
  cheatUnlock: boolean;
  cheatWeather: boolean;
}

export class InputManager {
  private keys: Record<string, boolean> = {};
  private virtualThrottle: number = 0;
  private virtualBrake: number = 0;
  private virtualSteer: number = 0;
  private virtualHandbrake: boolean = false;
  private virtualNitro: boolean = false;

  private onResetCallback?: () => void;
  private onCameraToggleCallback?: () => void;
  private onMapToggleCallback?: () => void;
  private onPauseToggleCallback?: () => void;
  private onDebugToggleCallback?: () => void;
  private onCheatCreditsCallback?: () => void;
  private onCheatUnlockCallback?: () => void;
  private onCheatWeatherCallback?: () => void;

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code) this.keys[e.code] = true;
      if (e.key) this.keys[e.key.toLowerCase()] = true;

      // Handle one-shot triggers
      const isR = e.code === 'KeyR' || e.key?.toLowerCase() === 'r';
      const isC = e.code === 'KeyC' || e.key?.toLowerCase() === 'c';
      const isM = e.code === 'KeyM' || e.key?.toLowerCase() === 'm';

      if (isR && !e.repeat) {
        this.onResetCallback?.();
      } else if (isC && !e.repeat) {
        this.onCameraToggleCallback?.();
      } else if (isM && !e.repeat) {
        this.onMapToggleCallback?.();
      } else if (e.code === 'Escape' && !e.repeat) {
        this.onPauseToggleCallback?.();
      } else if (e.code === 'F1') {
        e.preventDefault();
        this.onDebugToggleCallback?.();
      } else if (e.code === 'F2') {
        e.preventDefault();
        this.onCheatCreditsCallback?.();
      } else if (e.code === 'F3') {
        e.preventDefault();
        this.onCheatUnlockCallback?.();
      } else if (e.code === 'F5') {
        if (e.ctrlKey) return;
        e.preventDefault();
        this.onCheatWeatherCallback?.();
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      if (e.code) this.keys[e.code] = false;
      if (e.key) this.keys[e.key.toLowerCase()] = false;
    });

    // Reset keys if window loses focus
    window.addEventListener('blur', () => {
      this.keys = {};
    });
  }

  public getInput(): InputState {
    // Keyboard mapping supporting QWERTY, AZERTY, and Arrow Keys
    const isW = !!(this.keys['KeyW'] || this.keys['w'] || this.keys['ArrowUp'] || this.keys['KeyZ'] || this.keys['z']);
    const isS = !!(this.keys['KeyS'] || this.keys['s'] || this.keys['ArrowDown']);
    const isA = !!(this.keys['KeyA'] || this.keys['a'] || this.keys['ArrowLeft'] || this.keys['KeyQ'] || this.keys['q']);
    const isD = !!(this.keys['KeyD'] || this.keys['d'] || this.keys['ArrowRight']);
    const isSpace = !!(this.keys['Space'] || this.keys[' ']);
    const isShift = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.keys['shift']);

    let throttle = isW ? 1.0 : 0.0;
    let brake = isS ? 1.0 : 0.0;
    let steer = 0.0;
    if (isA) steer -= 1.0;
    if (isD) steer += 1.0;

    // Merge virtual touch controls
    throttle = Math.max(throttle, this.virtualThrottle);
    brake = Math.max(brake, this.virtualBrake);
    if (Math.abs(this.virtualSteer) > 0.01) {
      steer = this.virtualSteer;
    }
    const handbrake = isSpace || this.virtualHandbrake;
    const nitro = isShift || this.virtualNitro;

    return {
      throttle,
      brake,
      steer,
      handbrake,
      nitro,
      reset: !!this.keys['KeyR'],
      cameraToggle: !!this.keys['KeyC'],
      mapToggle: !!this.keys['KeyM'],
      pauseToggle: !!this.keys['Escape'],
      debugToggle: !!this.keys['F1'],
      cheatCredits: !!this.keys['F2'],
      cheatUnlock: !!this.keys['F3'],
      cheatWeather: !!this.keys['F5'],
    };
  }

  // Virtual control setters for mobile/touch UI
  public setVirtualThrottle(val: number) { this.virtualThrottle = val; }
  public setVirtualBrake(val: number) { this.virtualBrake = val; }
  public setVirtualSteer(val: number) { this.virtualSteer = val; }
  public setVirtualHandbrake(val: boolean) { this.virtualHandbrake = val; }
  public setVirtualNitro(val: boolean) { this.virtualNitro = val; }

  // Callbacks
  public onReset(cb: () => void) { this.onResetCallback = cb; }
  public onCameraToggle(cb: () => void) { this.onCameraToggleCallback = cb; }
  public onMapToggle(cb: () => void) { this.onMapToggleCallback = cb; }
  public onPauseToggle(cb: () => void) { this.onPauseToggleCallback = cb; }
  public onDebugToggle(cb: () => void) { this.onDebugToggleCallback = cb; }
  public onCheatCredits(cb: () => void) { this.onCheatCreditsCallback = cb; }
  public onCheatUnlock(cb: () => void) { this.onCheatUnlockCallback = cb; }
  public onCheatWeather(cb: () => void) { this.onCheatWeatherCallback = cb; }
}
