import React, { useState } from 'react';
import { RECORD_PAGES } from '../missions/voyager/data';
import { DialogueMessage } from '../types/game';
import { apolloAudio } from '../audio/apolloAudio';
import { DialoguePanel } from './HUD';

interface VoyagerRecordProps {
  onComplete: () => void;
}

export const VoyagerRecord: React.FC<VoyagerRecordProps> = ({ onComplete }) => {
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
    <div className="absolute inset-0 z-30 flex items-end justify-between gap-6 bg-slate-950/55 p-6 pointer-events-none md:p-10">
      <DialoguePanel message={message} typewriter onTyped={onTyped} />
      <div className="pointer-events-auto mb-8 flex w-[min(22rem,40vw)] flex-col items-center gap-4 rounded-2xl border border-amber-500/40 bg-slate-950/90 p-5 text-center">
        <div className="flex h-28 w-28 items-center justify-center rounded-full border-8 border-amber-500 bg-gradient-to-br from-amber-200 to-amber-600 shadow-lg shadow-amber-900/40">
          <div className="h-8 w-8 rounded-full bg-amber-900" />
        </div>
        <div className="text-xs font-mono-num font-bold tracking-wider text-amber-300">
          GOLDEN RECORD · {current.title.toUpperCase()}
        </div>
        <p className="text-xs leading-relaxed text-slate-400">
          The disc is carried on the spacecraft. It does not transmit back to Earth.
        </p>
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
          onClick={next}
          disabled={!ready}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-40"
        >
          {page === RECORD_PAGES.length - 1 ? 'CLOSE THE RECORD' : 'NEXT PAGE'}
        </button>
      </div>
    </div>
  );
};
