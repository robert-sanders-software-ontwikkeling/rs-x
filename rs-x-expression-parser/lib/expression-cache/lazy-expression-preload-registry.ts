const lazyExpressionLoaders = new Map<
  string,
  () => void | Promise<void>
>();
const startedLazyExpressionLoads = new Set<string>();

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
  if (startedLazyExpressionLoads.has(expressionString)) {
    return;
  }

  const loader = lazyExpressionLoaders.get(expressionString);
  if (!loader) {
    return;
  }

  startedLazyExpressionLoads.add(expressionString);
  try {
    const result = loader();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      void (result as Promise<void>).catch(() => {
        startedLazyExpressionLoads.delete(expressionString);
      });
    }
  } catch {
    startedLazyExpressionLoads.delete(expressionString);
  }
}

export function clearLazyExpressionPreloaders(): void {
  lazyExpressionLoaders.clear();
  startedLazyExpressionLoads.clear();
}
