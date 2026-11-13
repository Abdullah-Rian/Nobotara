import { useEffect, useState } from 'react';

const HANDHELD = '(hover: none) and (pointer: coarse)';
const SHORT_HEIGHT = '(max-height: 500px)';

/** True when the viewport is a phone in landscape, not a monitor. */
export function useShortHeight() {
  const [short, setShort] = useState(() => window.matchMedia(SHORT_HEIGHT).matches);

  useEffect(() => {
    const query = window.matchMedia(SHORT_HEIGHT);
    const onChange = () => setShort(query.matches);
    onChange();
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return short;
}

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

/** Opened from the Home Screen (or installed), so already without browser bars. */
export function isInstalledApp(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia?.('(display-mode: fullscreen)').matches === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true
  );
}

/**
 * iPhone Safari has no full-screen mode for web pages (only for video). The way to play without
 * browser bars there is to add the site to the Home Screen and open it from there.
 */
export function needsHomeScreenForFullscreen(): boolean {
  if (typeof navigator === 'undefined' || canFullscreen() || isInstalledApp()) return false;
  return /iPhone|iPod/.test(navigator.userAgent);
}
