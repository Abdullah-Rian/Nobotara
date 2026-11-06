import { useEffect, useRef } from 'react';

interface UseEntranceAnimationProps {
  reducedMotion: boolean;
  replayKey: number;
}

export const useEntranceAnimation = ({
  reducedMotion,
  replayKey,
}: UseEntranceAnimationProps) => {
  const animationsRef = useRef<Animation[]>([]);

  useEffect(() => {
    animationsRef.current.forEach((anim) => anim.cancel());
    animationsRef.current = [];

    if (reducedMotion) {
      return;
    }

    const easeOutCubic = 'cubic-bezier(0.16, 1, 0.3, 1)';

    // 1. Back button rises in
    const backBtn = document.querySelectorAll('.back-btn');
    backBtn.forEach((el) => {
      const anim = el.animate(
        [
          { opacity: 0, transform: 'translateY(-8px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        {
          duration: 400,
          delay: 50,
          easing: easeOutCubic,
          fill: 'backwards',
        }
      );
      animationsRef.current.push(anim);
    });

    // 2. Orb scales and fades in smoothly without clipping its orbital rings
    const orbLayer = document.getElementById('orb-visualizer-layer');
    if (orbLayer) {
      const orbAnim = orbLayer.animate(
        [
          {
            opacity: 0,
            transform: 'scale(0.92)',
          },
          {
            opacity: 1,
            transform: 'scale(1)',
          },
        ],
        {
          duration: 750,
          delay: 120,
          easing: easeOutCubic,
          fill: 'backwards',
        }
      );
      animationsRef.current.push(orbAnim);
    }

    // 3. Greeting appears
    const greetingEl = document.getElementById('entrance-greeting');
    if (greetingEl) {
      const greetingAnim = greetingEl.animate(
        [
          { opacity: 0, transform: 'translateY(8px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        {
          duration: 450,
          delay: 260,
          easing: easeOutCubic,
          fill: 'backwards',
        }
      );
      animationsRef.current.push(greetingAnim);
    }

    // 4. Composer settles in
    const composerEl = document.getElementById('space-composer');
    if (composerEl) {
      const composerAnim = composerEl.animate(
        [
          { opacity: 0, transform: 'translateY(14px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        {
          duration: 500,
          delay: 380,
          easing: easeOutCubic,
          fill: 'backwards',
        }
      );
      animationsRef.current.push(composerAnim);
    }

    // 5. Recent Conversations History settles in
    const historyEl = document.getElementById('entrance-history');
    if (historyEl) {
      const historyAnim = historyEl.animate(
        [
          { opacity: 0, transform: 'translateY(14px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        {
          duration: 500,
          delay: 480,
          easing: easeOutCubic,
          fill: 'backwards',
        }
      );
      animationsRef.current.push(historyAnim);
    }

    return () => {
      animationsRef.current.forEach((anim) => anim.cancel());
    };
  }, [reducedMotion, replayKey]);
};
