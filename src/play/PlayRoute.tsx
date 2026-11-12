import { useEffect } from 'react';
import PlayApp from './PlayApp';
import './play.css';

const GAME_VIEWPORT = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
const GAME_FONTS =
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap';

/**
 * The game, as the site shows it under /play.
 * While it is open the page uses the game's viewport (no pinch zoom, full bleed) and its fonts.
 */
export default function PlayRoute() {
  useEffect(() => {
    const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const previousViewport = viewport?.content;
    if (viewport) viewport.content = GAME_VIEWPORT;
    document.body.classList.add('play-mode');

    if (!document.querySelector(`link[href="${GAME_FONTS}"]`)) {
      const fonts = document.createElement('link');
      fonts.rel = 'stylesheet';
      fonts.href = GAME_FONTS;
      document.head.appendChild(fonts);
    }

    return () => {
      if (viewport && previousViewport) viewport.content = previousViewport;
      document.body.classList.remove('play-mode');
    };
  }, []);

  return (
    <div className="play-root">
      <PlayApp />
    </div>
  );
}
