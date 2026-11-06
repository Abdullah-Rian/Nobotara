/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';

interface ConstellationBackgroundProps {
  reducedMotion?: boolean;
  className?: string;
}

interface StarParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  isAccent: boolean;
  pulsePhase: number;
}

export const ConstellationBackground: React.FC<ConstellationBackgroundProps> = ({
  reducedMotion = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let stars: StarParticle[] = [];

    const getPixelRatio = () => Math.min(window.devicePixelRatio || 1, 1.5);

    const initStars = () => {
      const count = width < 640 ? 65 : width < 1024 ? 110 : 150;
      stars = new Array(count);

      for (let i = 0; i < count; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const speed = 0.03 + Math.random() * 0.06;
        const angle = Math.random() * Math.PI * 2;
        const isAccent = i % 6 === 0;

        stars[i] = {
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: isAccent ? 1.1 + Math.random() * 0.7 : 0.5 + Math.random() * 0.6,
          baseAlpha: isAccent ? 0.85 : 0.3 + Math.random() * 0.45,
          isAccent,
          pulsePhase: Math.random() * Math.PI * 2,
        };
      }
    };

    const handleResize = () => {
      const dpr = getPixelRatio();
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      const targetWidth = Math.floor(width * dpr);
      const targetHeight = Math.floor(height * dpr);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        initStars();
      }
    };

    handleResize();

    let lastTime = performance.now();

    const render = (currentTime: number) => {
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      ctx.clearRect(0, 0, width, height);

      const len = stars.length;

      for (let i = 0; i < len; i++) {
        const s = stars[i];

        if (!reducedMotion) {
          s.x += s.vx * (delta * 60);
          s.y += s.vy * (delta * 60);

          if (s.x < -10) s.x = width + 10;
          else if (s.x > width + 10) s.x = -10;
          if (s.y < -10) s.y = height + 10;
          else if (s.y > height + 10) s.y = -10;

          s.pulsePhase += delta * 1.1;
        }

        const pulse = reducedMotion ? 1 : 0.7 + Math.sin(s.pulsePhase) * 0.3;
        const alpha = s.baseAlpha * pulse;

        if (s.isAccent) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.radius * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(56, 189, 248, ${(alpha * 0.25).toFixed(3)})`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = s.isAccent
          ? `rgba(186, 230, 253, ${alpha.toFixed(3)})`
          : `rgba(226, 232, 240, ${alpha.toFixed(3)})`;
        ctx.fill();
      }

      if (!reducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    animationFrameId = requestAnimationFrame(render);

    let resizeTimer: number;
    const onWindowResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(handleResize, 150);
    };
    window.addEventListener('resize', onWindowResize, { passive: true });

    const handleVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else if (!reducedMotion) {
        lastTime = performance.now();
        animationFrameId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onWindowResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [reducedMotion]);

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden w-full h-full min-h-screen ${className}`}
      style={{
        background: 'radial-gradient(ellipse 90% 80% at 50% 45%, #0A152C 0%, #060A15 60%, #04060E 100%)',
      }}
      aria-hidden="true"
    >
      {/* Center cosmic nebula clouds matching the deep space azure atmosphere */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 520px 320px at 36% 48%, rgba(29, 78, 216, 0.22) 0%, rgba(14, 165, 233, 0.08) 45%, transparent 72%), radial-gradient(ellipse 540px 340px at 62% 52%, rgba(37, 99, 235, 0.2) 0%, rgba(56, 189, 248, 0.09) 45%, transparent 72%), radial-gradient(circle 280px at 50% 24%, rgba(34, 211, 238, 0.14) 0%, transparent 70%)',
        }}
      />

      {/* Ambient starfield layer */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        style={{
          opacity: 0.42,
        }}
      />
    </div>
  );
};
