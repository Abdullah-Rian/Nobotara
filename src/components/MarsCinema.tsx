import React, { useEffect, useRef } from 'react';
import { RETURN_SEQUENCE } from '../missions/mars/data';

/** Names each step of the return plan while its hologram plays. */
export const PlanCaption: React.FC<{ stage: number }> = ({ stage }) => {
  const step = RETURN_SEQUENCE[stage];
  if (!step) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-20 z-20 flex justify-center px-4 short:top-16">
      <div className="max-w-xl rounded-xl border border-cyan-400/50 bg-slate-950/85 px-5 py-3 text-center shadow-xl">
        <div className="flex items-center justify-center gap-1.5">
          {RETURN_SEQUENCE.map((item, index) => (
            <span
              key={item.id}
              className={`h-1.5 w-7 rounded-full ${index <= stage ? 'bg-cyan-300' : 'bg-slate-700'}`}
            />
          ))}
        </div>
        <div className="mt-2 font-mono-num text-[11px] font-bold tracking-wider text-cyan-300">
          STEP {stage + 1} OF {RETURN_SEQUENCE.length}
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-100 md:text-base">{step.text}</div>
      </div>
    </div>
  );
};

/** The open question, written across the sky while Earth rises and the route is drawn. */
export const QuestionTitle: React.FC<{ progress: number }> = ({ progress }) => {
  const fadeIn = Math.min(1, Math.max(0, (progress - 0.12) / 0.12));
  const fadeOut = Math.min(1, Math.max(0, (0.99 - progress) / 0.05));
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-[16%] z-20 px-6 text-center short:top-[19%]"
      style={{ opacity: Math.min(fadeIn, fadeOut) }}
    >
      <div className="font-mono-num text-xs font-bold tracking-[0.3em] text-amber-300">THE OPEN QUESTION</div>
      <h2 className="mt-3 text-3xl font-extrabold tracking-wide text-slate-50 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] md:text-5xl short:text-2xl">
        DID LIFE EVER EXIST ON MARS?
      </h2>
    </div>
  );
};

export interface TrioLabel {
  name: string;
  x: number;
  y: number;
  visible: boolean;
}

/** Names under the Moon, Voyager 1 and Mars in the last shot. */
export const TrioLabels: React.FC<{ read: () => readonly TrioLabel[] | undefined }> = ({ read }) => {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const labels = read();
      refs.current.forEach((element, index) => {
        if (!element) return;
        const label = labels?.[index];
        if (!label?.visible) {
          element.style.opacity = '0';
          return;
        }
        element.textContent = label.name;
        element.style.opacity = '1';
        element.style.transform = `translate(${label.x}px, ${label.y}px) translate(-50%, 0)`;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [read]);

  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      {[0, 1, 2].map(index => (
        <div
          key={index}
          ref={element => {
            refs.current[index] = element;
          }}
          className="absolute left-0 top-0 whitespace-nowrap rounded-md border border-slate-600/70 bg-slate-950/75 px-2.5 py-1 font-mono-num text-[11px] font-bold tracking-wider text-slate-100 transition-opacity duration-700"
          style={{ opacity: 0 }}
        />
      ))}
    </div>
  );
};

/** The closing sentence, set over the three missions. */
export const LastWord: React.FC<{ text: string; progress: number }> = ({ text, progress }) => (
  <div
    className="pointer-events-none absolute inset-x-0 top-[12%] z-20 px-6 text-center short:top-[19%]"
    style={{ opacity: Math.min(1, Math.max(0, (progress - 0.8) / 0.1)) }}
  >
    <p className="mx-auto max-w-2xl text-lg italic leading-relaxed text-slate-100 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] md:text-2xl short:text-base">
      “{text}”
    </p>
  </div>
);
