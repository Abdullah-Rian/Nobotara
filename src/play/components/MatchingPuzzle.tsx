import React from 'react';
import { MATCHING_CHALLENGES } from '../data/artifactsData';
import { MatchBoard } from './MatchBoard';

interface MatchingPuzzleProps {
  onComplete: () => void;
  /** The first link was made: the hint can go. */
  onStarted?: () => void;
}

/** Mission 01's last challenge: why each object stayed on the Moon. */
export const MatchingPuzzle: React.FC<MatchingPuzzleProps> = ({ onComplete, onStarted }) => (
  <MatchBoard
    coach="apollo-match"
    eyebrow="THE LAST CHALLENGE"
    title="Why did these objects remain on the Moon?"
    subtitle="Pick an object on the left, then the reason it was left behind."
    leftLabel="1. PICK AN OBJECT"
    rightLabel="2. CHOOSE THE REASON"
    items={MATCHING_CHALLENGES.artifacts.map(art => ({ id: art.id, text: art.name }))}
    reasons={MATCHING_CHALLENGES.reasons.map(reason => ({ id: reason.id, text: reason.text, itemId: reason.artifactId }))}
    wrongText={wrong =>
      wrong === 1
        ? 'One match did not fit, so its line was removed. The object is marked in red: pick it and try another reason.'
        : `${wrong === 2 ? 'Two' : 'All three'} matches did not fit, so their lines were removed. Pick each red object and try another reason.`
    }
    successTitle="ALL THREE MATCHED"
    successText="All three artifacts are correctly understood: the descent stage was the launch pad for the trip home, the retroreflector still sends laser light back to Earth, and the plaque keeps a message of peace."
    finishLabel="FINISH MISSION 01"
    onComplete={onComplete}
    onFirstLink={onStarted}
  />
);
