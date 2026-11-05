/**
 * Input controller managing keyboard inputs and virtual touch joystick
 * with window blur safety and edge-triggered button presses.
 */

export class GameInputManager {
  private keysHeld: Record<string, boolean> = {};
  private virtualForward: number = 0;
  private virtualTurn: number = 0;
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
    });
  }

  public setVirtualJoystick(forward: number, turn: number) {
    this.virtualForward = Math.max(-1, Math.min(1, forward));
    this.virtualTurn = Math.max(-1, Math.min(1, turn));
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
}

export const gameInputs = new GameInputManager();
