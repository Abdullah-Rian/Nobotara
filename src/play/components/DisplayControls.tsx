import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2, Share, Smartphone, SquarePlus, X } from 'lucide-react';
import {
  canFullscreen,
  canLockLandscape,
  isFullscreen,
  lockLandscape,
  needsHomeScreenForFullscreen,
  onDisplayCapabilityChange,
  toggleFullscreen
} from '../utils/displayMode';

interface DisplayControlsProps {
  labels?: 'auto' | 'always' | 'never';
  compact?: boolean;
}

export const DisplayControls: React.FC<DisplayControlsProps> = ({
  labels = 'auto',
  compact = false
}) => {
  const [, redraw] = useState(0);
  const [showHow, setShowHow] = useState(false);

  useEffect(() => onDisplayCapabilityChange(() => redraw(count => count + 1)), []);

  const showFullscreen = canFullscreen();
  const showLandscape = canLockLandscape();
  const showHomeScreenHelp = needsHomeScreenForFullscreen();
  if (!showFullscreen && !showLandscape && !showHomeScreenHelp) return null;

  const fullscreen = isFullscreen();
  const labelClass = labels === 'never' ? 'hidden' : labels === 'always' ? 'inline' : 'hidden sm:inline';
  const buttonClass = compact
    ? 'p-2.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 rounded-lg text-slate-300 transition-colors'
    : 'flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 rounded-md transition-colors';

  return (
    <div className="relative flex items-center gap-2">
      {showLandscape && (
        <button
          type="button"
          onClick={() => { void lockLandscape(); }}
          className={buttonClass}
          title="Turn landscape"
        >
          <Smartphone className="w-4 h-4 rotate-90 text-amber-400" />
          <span className={labelClass}>LANDSCAPE</span>
        </button>
      )}
      {showHomeScreenHelp && (
        <button
          type="button"
          onClick={() => setShowHow(value => !value)}
          aria-expanded={showHow}
          className={buttonClass}
          title="Full screen"
        >
          <Maximize2 className="w-4 h-4 text-slate-200" />
          <span className={labelClass}>FULL SCREEN</span>
        </button>
      )}
      {showHomeScreenHelp && showHow && (
        <div
          role="dialog"
          aria-label="Full screen on iPhone"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-slate-700 bg-slate-950/95 p-3 text-left text-xs leading-relaxed text-slate-200 shadow-2xl"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-bold text-slate-100">Full screen on iPhone</div>
            <button type="button" onClick={() => setShowHow(false)} aria-label="Close" className="-mr-1 -mt-1 p-1 text-slate-400">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-slate-400">Safari can't hide its bars for a game. Add Nobotara71 to your Home Screen and open it from there:</p>
          <ol className="mt-2 space-y-1.5">
            <li className="flex items-center gap-2"><Share className="h-4 w-4 shrink-0 text-sky-300" /> Tap Share in Safari</li>
            <li className="flex items-center gap-2"><SquarePlus className="h-4 w-4 shrink-0 text-sky-300" /> Tap Add to Home Screen</li>
            <li className="flex items-center gap-2"><Maximize2 className="h-4 w-4 shrink-0 text-sky-300" /> Open Nobotara71 from the Home Screen</li>
          </ol>
        </div>
      )}
      {showFullscreen && (
        <button
          type="button"
          onClick={() => { void toggleFullscreen().catch(() => undefined); }}
          className={buttonClass}
          title={fullscreen ? 'Exit full screen' : 'Full screen'}
        >
          {fullscreen
            ? <Minimize2 className="w-4 h-4 text-slate-200" />
            : <Maximize2 className="w-4 h-4 text-slate-200" />}
          <span className={labelClass}>{fullscreen ? 'EXIT FULL' : 'FULL SCREEN'}</span>
        </button>
      )}
    </div>
  );
};
