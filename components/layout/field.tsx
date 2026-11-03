'use client';

import { useEffect, useRef } from 'react';

type Palette = {
  line: string;
  accent: string;
};

function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  return {
    line: style.getPropertyValue('--faint').trim() || '#8a857b',
    accent: style.getPropertyValue('--amber').trim() || '#d49a45',
  };
}

export function Field() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const readout = readoutRef.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !host || !ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let palette = readPalette();
    let width = 0;
    let height = 0;
    let dpr = 1;
    let pointerX = 0;
    let pointerY = 0;
    let targetX = 0;
    let targetY = 0;
    let energy = 0;
    let targetEnergy = 0;
    let frame = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);

      const columns = Math.max(16, Math.min(64, Math.floor(width / 22)));
      const spacing = width / columns;
      const sigma = Math.max(96, width * 0.13);
      const topBase = height * 0.14;
      const bottomBase = height * 0.86;
      let nearest = -1;
      let nearestDistance = Infinity;

      for (let index = 0; index < columns; index += 1) {
        const baseX = spacing * (index + 0.5);
        const distance = Math.abs(baseX - pointerX);
        const influence =
          energy > 0.01 ? Math.exp(-(distance * distance) / (2 * sigma * sigma)) : 0;
        const shift = -Math.sign(baseX - pointerX || 1) * 18 * influence * energy;
        const x = baseX + shift;
        const phase = index * 0.7;
        const top = topBase + Math.sin(phase) * height * 0.055;
        const bottom = bottomBase - Math.cos(phase * 1.3) * height * 0.075;

        if (distance < nearestDistance) {
          nearest = index;
          nearestDistance = distance;
        }

        ctx.strokeStyle = palette.line;
        ctx.globalAlpha = 0.08 + influence * 0.2 * energy;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.stroke();

        if (index % 4 === 0) {
          const tickGap = Math.max(24, height / 18);
          ctx.globalAlpha = 0.1 + influence * 0.2 * energy;
          for (let y = top + 12; y < bottom; y += tickGap) {
            const length = 2 + influence * 5 * energy;
            ctx.beginPath();
            ctx.moveTo(x - length / 2, y);
            ctx.lineTo(x + length / 2, y);
            ctx.stroke();
          }
        }
      }

      if (nearest >= 0 && energy > 0.02) {
        const baseX = spacing * (nearest + 0.5);
        const influence = Math.exp(-(nearestDistance * nearestDistance) / (2 * sigma * sigma));
        const shift = -Math.sign(baseX - pointerX || 1) * 18 * influence * energy;
        const phase = nearest * 0.7;
        const top = topBase + Math.sin(phase) * height * 0.055;
        const bottom = bottomBase - Math.cos(phase * 1.3) * height * 0.075;
        ctx.strokeStyle = palette.accent;
        ctx.globalAlpha = 0.28 * energy;
        ctx.beginPath();
        ctx.moveTo(baseX + shift, top);
        ctx.lineTo(baseX + shift, bottom);
        ctx.stroke();
      }

      if (energy > 0.02) {
        ctx.strokeStyle = palette.accent;
        ctx.globalAlpha = 0.6 * energy;
        ctx.beginPath();
        ctx.moveTo(pointerX - 10, pointerY);
        ctx.lineTo(pointerX - 3, pointerY);
        ctx.moveTo(pointerX + 3, pointerY);
        ctx.lineTo(pointerX + 10, pointerY);
        ctx.moveTo(pointerX, pointerY - 10);
        ctx.lineTo(pointerX, pointerY - 3);
        ctx.moveTo(pointerX, pointerY + 3);
        ctx.lineTo(pointerX, pointerY + 10);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    };

    const pad = (value: number) => String(Math.max(0, Math.round(value))).padStart(4, '0');

    const step = () => {
      frame = 0;
      pointerX += (targetX - pointerX) * 0.1;
      pointerY += (targetY - pointerY) * 0.1;
      energy += (targetEnergy - energy) * 0.1;
      draw();
      if (readout) {
        readout.textContent = `X ${pad(pointerX)} / Y ${pad(pointerY)}`;
      }
      if (
        !reduce &&
        (Math.abs(targetX - pointerX) > 0.2 ||
          Math.abs(targetY - pointerY) > 0.2 ||
          Math.abs(targetEnergy - energy) > 0.002)
      ) {
        frame = requestAnimationFrame(step);
      }
    };

    const kick = () => {
      if (!frame) frame = requestAnimationFrame(step);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (reduce || event.pointerType === 'touch') return;
      const rect = canvas.getBoundingClientRect();
      targetX = event.clientX - rect.left;
      targetY = event.clientY - rect.top;
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
    pointerX = width / 2;
    pointerY = height / 2;
    targetX = pointerX;
    targetY = pointerY;
    draw();

    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw();
    });
    resizeObserver.observe(canvas);

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

  return (
    <>
      <canvas ref={canvasRef} className="field-canvas" aria-hidden="true" />
      <span ref={readoutRef} className="field-readout" aria-hidden="true">
        X — / Y —
      </span>
    </>
  );
}
