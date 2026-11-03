'use client';

import { useEffect, useRef, useState } from 'react';

import {
  CAPACITY,
  CHANNELS,
  FRESH_SAMPLES,
  IDLE_AFTER,
  SAMPLE_INTERVAL,
  type PresenceState,
} from './presence-data';

type Palette = {
  line: string;
  strong: string;
  accent: string;
};

function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  return {
    line: style.getPropertyValue('--rule').trim() || 'rgba(233, 227, 214, 0.14)',
    strong: style.getPropertyValue('--rule-strong').trim() || 'rgba(233, 227, 214, 0.3)',
    accent: style.getPropertyValue('--amber').trim() || '#d49a45',
  };
}

export function usePresenceRegister() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<PresenceState>('still');
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!root || !canvas || !ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const buffers = {
      x: new Float32Array(CAPACITY),
      v: new Float32Array(CAPACITY),
      r: new Float32Array(CAPACITY),
    };
    let palette = readPalette();
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let lastSampleAt = 0;
    let lastMoveAt = -Infinity;
    let lastEventAt = 0;
    let lastX = 0;
    let lastY = 0;
    let lastDx = 0;
    let pointerX = 0.5;
    let speed = 0;
    let turns = 0;
    let activeState: PresenceState = 'still';
    let candidate: PresenceState = 'still';
    let candidateTicks = 0;
    let hasRecorded = false;

    for (let i = 0; i < CAPACITY; i += 1) {
      const burst = (at: number, span: number) => Math.max(0, 1 - Math.abs(i - at) / span);
      buffers.x[i] =
        Math.sin(i * 0.035) * 0.4 + Math.sin(i * 0.11) * 0.16 + Math.sin(i * 1.9) * 0.02;
      buffers.v[i] = 0.06 + Math.max(burst(42, 20), burst(126, 26), burst(204, 18)) * 0.62;
      buffers.r[i] = (i > 68 && i < 92) || (i > 152 && i < 178) ? 0.58 : 0.06;
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawSeries = (buffer: Float32Array, index: number) => {
      const row = height / CHANNELS.length;
      const baseline = row * (index + 0.5);
      const amplitude = row * 0.4;
      const step = width / (CAPACITY - 1);

      ctx.strokeStyle = palette.strong;
      ctx.globalAlpha = 0.62;
      ctx.beginPath();
      for (let i = 0; i < CAPACITY; i += 1) {
        const y = baseline - (buffer[i] ?? 0) * amplitude;
        if (i === 0) ctx.moveTo(0, y);
        else ctx.lineTo(i * step, y);
      }
      ctx.stroke();

      ctx.strokeStyle = palette.accent;
      ctx.globalAlpha = 0.42;
      ctx.beginPath();
      for (let i = CAPACITY - FRESH_SAMPLES; i < CAPACITY; i += 1) {
        const y = baseline - (buffer[i] ?? 0) * amplitude;
        if (i === CAPACITY - FRESH_SAMPLES) ctx.moveTo(i * step, y);
        else ctx.lineTo(i * step, y);
      }
      ctx.stroke();

      const last = buffer[CAPACITY - 1] ?? 0;
      ctx.fillStyle = palette.accent;
      ctx.globalAlpha = 0.78;
      ctx.fillRect(width - 3, baseline - last * amplitude - 1, 2, 2);
    };

    const draw = () => {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);
      const row = height / CHANNELS.length;
      const step = width / (CAPACITY - 1);

      ctx.strokeStyle = palette.line;
      ctx.lineWidth = 1;
      for (let i = 0; i <= CAPACITY; i += 120) {
        ctx.globalAlpha = i % 240 === 0 ? 0.5 : 0.28;
        ctx.beginPath();
        ctx.moveTo(i * step, 0);
        ctx.lineTo(i * step, height);
        ctx.stroke();
      }

      for (let index = 0; index < CHANNELS.length; index += 1) {
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.moveTo(0, row * (index + 0.5));
        ctx.lineTo(width, row * (index + 0.5));
        ctx.stroke();
      }

      drawSeries(buffers.x, 0);
      drawSeries(buffers.v, 1);
      drawSeries(buffers.r, 2);

      ctx.strokeStyle = palette.strong;
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.moveTo(width - 0.5, 0);
      ctx.lineTo(width - 0.5, height);
      ctx.stroke();

      ctx.globalAlpha = 1;
    };

    const commit = (next: PresenceState) => {
      if (next === activeState) return;
      activeState = next;
      setState(next);
    };

    const classify = (now: number) => {
      if (now - lastMoveAt > IDLE_AFTER) {
        commit('still');
        return;
      }
      const next: PresenceState =
        speed > 1100 ? 'rush' : turns > 1 ? 'turn' : speed < 130 ? 'hold' : 'drift';
      if (next !== candidate) {
        candidate = next;
        candidateTicks = 0;
      }
      candidateTicks += 1;
      if (candidateTicks > 1) commit(next);
    };

    const shift = (buffer: Float32Array, value: number) => {
      buffer.copyWithin(0, 1);
      buffer[CAPACITY - 1] = value;
    };

    const sample = (now: number) => {
      classify(now);
      shift(buffers.x, pointerX * 2 - 1);
      shift(buffers.v, Math.min(1, speed / 1200));
      shift(buffers.r, Math.min(1, turns / 3));
      speed *= 0.8;
      turns *= 0.92;
    };

    const tick = (now: number) => {
      frame = 0;

      if (now - lastMoveAt > IDLE_AFTER) {
        commit('still');
        draw();
        return;
      }

      if (now - lastSampleAt >= SAMPLE_INTERVAL) {
        lastSampleAt = now;
        sample(now);
        draw();
      }

      frame = requestAnimationFrame(tick);
    };

    const kick = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (reduce || event.pointerType === 'touch') return;
      const now = performance.now();
      const rect = root.getBoundingClientRect();
      pointerX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));

      if (lastEventAt) {
        const ms = Math.min(400, Math.max(16, now - lastEventAt));
        const distance = Math.hypot(event.clientX - lastX, event.clientY - lastY);
        speed = speed * 0.7 + Math.min(1600, (distance / ms) * 1000) * 0.3;
        const dx = event.clientX - lastX;
        if (lastDx !== 0 && Math.sign(dx) !== Math.sign(lastDx) && Math.abs(dx) > 6) {
          turns = Math.min(3, turns + 1);
        }
        if (Math.abs(dx) > 2) lastDx = dx;
      }

      lastX = event.clientX;
      lastY = event.clientY;
      lastEventAt = now;
      lastMoveAt = now;

      if (!hasRecorded) {
        hasRecorded = true;
        setRecording(true);
      }
      kick();
    };

    resize();
    draw();

    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw();
    });
    resizeObserver.observe(canvas);

    const themeObserver = new MutationObserver(() => {
      palette = readPalette();
      draw();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    if (!reduce) window.addEventListener('pointermove', onPointerMove, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return { rootRef, canvasRef, state, recording };
}
