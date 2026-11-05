import React, { useState, useEffect } from 'react';
import { X, Zap, Volume2, ArrowRight, ShieldCheck, Info, Camera, Eye, Activity } from 'lucide-react';
import { ArtifactInfo } from '../types/game';
import { apolloAudio } from '../audio/apolloAudio';

interface InspectionModalProps {
  artifact: ArtifactInfo;
  onClose: () => void;
  onFireLaser?: () => void;
  isLaserFiring?: boolean;
}

export const InspectionModal: React.FC<InspectionModalProps> = ({
  artifact,
  onClose,
  onFireLaser,
  isLaserFiring
}) => {
  const [laserRangingDone, setLaserRangingDone] = useState(false);
  const [playingHistoricalVoice, setPlayingHistoricalVoice] = useState(false);
  const [isCinematicView, setIsCinematicView] = useState(false);
  const [laserTimer, setLaserTimer] = useState(0);

  // Animate timer during laser firing
  useEffect(() => {
    let interval: any;
    if (isLaserFiring) {
      const startTime = performance.now();
      interval = setInterval(() => {
        const elapsed = (performance.now() - startTime) / 1000;
        setLaserTimer(Math.min(2.564, elapsed));
      }, 30);
    } else {
      setLaserTimer(0);
    }
    return () => clearInterval(interval);
  }, [isLaserFiring]);

  const handleFireLaser = (switchToCinematic: boolean = false) => {
    if (onFireLaser) {
      onFireLaser();
      setLaserRangingDone(true);
      if (switchToCinematic) {
        setIsCinematicView(true);
      }
    }
  };

  const handlePlayOneSmallStep = () => {
    setPlayingHistoricalVoice(true);
    apolloAudio.speakDialogue(
      "That's one small step for man, one giant leap for mankind.",
      'Neil Armstrong (Narrator-01)',
      () => setPlayingHistoricalVoice(false)
    );
  };

  // If observing laser transmission in cinematic 3D view:
  if (isCinematicView && isLaserFiring) {
    const isOutbound = laserTimer < 1.28;
    return (
      <div className="fixed inset-0 pointer-events-none z-30 flex flex-col justify-between p-6 animate-fade-in">
        {/* Top telemetry indicator */}
        <div className="flex justify-between items-center pointer-events-auto">
          <div className="bg-slate-950/85 border border-emerald-500/60 rounded-lg px-4 py-2 flex items-center gap-3 backdrop-blur-md">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            <div>
              <div className="text-xs font-bold font-mono-num text-emerald-400 uppercase tracking-wider">
                532nm LASER TRANSMISSION ACTIVE
              </div>
              <div className="text-[11px] text-slate-300 font-mono-num">
                {isOutbound ? 'OUTBOUND: Earth (McDonald Obs.) → Moon' : 'RETURN: Lunar Reflector → Earth'}
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsCinematicView(false)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900/90 hover:bg-slate-800 text-xs font-mono-num text-emerald-300 border border-emerald-500/40 rounded-lg transition-colors backdrop-blur-md shadow-xl"
          >
            <Eye className="w-4 h-4" />
            <span>EXPAND DETAILS</span>
          </button>
        </div>

        {/* Bottom flight telemetry bar */}
        <div className="max-w-xl mx-auto w-full bg-slate-950/90 border border-emerald-500/70 rounded-xl p-4 shadow-2xl backdrop-blur-md pointer-events-auto flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono-num font-bold text-emerald-300">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>ROUND-TRIP FLIGHT TIME: {laserTimer.toFixed(3)}s / 2.564s</span>
            </div>
            {/* Progress bar */}
            <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-lime-400 transition-all duration-75"
                style={{ width: `${(laserTimer / 2.564) * 100}%` }}
              />
            </div>
          </div>

          <div className="text-right font-mono-num text-xs">
            <div className="text-slate-400 text-[10px]">CURRENT DISTANCE</div>
            <div className="text-emerald-400 font-bold text-sm">384,402.1 km</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center p-4 md:p-8 z-30 pointer-events-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 z-10">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono-num text-amber-400 mb-1">
              <span>ARTIFACT INSPECTION</span>
              <span>·</span>
              <span>SEA OF TRANQUILITY</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-100">
              {artifact.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
            title="Close inspection"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Metadata Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
              <div className="text-[11px] text-slate-400 font-mono-num uppercase mb-0.5">PURPOSE</div>
              <div className="text-sm font-bold text-amber-300">{artifact.purpose}</div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
              <div className="text-[11px] text-slate-400 font-mono-num uppercase mb-0.5">CURRENT STATUS</div>
              <div className="text-sm font-bold text-emerald-400">{artifact.status}</div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
              <div className="text-[11px] text-slate-400 font-mono-num uppercase mb-0.5">HISTORICAL LEGACY</div>
              <div className="text-sm font-bold text-slate-200">{artifact.legacy}</div>
            </div>
          </div>

          {/* Description */}
          <div className="text-sm md:text-base text-slate-300 leading-relaxed">
            {artifact.description}
          </div>

          {/* Dialogue Section: Neil Armstrong */}
          <div className="bg-slate-950/90 border-l-4 border-amber-500 rounded-r-lg p-4">
            <div className="flex items-center gap-2 text-xs font-bold font-mono-num text-amber-400 mb-1">
              <span>NARRATOR-01 // NEIL ARMSTRONG</span>
            </div>
            <p className="text-sm md:text-base text-slate-200 italic leading-relaxed">
              "{artifact.neilQuote}"
            </p>
          </div>

          {/* Scientific Educational Context */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-xs font-bold font-mono-num text-sky-400 mb-1.5">
              <Info className="w-4 h-4 text-sky-400" />
              <span>SCIENTIFIC ANALYSIS</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {artifact.scientificQuote}
            </p>
          </div>

          {/* Specific Interactive Features Per Artifact */}

          {/* 1. Laser Retroreflector Pulse Trigger */}
          {artifact.id === 'retroreflector' && (
            <div className="bg-emerald-950/30 border border-emerald-700/60 rounded-xl p-4 md:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm md:text-base font-bold text-emerald-300 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Lunar Laser Ranging Experiment</span>
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Transmits a high-power 532nm green laser pulse from Earth directly to this 100-prism retroreflector array.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleFireLaser(true)}
                    disabled={isLaserFiring}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 cursor-pointer"
                    title="Fire laser and switch to wide-angle cinematic 3D camera"
                  >
                    <Camera className="w-4 h-4 fill-slate-950" />
                    <span>{isLaserFiring ? 'TRANSMITTING IN 3D...' : 'FIRE & WATCH 3D LASER'}</span>
                  </button>
                </div>
              </div>

              {/* Live Laser Beam Graphical Schematic */}
              <div className="bg-black/60 border border-emerald-900/60 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono-num text-slate-400 border-b border-slate-800 pb-1.5">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                    <span>STATION: McDONALD OBSERVATORY, TX</span>
                  </span>
                  <span>WAVELENGTH: 532 nm (GREEN)</span>
                </div>

                {/* SVG Visualizing Earth, Laser Beam Pulse, and Retroreflector Array */}
                <div className="relative py-2">
                  <svg className="w-full h-12" viewBox="0 0 500 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Earth */}
                    <circle cx="28" cy="24" r="14" fill="#0284c7" />
                    <circle cx="24" cy="21" r="5" fill="#22c55e" opacity="0.8" />
                    <circle cx="33" cy="26" r="4" fill="#38bdf8" opacity="0.6" />
                    <text x="28" y="44" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">EARTH</text>

                    {/* Beam Path Guide */}
                    <line x1="44" y1="24" x2="440" y2="24" stroke="#065f46" strokeWidth="1.5" strokeDasharray="3 3" />

                    {/* Thick Glowing Laser Beam (Visible while firing) */}
                    {isLaserFiring && (
                      <>
                        <line x1="44" y1="24" x2="440" y2="24" stroke="#22c55e" strokeWidth="3" opacity="0.85" className="animate-pulse" />
                        <line x1="44" y1="24" x2="440" y2="24" stroke="#86efac" strokeWidth="1.5" />
                        {/* Traveling Pulse */}
                        <circle
                          cx={44 + ((laserTimer < 1.28 ? laserTimer / 1.28 : (2.564 - laserTimer) / 1.28) * 396)}
                          cy="24"
                          r="5"
                          fill="#ffffff"
                          filter="drop-shadow(0 0 6px #4ade80)"
                        />
                      </>
                    )}

                    {/* Retroreflector Target on Moon */}
                    <rect x="442" y="14" width="20" height="20" rx="3" fill="#1e293b" stroke="#4ade80" strokeWidth="1.5" />
                    <circle cx="448" cy="20" r="1.5" fill="#86efac" />
                    <circle cx="454" cy="20" r="1.5" fill="#86efac" />
                    <circle cx="448" cy="26" r="1.5" fill="#86efac" />
                    <circle cx="454" cy="26" r="1.5" fill="#86efac" />
                    <circle cx="452" cy="24" r="12" fill="none" stroke="#22c55e" strokeWidth="1" strokeDasharray="2 2" className="animate-spin" />
                    <text x="452" y="44" fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="monospace">LRRR</text>
                  </svg>
                </div>
              </div>

              {(isLaserFiring || laserRangingDone) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-emerald-900/50 text-xs font-mono-num bg-slate-950/60 p-3 rounded-lg">
                  <div>
                    <span className="text-slate-400 text-[10px]">ROUND-TRIP TIME:</span>
                    <div className="text-emerald-300 font-bold text-sm">
                      {isLaserFiring ? `${laserTimer.toFixed(4)} s` : '2.56448 s'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">MEASURED DISTANCE:</span>
                    <div className="text-emerald-300 font-bold text-sm">384,402.1 km</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">ORBITAL RECESSION:</span>
                    <div className="text-emerald-300 font-bold text-sm">+3.8 cm / year</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Commemorative Plaque Engraved Inscription */}
          {artifact.id === 'plaque' && (
            <div className="bg-slate-950 border border-slate-700/80 rounded-lg p-5 text-center space-y-4">
              <div className="border border-slate-600/60 p-4 rounded bg-slate-900/60 space-y-2">
                <div className="text-[11px] font-mono-num text-slate-400">
                  STAINLESS STEEL INSCRIPTION
                </div>
                <div className="text-base md:text-lg font-bold tracking-wider text-slate-100 font-mono-num">
                  "HERE MEN FROM THE PLANET EARTH<br/>
                  FIRST SET FOOT UPON THE MOON<br/>
                  JULY 1969, A.D.<br/>
                  WE CAME IN PEACE FOR ALL MANKIND"
                </div>
                <div className="text-xs text-slate-400 italic pt-2">
                  Signed: Neil A. Armstrong · Michael Collins · Edwin E. Aldrin, Jr. · Richard Nixon
                </div>
              </div>

              <button
                onClick={handlePlayOneSmallStep}
                disabled={playingHistoricalVoice}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors"
              >
                <Volume2 className="w-4 h-4" />
                {playingHistoricalVoice ? 'PLAYING HISTORIC AUDIO...' : "LISTEN: 'THAT'S ONE SMALL STEP...'"}
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end sticky bottom-0">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-sm transition-colors"
          >
            <span>RESUME EXPLORATION</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
