'use client';

import { useEffect, useState } from 'react';

const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Shanghai',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export function Clock() {
  const [value, setValue] = useState('--:--:--');

  useEffect(() => {
    const tick = () => setValue(formatter.format(new Date()));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <time className="clock" aria-live="off">
      {value}
      <span>CST</span>
    </time>
  );
}
