type Fields = Record<string, string | number | boolean | null | undefined>;

function write(level: 'info' | 'warn' | 'error', event: string, fields: Fields) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...fields,
  });
  if (level === 'info') {
    process.stdout.write(`${line}\n`);
    return;
  }
  process.stderr.write(`${line}\n`);
}

export function logInfo(event: string, fields: Fields = {}) {
  write('info', event, fields);
}

export function logWarn(event: string, fields: Fields = {}) {
  write('warn', event, fields);
}

export function logError(event: string, fields: Fields = {}) {
  write('error', event, fields);
}
