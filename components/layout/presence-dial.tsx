import { DIAL_TICKS, STATES, type PresenceState } from './presence-data';

type PresenceDialProps = {
  state: PresenceState;
};

export function PresenceDial({ state }: PresenceDialProps) {
  const active = STATES.find((entry) => entry.key === state) ?? STATES[0];

  return (
    <div className="presence-dial">
      <svg className="presence-dial-svg" viewBox="0 0 240 240" aria-hidden="true">
        <circle className="presence-dial-rim" cx="120" cy="120" r="100" />
        <circle className="presence-dial-inner" cx="120" cy="120" r="58" />
        {DIAL_TICKS.map((tick) => (
          <line
            key={tick.key}
            className={tick.major ? 'presence-dial-tick is-major' : 'presence-dial-tick'}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
          />
        ))}
        <g className="presence-dial-needle" style={{ transform: `rotate(${active.angle}deg)` }}>
          <line className="presence-dial-cursor-line" x1="120" y1="86" x2="120" y2="99" />
          <path className="presence-dial-cursor" d="M120 81 L115.5 90 L124.5 90 Z" />
        </g>
      </svg>
      <div className="presence-dial-core">
        <span className="presence-state-char" key={active.key}>
          {active.cn}
        </span>
      </div>
    </div>
  );
}
