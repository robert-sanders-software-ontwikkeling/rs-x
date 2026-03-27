import type {
  IExpressionEvaluateChangeManager,
  IExpressionEvaluateUnit,
} from '../expression-evaluate-manager/expression-evaluate-unit.interface';

function createMock<Fn extends (...args: never[]) => unknown>(
  implementation?: Fn,
): Fn {
  const maybeJest = (
    globalThis as {
      jest?: {
        fn: (impl?: (...args: never[]) => unknown) => unknown;
      };
    }
  ).jest;
  if (maybeJest) {
    return maybeJest.fn(implementation as (...args: never[]) => unknown) as Fn;
  }
  return ((...args: never[]) => implementation?.(...args)) as unknown as Fn;
}

export class ExpressionEvaluateChangeManagerMock implements IExpressionEvaluateChangeManager {
  constructor(properties?: Partial<IExpressionEvaluateChangeManager>) {
    Object.assign(this, properties);
  }

  public readonly isInitialized: () => boolean = createMock(() => true);
  public readonly incrementChangeCycle: () => void = createMock(
    () => undefined,
  );
  public readonly decrementChangeCycle: () => void = createMock(
    () => undefined,
  );
  public readonly markDirty: (evaluateUnit: IExpressionEvaluateUnit) => void =
    createMock((_evaluateUnit: IExpressionEvaluateUnit) => {});
}
