import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// The game loads only when a /play page is opened, so the home page stays light.
// Temporary for the merge: Phase 2 moves this into App with Get Started.
const PlayRoute = lazy(() => import('./play/PlayRoute.tsx'));
const isPlay = window.location.pathname === '/play' || window.location.pathname.startsWith('/play/');

createRoot(document.getElementById('root')!).render(
  isPlay ? (
    <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
      <PlayRoute />
    </Suspense>
  ) : (
    <App />
  )
);
