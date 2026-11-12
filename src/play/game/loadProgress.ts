/**
 * Download progress for the models a mission loads, in bytes, for the loading bar.
 *
 * The engines call GLTFLoader.load() in many places without a progress callback, so this
 * wraps load() once and adds up every model's bytes. Nothing else about loading changes.
 */
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface LoadState {
  loaded: number;
  total: number;
  active: number;
}

type Listener = (state: LoadState) => void;

const files = new Map<string, { loaded: number; total: number; done: boolean }>();
const listeners = new Set<Listener>();
let nextId = 0;

function emit() {
  let loaded = 0;
  let total = 0;
  let active = 0;
  // Finished files stay in the sums until the whole batch is done, so the bar only moves forward.
  for (const file of files.values()) {
    const size = Math.max(file.total, file.loaded);
    total += size;
    if (file.done) {
      loaded += size;
    } else {
      active += 1;
      loaded += file.loaded;
    }
  }
  const state = { loaded, total, active };
  listeners.forEach((listener) => listener(state));
  // Forget finished downloads, so the next batch starts from zero.
  if (active === 0) files.clear();
}

let patched = false;
function patch() {
  if (patched) return;
  patched = true;
  const original = GLTFLoader.prototype.load;
  GLTFLoader.prototype.load = function (url, onLoad, onProgress, onError) {
    const id = `${url}#${nextId++}`;
    files.set(id, { loaded: 0, total: 0, done: false });
    emit();
    const finish = () => {
      const file = files.get(id);
      if (file) file.done = true;
      emit();
    };
    return original.call(
      this,
      url,
      (gltf) => {
        finish();
        onLoad(gltf);
      },
      (event) => {
        const file = files.get(id);
        if (file) {
          file.loaded = event.loaded;
          file.total = event.lengthComputable ? event.total : 0;
          emit();
        }
        onProgress?.(event);
      },
      (error) => {
        finish();
        onError?.(error);
      }
    );
  };
}

/** Follow model downloads. Returns the unsubscribe function. */
export function onLoadProgress(listener: Listener): () => void {
  patch();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Patch as soon as the game code loads, before any engine starts a download.
patch();
