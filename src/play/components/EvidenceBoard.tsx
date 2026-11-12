import React from 'react';
import { EVIDENCE_ITEMS, EVIDENCE_REASONS } from '../missions/mars/data';
import { MatchBoard } from './MatchBoard';

interface EvidenceBoardProps {
  onComplete: () => void;
}

/** Mission 03's evidence board: what each clue really tells us. */
export const EvidenceBoard: React.FC<EvidenceBoardProps> = ({ onComplete }) => (
  <MatchBoard
    coach="mars-board"
    eyebrow="EVIDENCE BOARD"
    title="What does each clue really tell us?"
    subtitle="Pick a clue on the left, then choose what it means on the right."
    leftLabel="1. PICK A CLUE"
    rightLabel="2. CHOOSE WHAT IT MEANS"
    items={EVIDENCE_ITEMS.map(item => ({ id: item.id, text: item.text }))}
    reasons={EVIDENCE_REASONS.map(reason => ({ id: reason.id, text: reason.text, itemId: reason.itemId }))}
    wrongText={wrong =>
      wrong === 1
        ? 'One link did not fit, so its line was removed. The clue is marked in red: pick it and try another meaning.'
        : `${wrong === 2 ? 'Two' : 'All three'} links did not fit, so their lines were removed. Pick each red clue and try another meaning.`
    }
    successTitle="CLUES MATCHED"
    successText="The lake could once have held life. The leopard-spot rock is a possible sign of it. The sealed samples could settle the question, in a laboratory on Earth."
    finishLabel="RETURN TO THE TUBES"
    onComplete={onComplete}
  />
);
