const lazyExpressionLoaders = new Map<string, () => void | Promise<void>>();
const startedLazyExpressionLoads = new Set<string>();
const inFlightLazyExpressionLoads = new Map<string, Promise<void>>();

export function registerLazyExpressionPreloader(
  expressionString: string,
  loader: () => void | Promise<void>,
): void {
  lazyExpressionLoaders.set(expressionString, loader);
}

export function registerLazyExpressionPreloaders(
  loaders: Readonly<Record<string, () => void | Promise<void>>>,
): void {
  for (const [expressionString, loader] of Object.entries(loaders)) {
    lazyExpressionLoaders.set(expressionString, loader);
  }
}

export function triggerLazyExpressionPreload(expressionString: string): void {
  void startLazyExpressionPreload(expressionString);
}

export function hasLazyExpressionPreloader(expressionString: string): boolean {
  return lazyExpressionLoaders.has(expressionString);
}

export function startLazyExpressionPreload(
  expressionString: string,
): Promise<void> | undefined {
  if (startedLazyExpressionLoads.has(expressionString)) {
    return inFlightLazyExpressionLoads.get(expressionString);
  }

  const loader = lazyExpressionLoaders.get(expressionString);
  if (!loader) {
    return undefined;
  }

  startedLazyExpressionLoads.add(expressionString);
  try {
    const result = loader();
    const promise =
      result && typeof (result as Promise<unknown>).then === 'function'
        ? (result as Promise<void>)
        : Promise.resolve();
    inFlightLazyExpressionLoads.set(expressionString, promise);
    void promise
      .catch(() => {
        startedLazyExpressionLoads.delete(expressionString);
        inFlightLazyExpressionLoads.delete(expressionString);
      })
      .then(() => {
        inFlightLazyExpressionLoads.delete(expressionString);
      });
    return promise;
  } catch {
    startedLazyExpressionLoads.delete(expressionString);
    inFlightLazyExpressionLoads.delete(expressionString);
    return Promise.reject();
  }
}

export function clearLazyExpressionPreloaders(): void {
  lazyExpressionLoaders.clear();
  startedLazyExpressionLoads.clear();
  inFlightLazyExpressionLoads.clear();
}
