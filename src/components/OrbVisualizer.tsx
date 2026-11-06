import React, { useEffect, useRef } from 'react';

interface OrbVisualizerProps {
  reducedMotion?: boolean;
}

export const OrbVisualizer: React.FC<OrbVisualizerProps> = ({
  reducedMotion = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startTime = performance.now();

    // Generate fixed micro-star sparkles inside the cosmic orb
    const sparkles = Array.from({ length: 36 }, (_, i) => ({
      angle: (i * 137.5 * Math.PI) / 180,
      dist: 0.15 + ((i * 29) % 75) / 100,
      size: 0.7 + (i % 3) * 0.45,
      phase: i * 0.6,
    }));

    const render = (now: number) => {
      const elapsed = reducedMotion ? 0 : (now - startTime) / 1000;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const sphereR = 66;
      const ringTilt = -0.34; // ~ -19.5 degrees tilt

      ctx.clearRect(0, 0, w, h);

      // Helper to draw back or front half of the glowing orbital rings
      const drawOrbitalRings = (isFront: boolean) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ringTilt);

        const startAngle = isFront ? 0 : Math.PI;
        const endAngle = isFront ? Math.PI : Math.PI * 2;

        // Outer ambient cyan glow along ring path
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, 0, 128, 36, 0, startAngle, endAngle);
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.28)';
        ctx.lineWidth = 8;
        ctx.shadowColor = 'rgba(34, 211, 238, 0.85)';
        ctx.shadowBlur = 16;
        ctx.stroke();
        ctx.restore();

        // Outer crisp cyan ring
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, 0, 130, 37, 0, startAngle, endAngle);
        ctx.strokeStyle = isFront
          ? 'rgba(103, 232, 249, 0.95)'
          : 'rgba(56, 189, 248, 0.65)';
        ctx.lineWidth = 2.2;
        ctx.shadowColor = '#22D3EE';
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.restore();

        // Inner crisp cyan ring
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, 0, 108, 29, 0, startAngle, endAngle);
        ctx.strokeStyle = isFront
          ? 'rgba(165, 243, 252, 0.9)'
          : 'rgba(56, 189, 248, 0.55)';
        ctx.lineWidth = 1.8;
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.restore();

        // Translucent energy sheen between the two rings
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, 0, 119, 33, 0, startAngle, endAngle);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
        ctx.lineWidth = 14;
        ctx.stroke();
        ctx.restore();

        ctx.restore();
      };

      // 1. Draw BACK half of orbital rings (behind planet)
      drawOrbitalRings(false);

      // 2. Ambient volumetric halo behind the sphere
      const outerHalo = ctx.createRadialGradient(cx, cy, sphereR * 0.5, cx, cy, sphereR * 1.45);
      outerHalo.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      outerHalo.addColorStop(0.55, 'rgba(37, 99, 235, 0.16)');
      outerHalo.addColorStop(1, 'rgba(37, 99, 235, 0)');
      ctx.fillStyle = outerHalo;
      ctx.beginPath();
      ctx.arc(cx, cy, sphereR * 1.45, 0, Math.PI * 2);
      ctx.fill();

      // 3. Draw the Cosmic Energy Sphere (borderless, no dark outer ring)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, sphereR, 0, Math.PI * 2);
      ctx.clip();

      // Base radial gradient: electric azure to deep cobalt & violet-blue
      const baseGrad = ctx.createRadialGradient(
        cx - sphereR * 0.25,
        cy - sphereR * 0.3,
        sphereR * 0.05,
        cx,
        cy,
        sphereR
      );
      baseGrad.addColorStop(0, '#A5F3FC');
      baseGrad.addColorStop(0.25, '#22D3EE');
      baseGrad.addColorStop(0.58, '#2563EB');
      baseGrad.addColorStop(0.84, '#312E81');
      baseGrad.addColorStop(1, '#1E3A8A');
      ctx.fillStyle = baseGrad;
      ctx.fillRect(cx - sphereR, cy - sphereR, sphereR * 2, sphereR * 2);

      // Swirling cyan/violet nebula clouds inside sphere
      const swirlX = cx + Math.cos(elapsed * 0.7) * (sphereR * 0.22);
      const swirlY = cy + Math.sin(elapsed * 0.6) * (sphereR * 0.16);
      const nebula1 = ctx.createRadialGradient(swirlX, swirlY, 0, swirlX, swirlY, sphereR * 0.85);
      nebula1.addColorStop(0, 'rgba(103, 232, 249, 0.65)');
      nebula1.addColorStop(0.45, 'rgba(56, 189, 248, 0.35)');
      nebula1.addColorStop(0.8, 'rgba(139, 92, 246, 0.22)');
      nebula1.addColorStop(1, 'rgba(30, 58, 138, 0)');
      ctx.fillStyle = nebula1;
      ctx.fillRect(cx - sphereR, cy - sphereR, sphereR * 2, sphereR * 2);

      // Glowing tilted equatorial cyan energy band across the planet
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(ringTilt);
      const bandGrad = ctx.createLinearGradient(0, -sphereR * 0.45, 0, sphereR * 0.45);
      bandGrad.addColorStop(0, 'rgba(34, 211, 238, 0)');
      bandGrad.addColorStop(0.38, 'rgba(34, 211, 238, 0.25)');
      bandGrad.addColorStop(0.5, 'rgba(165, 243, 252, 0.78)');
      bandGrad.addColorStop(0.62, 'rgba(34, 211, 238, 0.25)');
      bandGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
      ctx.fillStyle = bandGrad;
      ctx.fillRect(-sphereR * 1.2, -sphereR * 0.45, sphereR * 2.4, sphereR * 0.9);
      ctx.restore();

      // North-pole luminous cyan vortex crown (top of sphere)
      ctx.save();
      ctx.translate(cx - 4, cy - sphereR * 0.68);
      ctx.rotate(-0.12);
      const crownGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 28);
      crownGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      crownGrad.addColorStop(0.35, 'rgba(103, 232, 249, 0.85)');
      crownGrad.addColorStop(0.75, 'rgba(34, 211, 238, 0.25)');
      crownGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');
      ctx.fillStyle = crownGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 26, 11, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner dark-cyan eye of the north polar vortex
      ctx.beginPath();
      ctx.ellipse(0, 0, 11, 4.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(14, 116, 144, 0.75)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(224, 242, 254, 0.9)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.restore();

      // Internal starry sparkles
      for (const sp of sparkles) {
        const sx = cx + Math.cos(sp.angle + elapsed * 0.12) * (sp.dist * sphereR);
        const sy = cy + Math.sin(sp.angle + elapsed * 0.12) * (sp.dist * sphereR);
        const twinkle = reducedMotion ? 0.8 : 0.45 + 0.55 * Math.sin(elapsed * 2.2 + sp.phase);
        ctx.beginPath();
        ctx.arc(sx, sy, sp.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(224, 242, 254, ${twinkle.toFixed(2)})`;
        ctx.fill();
      }

      // Soft inner atmospheric rim illumination (electric cyan/lavender, zero black border)
      const innerRim = ctx.createRadialGradient(cx, cy, sphereR * 0.72, cx, cy, sphereR);
      innerRim.addColorStop(0, 'rgba(56, 189, 248, 0)');
      innerRim.addColorStop(0.75, 'rgba(56, 189, 248, 0.18)');
      innerRim.addColorStop(1, 'rgba(165, 243, 252, 0.65)');
      ctx.fillStyle = innerRim;
      ctx.beginPath();
      ctx.arc(cx, cy, sphereR, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // 4. Draw FRONT half of orbital rings (passing in front of planet)
      drawOrbitalRings(true);

      if (!reducedMotion) {
        animationFrameRef.current = requestAnimationFrame(render);
      }
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [reducedMotion]);

  return (
    <div
      className="relative flex items-center justify-center select-none"
      data-orb-container="true"
    >
      {/* Ambient volumetric backdrop glow (scaled to 80%) */}
      <div
        className="pointer-events-none absolute w-52 h-36 rounded-full blur-3xl opacity-85"
        style={{
          background:
            'radial-gradient(circle, rgba(34, 211, 238, 0.38) 0%, rgba(37, 99, 235, 0.22) 52%, transparent 75%)',
        }}
        aria-hidden="true"
      />

      {/* Ethereal Ringed Cosmic Energy Orb at 80% scale (192x125px, down from 240x156px) with 4s breathing animation */}
      <div
        id="orb-visualizer-layer"
        data-testid="orb-layer"
        className={`relative w-[192px] h-[125px] flex items-center justify-center ${
          reducedMotion ? '' : 'orb-breathing'
        }`}
        style={{
          filter: 'drop-shadow(0 0 24px rgba(56, 189, 248, 0.45))',
        }}
      >
        <canvas
          ref={canvasRef}
          width={300}
          height={195}
          className="w-full h-full block pointer-events-none"
        />
      </div>
    </div>
  );
};
