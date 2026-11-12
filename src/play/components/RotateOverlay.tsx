import React from 'react';
import { Smartphone } from 'lucide-react';
import { DisplayControls } from './DisplayControls';

export const RotateOverlay: React.FC = () => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/95 px-8 pointer-events-auto">
      <div className="flex max-w-sm flex-col items-center gap-5 text-center">
        <Smartphone className="h-16 w-16 rotate-90 text-amber-400" />
        <div>
          <h2 className="text-xl font-bold tracking-wide text-slate-100">
            Turn your phone sideways
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            This mission is played in landscape. Rotate the phone to continue.
          </p>
        </div>
        <DisplayControls labels="always" />
      </div>
    </div>
  );
};
