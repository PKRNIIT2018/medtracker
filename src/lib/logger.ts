export function log(event: string, meta?: Record<string, unknown>) {
  console.log(JSON.stringify({ event, ...meta, timestamp: new Date().toISOString() }));
}

export function logError(event: string, error: unknown, meta?: Record<string, unknown>) {
  const err = error instanceof Error
    ? { message: error.message, name: error.name, stack: error.stack }
    : error;

  console.error(JSON.stringify({ event, error: err, ...meta, timestamp: new Date().toISOString() }));
}
