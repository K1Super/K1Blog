export const WINDOW_SECONDS = 30;
export const CAPACITY = 240;
export const SAMPLE_INTERVAL = (WINDOW_SECONDS * 1000) / CAPACITY;
export const IDLE_AFTER = 1000;
export const FRESH_SAMPLES = 14;

export const STATES = [
  { key: 'still', cn: '静', en: 'STILL', angle: -90 },
  { key: 'drift', cn: '移', en: 'DRIFT', angle: -18 },
  { key: 'hold', cn: '停', en: 'HOLD', angle: 54 },
  { key: 'turn', cn: '返', en: 'TURN', angle: 126 },
  { key: 'rush', cn: '疾', en: 'RUSH', angle: 198 },
] as const;

export type PresenceState = (typeof STATES)[number]['key'];

export const CHANNELS = [{ cn: '横移' }, { cn: '速度' }, { cn: '折返' }] as const;

const fixed = (value: number) => Math.round(value * 1000) / 1000;

export const DIAL_TICKS = Array.from({ length: 20 }, (_, index) => {
  const rad = ((index * 18 - 90) * Math.PI) / 180;
  const inner = index % 4 === 0 ? 86 : 93;
  return {
    key: index,
    x1: fixed(120 + Math.cos(rad) * inner),
    y1: fixed(120 + Math.sin(rad) * inner),
    x2: fixed(120 + Math.cos(rad) * 100),
    y2: fixed(120 + Math.sin(rad) * 100),
    major: index % 4 === 0,
  };
});
