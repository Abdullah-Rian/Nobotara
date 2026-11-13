import React, { useEffect, useState } from 'react';
import { RECORD_PAGES } from '../missions/voyager/data';
import { DialogueMessage } from '../types/game';
import { apolloAudio } from '../audio/apolloAudio';
import { DialoguePanel } from './HUD';

interface VoyagerRecordProps {
  onComplete: () => void;
  onFirstPageReady?: (ready: boolean) => void;
}

export const VoyagerRecord: React.FC<VoyagerRecordProps> = ({ onComplete, onFirstPageReady }) => {
  const [page, setPage] = useState(0);
  const [beat, setBeat] = useState<'narrator' | 'science'>('narrator');
  const [ready, setReady] = useState(false);
  const current = RECORD_PAGES[page];
  const message: DialogueMessage = {
    speaker: beat === 'narrator' ? 'Narrator-02' : 'Scientific Voice',
    text: beat === 'narrator' ? current.narrator : current.science
  };

  const onTyped = () => {
    const clip = beat === 'narrator' ? current.narratorClip : current.scienceClip;
    apolloAudio.speakDialogue(message.text, message.speaker, () => {
      if (beat === 'narrator') {
        setBeat('science');
        setReady(false);
        return;
      }
      setReady(true);
    }, clip);
  };

  useEffect(() => {
    onFirstPageReady?.(page === 0 && ready);
  }, [page, ready, onFirstPageReady]);

  const next = () => {
    apolloAudio.stopSpeaking();
    if (page >= RECORD_PAGES.length - 1) {
      onComplete();
      return;
    }
    setPage(page + 1);
    setBeat('narrator');
    setReady(false);
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-[45]">
      {/* The pages scroll if the window is short; the page dots and the button stay in view at the bottom. */}
      <div className="side-sheet pointer-events-auto absolute right-4 top-1/2 flex max-h-[calc(100%-12.5rem)] w-[min(24rem,42vw)] -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-amber-500/40 bg-slate-950/92 text-center short:max-h-[calc(100%-1.5rem)] md:right-8">
        <div className="thin-scroll flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto overflow-x-hidden p-4 pb-2 short:gap-2 short:p-2">
          <img
            src="/assets/images/voyager-golden-record.jpg"
            alt="NASA photograph of the Voyager Golden Record cover"
            className="max-h-36 w-full shrink-0 rounded-md border border-amber-200/40 object-contain shadow-lg short:max-h-20"
          />
          <div className="text-xs font-mono-num font-bold tracking-wider text-amber-300">
            GOLDEN RECORD · {current.title.toUpperCase()}
          </div>
          <DialoguePanel message={message} typewriter onTyped={onTyped} className="!w-full !max-w-full" />
          <p className="text-xs leading-relaxed text-slate-400">
            The disc is carried on the spacecraft. It does not transmit back to Earth.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2 border-t border-slate-800/80 px-4 py-3 short:py-2">
          <div className="flex gap-1.5">
            {RECORD_PAGES.map((item, index) => (
              <span
                key={item.id}
                className={`h-1.5 w-6 rounded-full ${index === page ? 'bg-amber-400' : 'bg-slate-700'}`}
              />
            ))}
          </div>
          <button
            type="button"
            data-coach="voyager-record-next"
            onClick={next}
            disabled={!ready}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40"
          >
            {page === RECORD_PAGES.length - 1 ? 'CLOSE THE RECORD' : 'NEXT PAGE'}
          </button>
        </div>
      </div>
    </div>
  );
};
