'use client';

import { PresenceDial } from './presence-dial';
import { CHANNELS, STATES } from './presence-data';
import { usePresenceRegister } from './use-presence-register';

export function PresenceRegister() {
  const { rootRef, canvasRef, state, recording } = usePresenceRegister();
  const active = STATES.find((entry) => entry.key === state) ?? STATES[0];

  return (
    <div className="presence" ref={rootRef} aria-hidden="true">
      <div className="presence-head">
        <span className="presence-title-en">THE HAND, RECORDED</span>
        <span className={recording ? 'presence-status is-live' : 'presence-status'}>
          {recording ? 'REC' : 'CAL'}
        </span>
      </div>

      <div className="presence-body">
        <div className="presence-state">
          <PresenceDial state={state} />
          <span className="presence-state-meta">
            <span className="presence-state-en">{active.en}</span>
          </span>
        </div>

        <div className="presence-trace">
          <div className="presence-trace-head">
            <span>0</span>
            <span>15</span>
            <span>30 S</span>
          </div>
          <ol className="presence-labels">
            {CHANNELS.map((channel, index) => (
              <li key={channel.cn}>
                <b className="presence-label-num">{String(index + 1).padStart(2, '0')}</b>
                <span className="presence-label-cn">{channel.cn}</span>
              </li>
            ))}
          </ol>
          <div className="presence-plot">
            <canvas className="presence-canvas" ref={canvasRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
