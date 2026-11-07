import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2, Smartphone } from 'lucide-react';
import {
  canFullscreen,
  canLockLandscape,
  isFullscreen,
  lockLandscape,
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

  useEffect(() => onDisplayCapabilityChange(() => redraw(count => count + 1)), []);

  const showFullscreen = canFullscreen();
  const showLandscape = canLockLandscape();
  if (!showFullscreen && !showLandscape) return null;

  const fullscreen = isFullscreen();
  const labelClass = labels === 'never' ? 'hidden' : labels === 'always' ? 'inline' : 'hidden sm:inline';
  const buttonClass = compact
    ? 'p-2.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 rounded-lg text-slate-300 transition-colors'
    : 'flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 rounded-md transition-colors';

  return (
    <div className="flex items-center gap-2">
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
