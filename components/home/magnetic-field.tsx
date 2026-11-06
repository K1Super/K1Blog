'use client';

import { useEffect, useRef } from 'react';

type Accent = [number, number, number];

type Palette = {
  dot: string;
  faint: Accent;
  accent: Accent;
};

const TAU = Math.PI * 2;

function hexToRgb(hex: string): Accent | null {
  const value = hex.replace('#', '').trim();
  if (value.length !== 6) return null;
  const parsed = Number.parseInt(value, 16);
  if (Number.isNaN(parsed)) return null;
  return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255];
}

function withAlpha(hex: string, alpha: number, fallback: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return fallback;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const faint = style.getPropertyValue('--faint').trim() || '#86868d';
  const accent = style.getPropertyValue('--accent').trim() || '#7ba3d6';
  return {
    dot: withAlpha(faint, 0.14, 'rgba(134, 134, 141, 0.14)'),
    faint: hexToRgb(faint) ?? [134, 134, 141],
    accent: hexToRgb(accent) ?? [123, 163, 214],
  };
}

export function MagneticField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !host || !ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let palette = readPalette();
    let width = 0;
    let height = 0;
    let step = 38;
    let cols = 0;
    let rows = 0;
    let seeds = new Float32Array(0);
    let pointerX = -9999;
    let pointerY = -9999;
    let targetX = -9999;
    let targetY = -9999;
    let energy = 0;
    let targetEnergy = 0;
    let flow = 0;
    let flowTarget = 0;
    let frame = 0;

    const rebuild = () => {
      const rect = host.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      step = width < 720 ? 30 : 38;
      cols = Math.ceil(width / step) + 1;
      rows = Math.ceil(height / step) + 1;
      seeds = new Float32Array(cols * rows);
      for (let i = 0; i < seeds.length; i += 1) {
        const noise = Math.sin(i * 12.9898) * 43758.5453;
        seeds[i] = noise - Math.floor(noise);
      }
    };

    const draw = () => {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);

      const baseSigma = Math.max(96, Math.min(156, width * 0.085));
      const sigma = baseSigma * (1 + flow * 0.16);
      const reach = sigma * 2.9;
      const reachSq = reach * reach;
      const [ar, ag, ab] = palette.accent;
      const [fr, fg, fb] = palette.faint;
      const magnetised = energy > 0.02;

      ctx.lineCap = 'round';
      ctx.lineWidth = 1;

      for (let row = 0; row < rows; row += 1) {
        const y = step / 2 + row * step;
        if (y >= height) break;
        for (let col = 0; col < cols; col += 1) {
          const x = step / 2 + col * step;
          if (x >= width) break;

          const dx = x - pointerX;
          const dy = y - pointerY;
          if (!magnetised || dx * dx + dy * dy > reachSq) {
            ctx.fillStyle = palette.dot;
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, TAU);
            ctx.fill();
            continue;
          }

          const seed = seeds[row * cols + col] ?? 0.5;
          const r = Math.max(1, Math.sqrt(dx * dx + dy * dy));
          const influence = Math.exp(-(r * r) / (2 * sigma * sigma)) * energy;
          const twist = (0.78 + flow * 0.5) * Math.exp(-r / sigma) + (seed - 0.5) * 0.3;
          const pull = influence * 9;
          const swirl = influence * (5 + flow * 6);
          const ux = dx / r;
          const uy = dy / r;
          const cx = x + ux * pull - uy * swirl;
          const cy = y + uy * pull + ux * swirl;
          const angle = Math.atan2(dy, dx) + Math.PI / 2 + twist;
          const length = 2 + influence * 20 * (0.85 + seed * 0.3);
          const half = length / 2;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          const tint = Math.min(1, influence * 1.7);
          const cr = Math.round(fr + (ar - fr) * tint);
          const cg = Math.round(fg + (ag - fg) * tint);
          const cb = Math.round(fb + (ab - fb) * tint);
          ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${0.1 + influence * 0.5})`;
          ctx.beginPath();
          ctx.moveTo(cx - cos * half, cy - sin * half);
          ctx.lineTo(cx + cos * half, cy + sin * half);
          ctx.stroke();
        }
      }
    };

    const stepFrame = () => {
      frame = 0;
      pointerX += (targetX - pointerX) * 0.1;
      pointerY += (targetY - pointerY) * 0.1;
      energy += (targetEnergy - energy) * 0.06;
      flow += (flowTarget - flow) * 0.1;
      flowTarget *= 0.92;
      draw();
      if (
        !reduce &&
        (Math.abs(targetX - pointerX) > 0.4 ||
          Math.abs(targetY - pointerY) > 0.4 ||
          Math.abs(targetEnergy - energy) > 0.003 ||
          Math.abs(flowTarget - flow) > 0.01)
      ) {
        frame = requestAnimationFrame(stepFrame);
      }
    };

    const kick = () => {
      if (!frame) frame = requestAnimationFrame(stepFrame);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (reduce || event.pointerType === 'touch') return;
      const rect = host.getBoundingClientRect();
      const nextX = event.clientX - rect.left;
      const nextY = event.clientY - rect.top;
      if (pointerX === -9999) {
        pointerX = nextX;
        pointerY = nextY;
      } else {
        flowTarget = Math.min(1.2, Math.hypot(nextX - targetX, nextY - targetY) / 26);
      }
      targetX = nextX;
      targetY = nextY;
      targetEnergy = 1;
      kick();
    };

    const onPointerLeave = () => {
      targetEnergy = 0;
      flowTarget = 0;
      kick();
    };

    const onThemeChange = () => {
      palette = readPalette();
      draw();
    };

    rebuild();
    draw();

    const resizeObserver = new ResizeObserver(() => {
      rebuild();
      draw();
    });
    resizeObserver.observe(host);

    const themeObserver = new MutationObserver(onThemeChange);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    if (!reduce) {
      host.addEventListener('pointermove', onPointerMove);
      host.addEventListener('pointerleave', onPointerLeave);
    }

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerleave', onPointerLeave);
    };
  }, []);

  return <canvas ref={canvasRef} className="field-canvas" aria-hidden="true" />;
}
