/**
 * Input controller managing keyboard inputs and virtual touch joystick
 * with window blur safety and edge-triggered button presses.
 */

export class GameInputManager {
  private keysHeld: Record<string, boolean> = {};
  private virtualForward: number = 0;
  private virtualTurn: number = 0;
  private virtualPitch: number = 0;
  private virtualYaw: number = 0;
  private virtualThrust: number = 0;
  private onInteractCallback?: () => void;
  private onEscapeCallback?: () => void;

  constructor() {
    this.setupKeyboardListeners();
    this.setupWindowBlurListener();
  }

  public setCallbacks(onInteract?: () => void, onEscape?: () => void) {
    this.onInteractCallback = onInteract;
    this.onEscapeCallback = onEscape;
  }

  private setupKeyboardListeners() {
    window.addEventListener('keydown', (e) => {
      this.keysHeld[e.code] = true;

      if (e.code === 'KeyE' || e.code === 'Space') {
        if (!e.repeat && this.onInteractCallback) {
          this.onInteractCallback();
        }
      }

      if (e.code === 'Escape') {
        if (!e.repeat && this.onEscapeCallback) {
          this.onEscapeCallback();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysHeld[e.code] = false;
    });
  }

  private setupWindowBlurListener() {
    window.addEventListener('blur', () => {
      this.keysHeld = {};
      this.virtualForward = 0;
      this.virtualTurn = 0;
      this.virtualPitch = 0;
      this.virtualYaw = 0;
      this.virtualThrust = 0;
    });
  }

  public setVirtualJoystick(forward: number, turn: number) {
    this.virtualForward = Math.max(-1, Math.min(1, forward));
    this.virtualTurn = Math.max(-1, Math.min(1, turn));
  }

  public setVirtualPitch(pitch: number) {
    this.virtualPitch = Math.max(-1, Math.min(1, pitch));
  }

  public setVirtualYaw(yaw: number) {
    this.virtualYaw = Math.max(-1, Math.min(1, yaw));
  }

  public setVirtualThrust(thrust: number) {
    this.virtualThrust = Math.max(-1, Math.min(1, thrust));
  }

  public getInputs(): { forward: number; turn: number } {
    let keyForward = 0;
    let keyTurn = 0;

    if (this.keysHeld['KeyW'] || this.keysHeld['ArrowUp']) keyForward += 1;
    if (this.keysHeld['KeyS'] || this.keysHeld['ArrowDown']) keyForward -= 1;
    if (this.keysHeld['KeyA'] || this.keysHeld['ArrowLeft']) keyTurn += 1;
    if (this.keysHeld['KeyD'] || this.keysHeld['ArrowRight']) keyTurn -= 1;

    // Combine keyboard and virtual joystick
    const forward = keyForward !== 0 ? keyForward : this.virtualForward;
    const turn = keyTurn !== 0 ? keyTurn : this.virtualTurn;

    return { forward, turn };
  }

  /**
   * Voyager keeps one job on each control. W/S thrust along the dish.
   * Arrow up/down and the vertical pad pitch. Arrow left/right and the
   * horizontal pad yaw. Positive pitch noses the dish up.
   */
  public getFlightInputs(): { thrust: number; yaw: number; pitch: number } {
    let thrust = 0;
    let yaw = 0;
    let pitch = 0;

    if (this.keysHeld['KeyW']) thrust += 1;
    if (this.keysHeld['KeyS']) thrust -= 1;
    if (this.keysHeld['ArrowLeft']) yaw -= 1;
    if (this.keysHeld['ArrowRight']) yaw += 1;
    if (this.keysHeld['ArrowUp']) pitch += 1;
    if (this.keysHeld['ArrowDown']) pitch -= 1;

    if (thrust === 0) thrust = this.virtualThrust;
    if (yaw === 0) yaw = this.virtualYaw;
    if (pitch === 0) pitch = this.virtualPitch;

    return {
      thrust: Math.max(-1, Math.min(1, thrust)),
      yaw: Math.max(-1, Math.min(1, yaw)),
      pitch: Math.max(-1, Math.min(1, pitch))
    };
  }
}

export const gameInputs = new GameInputManager();
