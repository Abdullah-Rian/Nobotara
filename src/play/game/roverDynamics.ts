/**
 * How the rovers in Missions 01 and 03 drive. One model, two worlds.
 *
 * Grip comes from gravity: a wheel can only push as hard as the ground pushes back. So the
 * Moon rover (1.62 m/s², a sixth of Earth's) speeds up gently, coasts a long way and turns
 * softly, and the Mars rover (3.71 m/s², about three eighths) grips better. Hills slow the
 * rover going up and speed it going down, by each world's own gravity. The body sits on a
 * soft spring: on the Moon it floats over a crest and settles slowly.
 *
 * All rates are per second, so the feel is the same at any frame rate.
 */
import * as THREE from 'three';

export interface DriveWorld {
  /** m/s² */
  gravity: number;
  /** m/s at full throttle on flat ground */
  topSpeed: number;
  /** rad/s at full steer and speed */
  turnRate: number;
  /** How fast speed follows the throttle (1/s) */
  accelRate: number;
  /** Throttle against the motion */
  brakeRate: number;
  /** No throttle: rolling to a stop */
  coastRate: number;
  /** Body spring: natural frequency (rad/s) and damping ratio */
  springOmega: number;
  springZeta: number;
}

export const MOON_DRIVE: DriveWorld = {
  gravity: 1.62,
  topSpeed: 10.4,
  turnRate: 1.8,
  accelRate: 2.2,
  brakeRate: 3.6,
  coastRate: 1.7,
  springOmega: 7.5,
  springZeta: 0.7
};

export const MARS_DRIVE: DriveWorld = {
  gravity: 3.71,
  topSpeed: 7.4,
  turnRate: 1.55,
  accelRate: 3.2,
  brakeRate: 5.0,
  coastRate: 2.8,
  springOmega: 10,
  springZeta: 0.85
};

/** Seconds of gravity along the slope that the speed target gives up (game-tuned). */
const SLOPE_RESPONSE = 2.4;

export interface DriveState {
  velocity: number;
  /** Smoothed steering, -1..1 */
  steer: number;
}

/**
 * One step of driving. `grade` is rise over run along the heading (positive = uphill ahead).
 * `blocked` means the throttle must be ignored (the rover is at the edge of its range).
 * Returns the heading change to apply this step.
 */
export function driveStep(
  state: DriveState,
  throttle: number,
  turn: number,
  grade: number,
  world: DriveWorld,
  dt: number,
  blocked = false
): number {
  const driving = !blocked && Math.abs(throttle) > 0.05;
  let target = 0;
  if (driving) {
    // Gravity along the slope: slower up, faster down.
    const slope = world.gravity * THREE.MathUtils.clamp(grade, -0.6, 0.6) * SLOPE_RESPONSE;
    target = THREE.MathUtils.clamp(throttle * world.topSpeed - slope, -world.topSpeed * 1.2, world.topSpeed * 1.2);
  }
  const against = driving && Math.abs(state.velocity) > 0.3 && Math.sign(throttle) !== Math.sign(state.velocity);
  const rate = blocked ? world.brakeRate : !driving ? world.coastRate : against ? world.brakeRate : world.accelRate;
  state.velocity = THREE.MathUtils.damp(state.velocity, target, rate, dt);
  if (!driving && Math.abs(state.velocity) < 0.02) state.velocity = 0;

  // Steering eases in, and is softer at a standstill than on the move.
  state.steer = THREE.MathUtils.damp(state.steer, Math.abs(turn) > 0.05 ? turn : 0, 9, dt);
  if (Math.abs(state.steer) < 0.01) return 0;
  const moving = Math.min(1, Math.abs(state.velocity) / (world.topSpeed * 0.35));
  const reverse = state.velocity < -0.1 ? -1 : 1;
  return state.steer * world.turnRate * (0.55 + 0.45 * moving) * reverse * dt;
}

/**
 * The body on its suspension. It follows the ground height through a spring, but can never
 * fall faster than gravity, so over a crest at speed it floats for a moment.
 */
export class BodySpring {
  private offset = 0;
  private speed = 0;
  private lastGround: number | null = null;

  /** Returns the body's height offset from the ground height (m). */
  step(ground: number, world: DriveWorld, dt: number): number {
    if (this.lastGround === null || dt <= 0) {
      this.lastGround = ground;
      return 0;
    }
    // The ground moved under the body. The tyres and springs soak up most of it; the rest
    // reaches the body, which then settles back.
    const groundMove = ground - this.lastGround;
    this.lastGround = ground;
    this.offset -= groundMove * 0.4;
    const w = world.springOmega;
    let accel = -w * w * this.offset - 2 * world.springZeta * w * this.speed;
    // Above the ride height the springs hang loose and only gravity brings the body down,
    // scaled up a little for the game: on the Moon this is a slow float, on Mars much shorter.
    if (this.offset > 0) accel = Math.max(accel, -world.gravity * 5);
    this.speed += accel * dt;
    this.offset += this.speed * dt;
    // The suspension can only compress so far, and the body never leaves very far.
    if (this.offset < -0.06) {
      this.offset = -0.06;
      if (this.speed < 0) this.speed = 0;
    }
    if (this.offset > 0.1) {
      this.offset = 0.1;
      if (this.speed > 0) this.speed = 0;
    }
    return this.offset;
  }

  reset() {
    this.offset = 0;
    this.speed = 0;
    this.lastGround = null;
  }
}
