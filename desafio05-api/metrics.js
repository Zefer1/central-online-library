export function emitMetric(event, payload = {}) {
  if (process.env.DISABLE_ANALYTICS === 'true') return;
  try {
    const entry = { event, ...payload, ts: Date.now() };
    // Hook point: replace with your analytics sink
    console.info('[metric]', JSON.stringify(entry));
  } catch (_err) {
    // avoid crashing on metrics failures
  }
}
