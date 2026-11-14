/**
 * A clock that stops while the page is hidden (another app, the home screen, the screen locked).
 *
 * Browsers stop drawing a hidden page, but its timers keep running (Android Chrome even keeps the sound
 * going). Story timing, cutscene progress and the engines' clocks use this instead of performance.now(),
 * so a player who switches away comes back to the same moment, not to a mission that went on without them.
 */

let hiddenSince: number | null = null;
let hiddenTotal = 0;
const listeners = new Set<(hidden: boolean) => void>();

function isPageHidden() {
  return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

if (typeof document !== 'undefined') {
  if (isPageHidden()) hiddenSince = performance.now();
  document.addEventListener('visibilitychange', () => {
    const hidden = isPageHidden();
    if (hidden && hiddenSince === null) hiddenSince = performance.now();
    if (!hidden && hiddenSince !== null) {
      hiddenTotal += performance.now() - hiddenSince;
      hiddenSince = null;
    }
    listeners.forEach(listener => listener(hidden));
  });
}

export const gameClock = {
  /** Milliseconds, like performance.now(), but standing still while the page is hidden. */
  now(): number {
    const real = performance.now();
    return real - hiddenTotal - (hiddenSince !== null ? real - hiddenSince : 0);
  },

  hidden(): boolean {
    return hiddenSince !== null;
  },

  /** Called with true when the page is hidden and false when it is back. Returns an unsubscribe function. */
  onVisibility(listener: (hidden: boolean) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Resolves at once if the page is showing, otherwise when it is shown again. */
  whenVisible(): Promise<void> {
    if (!isPageHidden()) return Promise.resolve();
    return new Promise(resolve => {
      const off = gameClock.onVisibility(hidden => {
        if (hidden) return;
        off();
        resolve();
      });
    });
  }
};

/**
 * setTimeout counted in game time: it doesn't run down while the page is hidden.
 * Returns a function that cancels it.
 */
export function gameTimeout(callback: () => void, ms: number): () => void {
  const deadline = gameClock.now() + ms;
  let timer: number | undefined;
  let finished = false;
  const arm = () => {
    window.clearTimeout(timer);
    if (finished || gameClock.hidden()) return;
    timer = window.setTimeout(() => {
      if (finished || gameClock.hidden()) return;
      const left = deadline - gameClock.now();
      if (left > 1) {
        arm();
        return;
      }
      finished = true;
      off();
      callback();
    }, Math.max(0, deadline - gameClock.now()));
  };
  const off = gameClock.onVisibility(hidden => {
    if (!hidden) arm();
    else window.clearTimeout(timer);
  });
  arm();
  return () => {
    finished = true;
    window.clearTimeout(timer);
    off();
  };
}
