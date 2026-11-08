import React, { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';

interface NasaLiveUpdatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAskSpaceAI?: (query: string) => void;
}

interface SpotlightMission {
  id: string;
  tabLabel: string;
  location: string;
  timeAgo: string;
  title: string;
  summary: string;
  imageUrl: string;
  imageAlt: string;
  metric1: { label: string; value: string; color?: string };
  metric2: { label: string; value: string; color?: string };
  suggestedPrompt: string;
}

const SPOTLIGHT_MISSIONS: SpotlightMission[] = [
  {
    id: 'artemis',
    tabLabel: 'Artemis II',
    location: 'KENNEDY SPACE CENTER • LC-39B',
    timeAgo: '12m ago',
    title: 'SLS Core Stage & Orion Complete Integrated Avionics Power-On',
    summary:
      'NASA exploration ground systems verified end-to-end communication linking Orion to the Deep Space Network. Crew manual translational hand-controller overrides confirmed nominal for the planned 10-day lunar free-return trajectory.',
    imageUrl: '/manus-storage/apollo11-moon-button.png',
    imageAlt: 'Artemis Lunar Trajectory & SLS',
    metric1: { label: 'Trajectory', value: 'Hybrid Free-Return' },
    metric2: { label: 'Lunar Alt', value: '7,400 km (Far Side)', color: 'text-cyan-400' },
    suggestedPrompt: 'What orbital trajectory will Artemis II take around the lunar far side?',
  },
  {
    id: 'clipper',
    tabLabel: 'Europa Clipper',
    location: 'DEEP SPACE • EN ROUTE TO JUPITER',
    timeAgo: '48m ago',
    title: '8.5-Meter Magnetometer Boom Successfully Latched in Deep Space',
    summary:
      'JPL flight controllers confirmed full latch deployment of the 8.5-meter boom housing three fluxgate sensors for the ECM instrument, designed to isolate Europa’s subsurface saline ocean induction signal from spacecraft magnetic noise.',
    imageUrl: '/manus-storage/voyager-1-button_0ba1923d.png',
    imageAlt: 'Europa Clipper Magnetometer Boom',
    metric1: { label: 'Heliocentric Dist', value: '1.18 AU from Sun' },
    metric2: { label: 'Cruising Speed', value: '28.4 km/s', color: 'text-cyan-400' },
    suggestedPrompt: 'How does Europa Clipper use magnetometer sensors to detect a subsurface ocean?',
  },
  {
    id: 'jwst',
    tabLabel: 'JWST',
    location: 'SUN-EARTH L2 HALO ORBIT',
    timeAgo: '2h ago',
    title: 'Corroborates High-Redshift (z = 14.32) Luminous Cosmic Dawn Galaxy',
    summary:
      'NIRSpec and MIRI instruments corroborated pristine starlight emitted just 290 million years post-Big Bang in protogalaxy JADES-GS-z14-0, prompting refined cosmological models of early Population III star enrichment.',
    imageUrl: '/manus-storage/earth-still.jpg',
    imageAlt: 'James Webb Space Telescope Deep Cosmic Observation',
    metric1: { label: 'Spectral Redshift', value: 'z = 14.32' },
    metric2: { label: 'Cryo Temp', value: '38.2 K (−235°C)', color: 'text-cyan-400' },
    suggestedPrompt: 'Why does finding carbon at redshift z = 14.32 challenge standard cosmic evolution models?',
  },
  {
    id: 'perseverance',
    tabLabel: 'Perseverance',
    location: 'MARS • JEZERO CRATER DELTA',
    timeAgo: '5h ago',
    title: 'Rock Core Sample #25 Hermetically Sealed at Neretva Vallis Margin',
    summary:
      'SHERLOC and PIXL instruments confirmed organic-carbonaceous signatures and millimeter-scale leopard spots in an ancient river delta mudstone, sealed in a titanium sample tube for Mars Sample Return.',
    imageUrl: '/manus-storage/msr-button.png',
    imageAlt: 'Perseverance Rover on Mars',
    metric1: { label: 'Core Sealed', value: 'Tube #25 of 38' },
    metric2: { label: 'Crater Elevation', value: '+298m Margin', color: 'text-cyan-400' },
    suggestedPrompt: 'What biosignature evidence did Perseverance find in the Cheyava Falls rock sample?',
  },
];

