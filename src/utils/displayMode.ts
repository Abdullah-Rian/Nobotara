const HANDHELD = '(hover: none) and (pointer: coarse)';

let landscapeLockRejected = false;

type WebkitDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

export function isHandheld(): boolean {
  return window.matchMedia(HANDHELD).matches;
}

export function isPortraitHandheld(): boolean {
  return window.matchMedia(`${HANDHELD} and (orientation: portrait)`).matches;
}

export function onOrientationChange(listener: () => void): () => void {
  const portrait = window.matchMedia('(orientation: portrait)');
  const handheld = window.matchMedia(HANDHELD);
  portrait.addEventListener('change', listener);
  handheld.addEventListener('change', listener);
  window.addEventListener('resize', listener);
  screen.orientation?.addEventListener('change', listener);
  return () => {
    portrait.removeEventListener('change', listener);
    handheld.removeEventListener('change', listener);
    window.removeEventListener('resize', listener);
    screen.orientation?.removeEventListener('change', listener);
  };
}

export function canFullscreen(): boolean {
  const doc = document as WebkitDocument;
  return document.fullscreenEnabled === true || doc.webkitFullscreenEnabled === true;
}

export function isFullscreen(): boolean {
  const doc = document as WebkitDocument;
  return document.fullscreenElement != null || doc.webkitFullscreenElement != null;
}

export async function toggleFullscreen(): Promise<boolean> {
  const doc = document as WebkitDocument;
  if (isFullscreen()) {
    if (document.exitFullscreen) await document.exitFullscreen();
    else await doc.webkitExitFullscreen?.();
    return false;
  }
  const root = document.documentElement as WebkitElement;
  if (root.requestFullscreen) await root.requestFullscreen();
  else await root.webkitRequestFullscreen?.();
  return true;
}

export function canLockLandscape(): boolean {
  if (landscapeLockRejected || !isHandheld()) return false;
  return typeof screen.orientation?.lock === 'function';
}

function rejectLandscapeLock() {
  if (landscapeLockRejected) return;
  landscapeLockRejected = true;
  window.dispatchEvent(new Event('nobotara-display'));
}

/** Enter fullscreen when the browser requires it, then lock landscape. */
export async function lockLandscape(): Promise<boolean> {
  if (!canLockLandscape()) return false;
  const lock = screen.orientation?.lock;
  if (!lock) return false;
  try {
    if (!isFullscreen() && canFullscreen()) {
      try {
        await toggleFullscreen();
      } catch {
        // Android still needs the lock attempt when fullscreen is already active.
      }
    }
    await lock.call(screen.orientation, 'landscape');
    return true;
  } catch {
    rejectLandscapeLock();
    return false;
  }
}

export function onDisplayCapabilityChange(listener: () => void): () => void {
  const onFull = () => listener();
  window.addEventListener('nobotara-display', listener);
  document.addEventListener('fullscreenchange', onFull);
  document.addEventListener('webkitfullscreenchange', onFull);
  return () => {
    window.removeEventListener('nobotara-display', listener);
    document.removeEventListener('fullscreenchange', onFull);
    document.removeEventListener('webkitfullscreenchange', onFull);
  };
}
