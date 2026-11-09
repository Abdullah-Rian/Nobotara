import React from 'react';
import {
  LIGHT_SPEED_KM_S,
  VOYAGER_EARTH_RANGE_KM,
  VOYAGER_LIGHT_DAY_BILLION_KM,
  VOYAGER_LIGHT_DAY_DATE,
  VOYAGER_RANGE_DATE
} from '../missions/voyager/data';

interface VoyagerSignalSentProps {
  onContinue: () => void;
}

const AU_KM = 149_597_870.7;

function lightTime(km: number) {
  const total = Math.round(km / LIGHT_SPEED_KM_S);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return { hours, minutes };
}

export const VoyagerSignalSent: React.FC<VoyagerSignalSentProps> = ({ onContinue }) => {
  const travel = lightTime(VOYAGER_EARTH_RANGE_KM);
  const billionKm = VOYAGER_EARTH_RANGE_KM / 1_000_000_000;
  const au = VOYAGER_EARTH_RANGE_KM / AU_KM;

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      <aside className="pointer-events-auto absolute right-4 top-1/2 w-[min(24rem,42vw)] -translate-y-1/2 rounded-2xl border border-emerald-400/40 bg-slate-950/95 p-5 shadow-2xl md:right-8">
        <div className="text-xs font-mono-num font-bold tracking-wider text-emerald-300">
          TELEMETRY SENT
        </div>
        <h2 className="mt-2 text-xl font-bold text-slate-100">The signal is on its way</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          The archive left the dish as a radio signal. It travels at the speed of light, and it still has to cross the distance from Voyager 1 to Earth.
        </p>
        <dl className="mt-4 grid gap-3">
          <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
            <dt className="text-[10px] font-bold tracking-wider text-slate-500">DISTANCE FROM EARTH</dt>
            <dd className="mt-1 font-mono-num text-2xl font-bold text-slate-100">{billionKm.toFixed(2)}</dd>
            <dd className="text-xs text-slate-400">billion km · {au.toFixed(1)} AU</dd>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2">
            <dt className="text-[10px] font-bold tracking-wider text-slate-500">ONE-WAY LIGHT TIME</dt>
            <dd className="mt-1 font-mono-num text-2xl font-bold text-slate-100">{travel.hours} h {travel.minutes} min</dd>
            <dd className="text-xs text-slate-400">for the telemetry to reach Earth</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-slate-400">
          On {VOYAGER_RANGE_DATE}, Voyager 1 was this far from Earth. On {VOYAGER_LIGHT_DAY_DATE} it reaches one light-day, {VOYAGER_LIGHT_DAY_BILLION_KM} billion km, so a radio signal will need a full day.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          This transmission is part of the game. The distance and the travel time are from Voyager 1&apos;s tracked path.
        </p>
        <button
          type="button"
          onClick={onContinue}
          className="mt-5 w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950"
        >
          CONTINUE
        </button>
      </aside>
    </div>
  );
};
