import { useEffect, useState } from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import PlayApp from './PlayApp';
import { apolloAudio } from './audio/apolloAudio';
import type { GameMission } from './routes';
import { MISSION_BRIEFS } from '../missions/catalog';
import './play.css';

const GAME_FONTS =
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap';

interface PlayRouteProps {
  mission: GameMission;
  /** True when the player already clicked on this page (Get Started), so sound is allowed. */
  autostart: boolean;
  onExit: () => void;
  onMissionChange: (mission: GameMission) => void;
}

/**
 * The game, as the site shows it under /play/<mission>.
 * While it is open the page uses the game's fonts. (Zoom is off for the whole site, in main.tsx.)
 * Opened from a link with no click yet, it first asks for one tap, which lets the browser play sound.
 */
export default function PlayRoute({ mission, autostart, onExit, onMissionChange }: PlayRouteProps) {
  const [started, setStarted] = useState(autostart);

  useEffect(() => {
    document.body.classList.add('play-mode');

    if (!document.querySelector(`link[href="${GAME_FONTS}"]`)) {
      const fonts = document.createElement('link');
      fonts.rel = 'stylesheet';
      fonts.href = GAME_FONTS;
      document.head.appendChild(fonts);
    }

    return () => {
      document.body.classList.remove('play-mode');
    };
  }, []);

  const start = () => {
    apolloAudio.init();
    setStarted(true);
  };

  const names = MISSION_BRIEFS[mission];

  return (
    <div className="play-root">
      {started ? (
        <PlayApp mission={mission} onExit={onExit} onMissionChange={onMissionChange} />
      ) : (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-black p-6 text-center text-slate-100">
          <div>
            <div className="font-mono-num text-xs font-bold tracking-widest text-amber-300">{names.number}</div>
            <h1 className="mt-2 text-3xl font-extrabold md:text-4xl">{names.name}</h1>
            <p className="mt-2 text-sm text-slate-400">Turn your sound on. The mission is narrated.</p>
          </div>
          <button
            type="button"
            onClick={start}
            autoFocus
            className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-7 py-3.5 text-sm font-bold text-slate-950 shadow-lg"
          >
            <Play className="h-4 w-4 fill-slate-950" />
            START MISSION
          </button>
          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            ALL MISSIONS
          </button>
        </div>
      )}
    </div>
  );
}
