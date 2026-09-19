type Level = 'debug' | 'info' | 'warn' | 'error';

const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function configuredLevel(): Level {
  const value = (process.env.LOG_LEVEL || 'info').toLowerCase() as Level;
  return order[value] ? value : 'info';
}

function write(level: Level, message: string, meta?: unknown): void {
  if (order[level] < order[configuredLevel()]) return;
  const entry = {
    time: new Date().toISOString(),
    level,
    message,
    ...(meta === undefined ? {} : { meta })
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (message: string, meta?: unknown) => write('debug', message, meta),
  info: (message: string, meta?: unknown) => write('info', message, meta),
  warn: (message: string, meta?: unknown) => write('warn', message, meta),
  error: (message: string, meta?: unknown) => write('error', message, meta)
};
