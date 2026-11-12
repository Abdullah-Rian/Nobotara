/**
 * What the visitor's connection and screen can take. Browsers without the
 * Network Information API (Safari, Firefox) count as a good connection.
 */
interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

const connection = (): NetworkInformationLike | undefined =>
  (navigator as Navigator & { connection?: NetworkInformationLike }).connection;

/** Data saver is on, or the browser measures the network as 2G or 3G. */
export function isSlowConnection(): boolean {
  const c = connection();
  if (!c) return false;
  return Boolean(c.saveData) || /(^|-)2g$|^3g$/.test(c.effectiveType ?? '');
}

/** A fast connection the browser has measured (4G or better). Unknown counts as not measured. */
export function isFastConnection(): boolean {
  const c = connection();
  return !!c && !c.saveData && c.effectiveType === '4g';
}

/** Run when the page is idle, so it does not compete with what is on screen. */
export function whenIdle(task: () => void, timeout = 2500): () => void {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (w.requestIdleCallback) {
    const id = w.requestIdleCallback(task, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(task, 1200);
  return () => window.clearTimeout(id);
}

/**
 * Hero videos come in two sizes. The full one (about 1920 px wide) only goes to
 * big screens on a measured fast connection; everyone else gets the 1280 px one,
 * which is 5 to 7 times smaller.
 */
export function heroVideoSrc(full: string): string {
  const pixelsWide = window.innerWidth * (window.devicePixelRatio || 1);
  if (pixelsWide >= 2400 && isFastConnection()) return full;
  return full.replace(/\.mp4$/, '-720.mp4');
}
