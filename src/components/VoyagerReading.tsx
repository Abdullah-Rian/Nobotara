import React from 'react';
import { VoyagerMarker, VoyagerMarkerId } from '../missions/voyager/data';

interface VoyagerReadingProps {
  marker: VoyagerMarker;
  narrationDone: boolean;
  onContinue: () => void;
}

/**
 * Classroom charts of published NASA Voyager results.
 * They are not live instrument output and they are not copied plots.
 */
export const VoyagerReading: React.FC<VoyagerReadingProps> = ({ marker, narrationDone, onContinue }) => {
  return (
    <aside className="pointer-events-auto absolute right-4 top-1/2 z-30 w-[min(22rem,40vw)] -translate-y-1/2 rounded-2xl border border-slate-700/80 bg-slate-950/92 p-4 shadow-2xl md:right-8">
      <div className="text-[10px] font-mono-num font-bold tracking-wider text-amber-300">
        {marker.name.toUpperCase()}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{marker.note}</p>
      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950 p-3">
        <Chart id={marker.id} />
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Published NASA results, drawn here as a classroom chart. Not a new live scan.
      </p>
      {narrationDone && (
        <button
          type="button"
          onClick={onContinue}
          className="mt-3 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950"
        >
          Continue
        </button>
      )}
    </aside>
  );
};

function Chart({ id }: { id: VoyagerMarkerId }) {
  if (id === 'plasma') return <PlasmaChart />;
  if (id === 'magnetic') return <MagneticChart />;
  if (id === 'particles') return <ParticleChart />;
  return <PowerChart />;
}

function PlasmaChart() {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-wider text-slate-400">ELECTRON DENSITY</div>
      <div className="mt-2 flex items-end gap-3">
        <div className="flex h-24 flex-1 items-end">
          <div className="w-full rounded-t bg-sky-400/80" style={{ height: '70%' }} />
        </div>
        <div className="pb-1 text-right">
          <div className="font-mono-num text-2xl font-bold text-sky-200">0.08</div>
          <div className="text-[10px] text-slate-400">per cm³ · 2013</div>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
        After 2012, plasma waves showed the gas getting denser. NASA reported about 0.08 electrons per cubic centimetre in 2013.
      </p>
    </div>
  );
}

function MagneticChart() {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-wider text-slate-400">MAGNETIC FIELD</div>
      <div className="mt-3 space-y-2">
        <Bar label="Heliosheath" width="38%" tone="bg-slate-500" note="weaker, changing" />
        <Bar label="Beyond" width="72%" tone="bg-amber-400" note="a few tenths of a nT" />
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
        At the boundary the field grew steadier and its direction changed. Beyond it, the strength is a few tenths of a nanotesla.
      </p>
    </div>
  );
}

function ParticleChart() {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-wider text-slate-400">AUGUST 2012 · SCHEMATIC</div>
      <svg viewBox="0 0 200 90" className="mt-2 h-24 w-full">
        <path d="M8 62 C50 60 70 58 92 54 C110 28 130 18 192 12" fill="none" stroke="#7dd3fc" strokeWidth="3" />
        <path d="M8 22 C50 24 70 28 92 34 C110 62 130 70 192 76" fill="none" stroke="#fbbf24" strokeWidth="3" />
        <line x1="96" y1="8" x2="96" y2="84" stroke="#475569" strokeDasharray="3 3" />
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500">
        <span className="text-sky-300">Galactic cosmic rays rise</span>
        <span className="text-amber-300">Heliospheric particles fall</span>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
        A sketch of the change NASA’s cosmic-ray instrument reported in August 2012. Not the raw plot.
      </p>
    </div>
  );
}

function PowerChart() {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-wider text-slate-400">ELECTRICAL POWER</div>
      <svg viewBox="0 0 200 90" className="mt-2 h-24 w-full">
        <path d="M16 16 L184 74" fill="none" stroke="#fbbf24" strokeWidth="3" />
        <circle cx="16" cy="16" r="3.5" fill="#fef3c7" />
        <text x="24" y="14" fill="#e2e8f0" fontSize="10">1977 · 470 W</text>
      </svg>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
        About 470 watts at launch. NASA reports the supply falling by roughly 4 watts a year. Not a live gauge.
      </p>
    </div>
  );
}

function Bar({ label, width, tone, note }: { label: string; width: string; tone: string; note: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] text-slate-400">
        <span>{label}</span>
        <span>{note}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${tone}`} style={{ width }} />
      </div>
    </div>
  );
}
