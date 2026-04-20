// ─── Individual expression loaders ───────────────────────────────────────────

const lazyExpressionLoaders = new Map<string, () => void | Promise<void>>();
const startedLazyExpressionLoads = new Set<string>();
const inFlightLazyExpressionLoads = new Map<string, Promise<void>>();

// ─── Group loaders ────────────────────────────────────────────────────────────

/** Maps group name → loader that registers all expressions in the group. */
const lazyGroupLoaders = new Map<string, () => void | Promise<void>>();
/** Maps expression string → the group it belongs to. */
const lazyExpressionToGroup = new Map<string, string>();
const startedLazyGroupLoads = new Set<string>();
const inFlightLazyGroupLoads = new Map<string, Promise<void>>();

// ─── Registration ─────────────────────────────────────────────────────────────

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

/**
 * Register a loader for a named group of lazy expressions.
 * When any expression in the group is first needed, the group loader is
 * invoked once, registering all expressions in that group together.
 */
export function registerLazyExpressionGroupPreloader(
  groupName: string,
  loader: () => void | Promise<void>,
): void {
  lazyGroupLoaders.set(groupName, loader);
}

/**
 * Declare that an expression belongs to a lazy group.
 * Called automatically by the generated lazy-group manifest on registration.
 */
export function registerLazyExpressionInGroup(
  expressionString: string,
  groupName: string,
): void {
  lazyExpressionToGroup.set(expressionString, groupName);
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function hasLazyExpressionPreloader(expressionString: string): boolean {
  return lazyExpressionLoaders.has(expressionString);
}

export function hasLazyGroupPreloader(groupName: string): boolean {
  return lazyGroupLoaders.has(groupName);
}

export function getLazyExpressionGroup(
  expressionString: string,
): string | undefined {
  return lazyExpressionToGroup.get(expressionString);
}

// ─── Triggering ───────────────────────────────────────────────────────────────

export function triggerLazyExpressionPreload(expressionString: string): void {
  void startLazyExpressionPreload(expressionString);
}

export function startLazyExpressionPreload(
  expressionString: string,
): Promise<void> | undefined {
  const groupName = lazyExpressionToGroup.get(expressionString);
  if (groupName) {
    return startLazyGroupPreload(groupName);
  }

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

export function startLazyGroupPreload(
  groupName: string,
): Promise<void> | undefined {
  if (startedLazyGroupLoads.has(groupName)) {
    return inFlightLazyGroupLoads.get(groupName);
  }

  const loader = lazyGroupLoaders.get(groupName);
  if (!loader) {
    return undefined;
  }

  startedLazyGroupLoads.add(groupName);
  try {
    const result = loader();
    const promise =
      result && typeof (result as Promise<unknown>).then === 'function'
        ? (result as Promise<void>)
        : Promise.resolve();
    inFlightLazyGroupLoads.set(groupName, promise);
    void promise
      .catch(() => {
        startedLazyGroupLoads.delete(groupName);
        inFlightLazyGroupLoads.delete(groupName);
      })
      .then(() => {
        inFlightLazyGroupLoads.delete(groupName);
      });
    return promise;
  } catch {
    startedLazyGroupLoads.delete(groupName);
    inFlightLazyGroupLoads.delete(groupName);
    return Promise.reject();
  }
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

export function clearLazyExpressionPreloaders(): void {
  lazyExpressionLoaders.clear();
  startedLazyExpressionLoads.clear();
  inFlightLazyExpressionLoads.clear();
  lazyGroupLoaders.clear();
  lazyExpressionToGroup.clear();
  startedLazyGroupLoads.clear();
  inFlightLazyGroupLoads.clear();
}