export const NasaLiveUpdatesModal: React.FC<NasaLiveUpdatesModalProps> = ({
  isOpen,
  onClose,
  onAskSpaceAI,
}) => {
  const [activeTab, setActiveTab] = useState<string>('artemis');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentMission =
    SPOTLIGHT_MISSIONS.find((m) => m.id === activeTab) || SPOTLIGHT_MISSIONS[0];

  const handleAnalyze = () => {
    onClose();
    if (onAskSpaceAI) {
      onAskSpaceAI(currentMission.suggestedPrompt);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-text">
      {/* Concept B: Spotlight Capsule with Small Image */}
      <div className="relative w-full max-w-xl rounded-3xl bg-[#090d16]/95 border border-white/[0.08] shadow-[0_24px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl p-6 sm:p-7 z-10 animate-in zoom-in-95 duration-150">
        
        {/* Header with Live Badge and Close */}
        <div className="flex items-center justify-between mb-4 select-none">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 font-mono text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_#f59e0b]" />
            NASA Telemetry • Live Missions
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quiet Horizontal Pill Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-5 select-none">
          {SPOTLIGHT_MISSIONS.map((m) => {
            const isActive = m.id === activeTab;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveTab(m.id)}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-white/[0.1] text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m.tabLabel}
              </button>
            );
          })}
        </div>

        {/* Active Spotlight Card */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
          {/* Top Row: Mission info + Small Elegant Image */}
          <div className="flex items-start justify-between gap-4 mb-3.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mb-1.5">
                <span className="text-[#38bdf8] font-semibold">{currentMission.location}</span>
                <span className="text-slate-600">•</span>
                <span>{currentMission.timeAgo}</span>
              </div>

              <h3 className="text-base font-semibold text-white tracking-tight leading-snug">
                {currentMission.title}
              </h3>
            </div>

            {/* Small Elegant Image (Compact, Rounded, Subtle Border) */}
            <div className="relative w-28 h-20 shrink-0 rounded-xl overflow-hidden border border-white/10 bg-slate-900 shadow-md">
              <img
                src={currentMission.imageUrl}
                alt={currentMission.imageAlt}
                className="w-full h-full object-cover brightness-95 hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.src = '/manus-storage/apollo11-still.jpg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Clean Description */}
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            {currentMission.summary}
          </p>

          {/* 2 Clean Key Metrics */}
          <div className="grid grid-cols-2 gap-3 mb-4 select-none">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                {currentMission.metric1.label}
              </span>
              <span className={`text-sm font-semibold font-mono mt-0.5 block ${currentMission.metric1.color || 'text-white'}`}>
                {currentMission.metric1.value}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                {currentMission.metric2.label}
              </span>
              <span className={`text-sm font-semibold font-mono mt-0.5 block ${currentMission.metric2.color || 'text-cyan-400'}`}>
                {currentMission.metric2.value}
              </span>
            </div>
          </div>

          {/* Full-width Cyan Gradient Action Button */}
          <button
            type="button"
            onClick={handleAnalyze}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:brightness-110 active:scale-98 text-slate-950 font-semibold text-xs transition shadow-[0_0_20px_rgba(6,182,212,0.35)] flex items-center justify-center gap-2 cursor-pointer select-none"
          >
            <span>Analyze Mission with SpaceAI</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quiet Minimal Footer */}
        <div className="pt-4 mt-3 flex items-center justify-between text-[11px] font-mono text-slate-500 select-none">
          <span>NOBOTARA71 • Gemini 3.8 Flash</span>
          <span>4 Telemetry Packets Synced</span>
        </div>
      </div>
    </div>
  );
};
