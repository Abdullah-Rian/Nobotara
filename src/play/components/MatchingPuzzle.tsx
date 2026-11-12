import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { ArtifactId, MatchingOption } from '../types/game';
import { MATCHING_CHALLENGES } from '../data/artifactsData';
import { apolloAudio } from '../audio/apolloAudio';

interface MatchingPuzzleProps {
  onComplete: () => void;
}

export const MatchingPuzzle: React.FC<MatchingPuzzleProps> = ({ onComplete }) => {
  // Selected matches: key is artifactId, value is matching reason ID
  const [matches, setMatches] = useState<Partial<Record<ArtifactId, string>>>({});
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactId | null>('descent_stage');
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  /** Rows are only marked right or wrong once all three are linked. */
  const [checked, setChecked] = useState(false);
  const rightFor = (artifactId: ArtifactId, reasonId: string | undefined) =>
    reasons.find(r => r.id === reasonId)?.artifactId === artifactId;

  const artifacts = MATCHING_CHALLENGES.artifacts as { id: ArtifactId; name: string }[];
  const reasons = MATCHING_CHALLENGES.reasons;

  const handleSelectReason = (reason: MatchingOption) => {
    if (!selectedArtifact) return;

    apolloAudio.playClickSound();

    const newMatches = {
      ...matches,
      [selectedArtifact]: reason.id
    };
    setMatches(newMatches);
    setValidationError(null);
    setChecked(false);

    // Auto-advance to next unmatched artifact
    const nextUnmatched = artifacts.find(a => !newMatches[a.id]);
    if (nextUnmatched) {
      setSelectedArtifact(nextUnmatched.id);
    } else {
      setSelectedArtifact(null);
    }

    // Check if all 3 are matched
    if (Object.keys(newMatches).length === 3) {
      // Validate correct matches
      const wrong = artifacts.filter(a => !rightFor(a.id, newMatches[a.id])).length;
      setChecked(true);
      if (wrong === 0) {
        setIsCompleted(true);
        apolloAudio.playSuccessChime();
      } else {
        setValidationError(
          wrong === 1
            ? 'One match does not fit. It is marked in red. Press Change on it and try another reason.'
            : `${wrong === 2 ? 'Two' : 'All three'} matches do not fit. They are marked in red. Press Change on each and try another reason.`
        );
      }
    }
  };

  const handleResetMatch = (artifactId: ArtifactId) => {
    const newMatches = { ...matches };
    delete newMatches[artifactId];
    setMatches(newMatches);
    setSelectedArtifact(artifactId);
    setIsCompleted(false);
    setChecked(false);
    setValidationError(null);
  };

  return (
    <div className="absolute inset-0 bg-slate-950/85 flex items-center justify-center p-4 md:p-8 z-30 pointer-events-auto">
      <div data-coach="apollo-match" className="bg-slate-900 border border-slate-700 max-w-2xl w-full rounded-xl p-6 md:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 border-b border-slate-800 pb-5">
          <div className="text-xs font-mono-num font-bold text-amber-400 tracking-wider">
            THE LAST CHALLENGE
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-100">
            Why did these objects remain on the Moon?
          </h2>
          <p className="text-xs md:text-sm text-slate-400 max-w-md mx-auto">
            Pick an object on the left, then the reason it was left behind.
          </p>
        </div>

        {/* Puzzle Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Artifacts */}
          <div className="space-y-3">
            <div className="text-xs font-mono-num text-slate-400 font-semibold mb-1">
              1. PICK AN OBJECT
            </div>
            {artifacts.map(art => {
              const matchedReasonId = matches[art.id];
              const matchedReason = reasons.find(r => r.id === matchedReasonId);
              const isSelected = selectedArtifact === art.id;
              const right = checked && matchedReason ? rightFor(art.id, matchedReason.id) : null;

              return (
                <div
                  key={art.id}
                  onClick={() => setSelectedArtifact(art.id)}
                  className={`p-3.5 rounded-lg border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/10 shadow-md ring-1 ring-amber-400'
                      : right === true
                      ? 'border-emerald-600/60 bg-emerald-950/20'
                      : right === false
                      ? 'border-rose-600/70 bg-rose-950/25'
                      : matchedReason
                      ? 'border-slate-600 bg-slate-900/60'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-200">{art.name}</span>
                    {right === true && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {right === false && <AlertCircle className="w-4 h-4 text-rose-400" />}
                  </div>
                  {matchedReason && (
                    <div className={`mt-1.5 text-xs flex items-start justify-between ${right === true ? 'text-emerald-300/90' : right === false ? 'text-rose-300' : 'text-slate-300'}`}>
                      <span className="pr-2 leading-snug">Linked: {matchedReason.text}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetMatch(art.id);
                        }}
                        className="shrink-0 rounded border border-slate-600 px-2 py-0.5 text-[11px] text-slate-200"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column: Reasons */}
          <div className="space-y-3">
            <div className="text-xs font-mono-num text-slate-400 font-semibold mb-1">
              2. CHOOSE THE REASON
            </div>
            {reasons.map(reason => {
              // Check if reason is already assigned
              const assignedArtifact = Object.entries(matches).find(([_, rId]) => rId === reason.id)?.[0];

              return (
                <button
                  key={reason.id}
                  disabled={!selectedArtifact || isCompleted}
                  onClick={() => handleSelectReason(reason)}
                  className={`w-full p-3.5 rounded-lg border text-left text-xs md:text-sm transition-all leading-relaxed ${
                    assignedArtifact
                      ? 'border-slate-700 bg-slate-800/40 text-slate-400 opacity-60'
                      : selectedArtifact
                      ? 'border-slate-700 bg-slate-950/80 hover:border-amber-400 text-slate-200 hover:bg-slate-900 cursor-pointer'
                      : 'border-slate-800 bg-slate-950/30 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {reason.text}
                </button>
              );
            })}
          </div>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="flex items-center gap-2 p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Success State */}
        {isCompleted && (
          <div className="bg-emerald-950/40 border border-emerald-500/80 rounded-xl p-5 text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-mono-num font-bold">
              <Sparkles className="w-5 h-5 text-emerald-400 animate-spin" />
              <span>ALL THREE MATCHED</span>
            </div>
            <p className="text-xs md:text-sm text-slate-300 max-w-lg mx-auto">
              All three artifacts are correctly understood: the descent stage was the launch pad for the trip home, the retroreflector still sends laser light back to Earth, and the plaque keeps a message of peace.
            </p>
            <button
              onClick={onComplete}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-sm transition-transform transform hover:-translate-y-0.5"
            >
              <span>FINISH MISSION 01</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
