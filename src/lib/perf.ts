/**
 * Dev-only performance probe. Logs how long a POS interaction took (add-to-cart, cart
 * calc, payment update, invoice save) so regressions against the <50ms targets are
 * visible during development. Compiled out / silent in production builds.
 */
export function perf<T>(label: string, fn: () => T): T {
  if (!import.meta.env.DEV) return fn();
  const start = performance.now();
  const result = fn();
  const ms = performance.now() - start;
  // eslint-disable-next-line no-console
  console.debug(`[perf] ${label}: ${ms.toFixed(2)}ms`);
  return result;
}

/** Mark the start of an async interaction; call the returned fn when it completes. */
export function perfStart(label: string): () => void {
  if (!import.meta.env.DEV) return () => {};
  const start = performance.now();
  return () => {
    // eslint-disable-next-line no-console
    console.debug(`[perf] ${label}: ${(performance.now() - start).toFixed(2)}ms`);
  };
}
