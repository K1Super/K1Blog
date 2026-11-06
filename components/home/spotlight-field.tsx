'use client';

import { useEffect, useRef } from 'react';

type Palette = {
  dot: string;
  accent: string;
};

function hexToRgb(hex: string): [number, number, number] | null {
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
    dot: withAlpha(faint, 0.2, 'rgba(134, 134, 141, 0.2)'),
    accent,
  };
}

export function SpotlightField() {
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
    let pointerX = -9999;
    let pointerY = -9999;
    let targetX = -9999;
    let targetY = -9999;
    let energy = 0;
    let targetEnergy = 0;
    let frame = 0;

    const resize = () => {
      const rect = host.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);

      const step = width < 720 ? 34 : 42;
      const sigma = Math.max(110, width * 0.1);
      const accentRgb = hexToRgb(palette.accent) ?? [123, 163, 214];

      if (energy > 0.015) {
        const halo = ctx.createRadialGradient(
          pointerX,
          pointerY,
          0,
          pointerX,
          pointerY,
          sigma * 2.2,
        );
        halo.addColorStop(
          0,
          `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${0.1 * energy})`,
        );
        halo.addColorStop(1, `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, 0)`);
        ctx.fillStyle = halo;
        ctx.fillRect(pointerX - sigma * 2.2, pointerY - sigma * 2.2, sigma * 4.4, sigma * 4.4);
      }

      for (let y = step / 2; y < height; y += step) {
        for (let x = step / 2; x < width; x += step) {
          const dx = x - pointerX;
          const dy = y - pointerY;
          const influence =
            energy > 0.015 ? Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma)) * energy : 0;

          if (influence > 0.02) {
            ctx.fillStyle = `rgba(${accentRgb[0]}, ${accentRgb[1]}, ${accentRgb[2]}, ${0.12 + influence * 0.55})`;
            ctx.beginPath();
            ctx.arc(x, y, 1 + influence * 1.7, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = palette.dot;
            ctx.beginPath();
            ctx.arc(x, y, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    };

    const step = () => {
      frame = 0;
      pointerX += (targetX - pointerX) * 0.08;
      pointerY += (targetY - pointerY) * 0.08;
      energy += (targetEnergy - energy) * 0.06;
      draw();
      if (
        !reduce &&
        (Math.abs(targetX - pointerX) > 0.4 ||
          Math.abs(targetY - pointerY) > 0.4 ||
          Math.abs(targetEnergy - energy) > 0.003)
      ) {
        frame = requestAnimationFrame(step);
      }
    };

    const kick = () => {
      if (!frame) frame = requestAnimationFrame(step);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (reduce || event.pointerType === 'touch') return;
      const rect = host.getBoundingClientRect();
      const nextX = event.clientX - rect.left;
      const nextY = event.clientY - rect.top;
      if (pointerX === -9999) {
        pointerX = nextX;
        pointerY = nextY;
      }
      targetX = nextX;
      targetY = nextY;
      targetEnergy = 1;
      kick();
    };

    const onPointerLeave = () => {
      targetEnergy = 0;
      kick();
    };

    const onThemeChange = () => {
      palette = readPalette();
      draw();
    };

    resize();
    draw();

    const resizeObserver = new ResizeObserver(() => {
      resize();
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

  return <canvas ref={canvasRef} className="spotlight-canvas" aria-hidden="true" />;
}
