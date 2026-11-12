import { lazy, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { apolloAudio } from './play/audio/apolloAudio';
import {
  GameMission,
  SiteMission,
  gameMissionFor,
  missionFromPath,
  playPath,
  siteMissionFor
} from './play/routes';
import './index.css';

// The game loads only when a mission is opened, so the home page stays light.
const PlayRoute = lazy(() => import('./play/PlayRoute.tsx'));

/** History entries the site pushed when Get Started opened a mission. Back returns to the home page. */
const FROM_HOME = 'nobotara-from-home';

/** Did the visitor click or tap on this page yet? Browsers allow sound only after that. */
const hasUserGesture = () =>
  (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive ?? false;

function Root() {
  const [playing, setPlaying] = useState<GameMission | null>(() => missionFromPath(window.location.pathname));
  const [autostart, setAutostart] = useState(false);

  useEffect(() => {
    // Back and Forward move between the home page and the game.
    const onPopState = () => {
      const next = missionFromPath(window.location.pathname);
      setAutostart(next !== null && hasUserGesture());
      setPlaying(next);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  /** Get Started. Runs inside the click, so the game's sound is unlocked before the game loads. */
  const play = (site: SiteMission) => {
    apolloAudio.init();
    const mission = gameMissionFor(site);
    window.history.pushState({ [FROM_HOME]: true }, '', playPath(mission));
    setAutostart(true);
    setPlaying(mission);
  };

  const exit = () => {
    if (window.history.state?.[FROM_HOME]) {
      window.history.back();
      return;
    }
    // Opened from a link: there is no home page behind it, so go to one.
    const site = siteMissionFor(playing ?? 'apollo');
    window.history.pushState(null, '', site === 'apollo11' ? '/' : `/?mission=${site}`);
    setPlaying(null);
  };

  /** Next mission from an end screen: update the address without adding a Back step. */
  const missionChanged = (mission: GameMission) => {
    const path = playPath(mission);
    if (window.location.pathname + window.location.search !== path) {
      window.history.replaceState(window.history.state, '', path);
    }
  };

  if (playing) {
    return (
      <Suspense
        fallback={
          <div className="fixed inset-0 flex items-center justify-center bg-black text-xs font-semibold tracking-widest text-slate-400">
            LOADING MISSION…
          </div>
        }
      >
        <PlayRoute
          key={autostart ? 'auto' : 'gate'}
          mission={playing}
          autostart={autostart}
          onExit={exit}
          onMissionChange={missionChanged}
        />
      </Suspense>
    );
  }
  return <App onPlay={play} />;
}

/**
 * No zooming anywhere: the site and the game are laid out to fit the screen.
 * The viewport tag stops pinch zoom on Android; iOS Safari ignores it, so its pinch
 * gesture is cancelled here. Double-tap zoom is off through touch-action in the CSS.
 * On desktops, Ctrl/Cmd + wheel, + and - and 0 are cancelled too.
 */
function blockZoom() {
  const stop = (event: Event) => event.preventDefault();
  document.addEventListener('gesturestart', stop, { passive: false });
  document.addEventListener('gesturechange', stop, { passive: false });
  document.addEventListener(
    'touchmove',
    (event) => {
      if (event.touches.length > 1) event.preventDefault();
    },
    { passive: false }
  );
  window.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault();
    },
    { passive: false }
  );
  window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && ['+', '=', '-', '_', '0'].includes(event.key)) event.preventDefault();
  });
}
blockZoom();

createRoot(document.getElementById('root')!).render(<Root />);
