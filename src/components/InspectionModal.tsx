import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Volume2 } from 'lucide-react';
import { ArtifactInfo, DialogueMessage } from '../types/game';
import { apolloAudio } from '../audio/apolloAudio';
import { DialoguePanel } from './HUD';

export interface PlaqueScreenPoint {
  x: number;
  y: number;
  visible: boolean;
}

interface InspectionModalProps {
  artifact: ArtifactInfo;
  dialogue: DialogueMessage | null;
  narrationDone: boolean;
  onTyped: () => void;
  onClose: () => void;
  readPlaquePoint?: () => PlaqueScreenPoint | undefined;
}

/** Photograph and leader. Positions update on the elements themselves so the dialogue does not re-render. */
const PlaqueCallout: React.FC<{ readPoint: () => PlaqueScreenPoint | undefined }> = ({ readPoint }) => {
  const photoRef = useRef<HTMLImageElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const point = readPoint();
      const photo = photoRef.current;
      const line = lineRef.current;
      const dot = dotRef.current;
      if (point?.visible && photo && line && dot) {
        const rect = photo.getBoundingClientRect();
        const x1 = rect.right - rect.width * 0.08;
        const y1 = rect.top + rect.height * 0.42;
        line.setAttribute('x1', String(x1));
        line.setAttribute('y1', String(y1));
        line.setAttribute('x2', String(point.x));
        line.setAttribute('y2', String(point.y));
        dot.setAttribute('cx', String(point.x));
        dot.setAttribute('cy', String(point.y));
        line.style.opacity = '1';
        dot.style.opacity = '1';
      } else if (line && dot) {
        line.style.opacity = '0';
        dot.style.opacity = '0';
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [readPoint]);

  return (
    <>
      <svg className="fixed inset-0 z-20 h-full w-full pointer-events-none" aria-hidden="true">
        <line ref={lineRef} stroke="#f8fafc" strokeWidth="1.5" strokeLinecap="round" />
        <circle ref={dotRef} r="4.5" fill="#f8fafc" />
      </svg>
      <img
        ref={photoRef}
        src="/assets/images/apollo11-plaque.jpg"
        alt="Apollo 11 commemorative plaque, with the inscription, Earth hemispheres, and signatures"
        className="pointer-events-none ml-16 w-[min(22rem,46vw)] max-h-[40vh] origin-bottom-left -rotate-6 rounded-md border border-slate-200/90 bg-slate-100 object-contain shadow-2xl"
      />
    </>
  );
};

export const InspectionModal: React.FC<InspectionModalProps> = ({
  artifact,
  dialogue,
  narrationDone,
  onTyped,
  onClose,
  readPlaquePoint
}) => {
  const [playingHistoricalVoice, setPlayingHistoricalVoice] = useState(false);

  const handlePlayOneSmallStep = () => {
    setPlayingHistoricalVoice(true);
    apolloAudio.speakDialogue(
      "That's one small step for man, one giant leap for mankind.",
      'Neil Armstrong (Narrator-01)',
      () => setPlayingHistoricalVoice(false)
    );
  };

  return (
    <div className="absolute left-6 bottom-16 z-30 flex flex-col items-start gap-3 pointer-events-none">
      {artifact.id === 'plaque' && readPlaquePoint && <PlaqueCallout readPoint={readPlaquePoint} />}

      {dialogue && (
        <div className="pointer-events-auto">
          <DialoguePanel message={dialogue} typewriter={!narrationDone} onTyped={onTyped} />
        </div>
      )}

      {narrationDone && artifact.id === 'plaque' && (
        <div className="pointer-events-auto w-[min(36rem,calc(100vw-3rem))] bg-slate-950/90 border border-slate-700/80 rounded-lg p-4 text-center space-y-3">
          <div className="text-[11px] font-mono-num text-slate-400">STAINLESS STEEL INSCRIPTION</div>
          <div className="text-sm md:text-base font-bold tracking-wider text-slate-100 font-mono-num leading-relaxed">
            HERE MEN FROM THE PLANET EARTH<br />
            FIRST SET FOOT UPON THE MOON<br />
            JULY 1969, A.D.<br />
            WE CAME IN PEACE FOR ALL MANKIND
          </div>
          <button
            onClick={handlePlayOneSmallStep}
            disabled={playingHistoricalVoice}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs"
          >
            <Volume2 className="w-4 h-4" />
            {playingHistoricalVoice ? 'PLAYING HISTORIC AUDIO...' : "LISTEN: THAT'S ONE SMALL STEP"}
          </button>
        </div>
      )}

      {narrationDone && (
        <button
          onClick={onClose}
          className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm"
        >
          <span>RESUME EXPLORATION</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
