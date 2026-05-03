import type {
  ChangeHook,
  IExpression,
  IExpressionTree,
} from './expressions/expression-parser.interface';

export interface IRsxDebugExpressionInstance {
  readonly expressionName: string;
  readonly instanceId?: string;
  readonly source?: {
    readonly fileName?: string;
    readonly start?: number;
    readonly end?: number;
  };
}

export type RsxDebugChangeHook = (
  instance: IRsxDebugExpressionInstance,
  expression: IExpressionTree,
  oldValue: unknown,
) => void;

declare global {
  var __RSX_DEBUG_CHANGE_HOOK__: RsxDebugChangeHook | undefined;
}

export function setRsxDebugChangeHook(
  changeHook: RsxDebugChangeHook | undefined,
): { dispose(): void } {
  const previous = getRsxDebugChangeHook();
  setGlobalRsxDebugChangeHook(changeHook);
  return {
    dispose(): void {
      setGlobalRsxDebugChangeHook(previous);
    },
  };
}

export function getRsxDebugChangeHook(): RsxDebugChangeHook | undefined {
  return globalThis.__RSX_DEBUG_CHANGE_HOOK__;
}

export function applyRsxDebugChangeHook<T extends IExpression>(
  expression: T,
  instance: IRsxDebugExpressionInstance,
  debugChangeHook?: RsxDebugChangeHook,
): T {
  const descriptor = findChangeHookDescriptor(expression);
  if (!descriptor?.set || !descriptor.get) {
    const userHook = expression.changeHook;
    const combinedHook = createCombinedRsxChangeHook(
      instance,
      userHook,
      debugChangeHook,
    );
    expression.changeHook = combinedHook;
    ensureInitialRsxDebugChangeHook(expression, combinedHook);
    return expression;
  }

  let userHook = descriptor.get.call(expression) as ChangeHook | undefined;
  const combinedHook = createCombinedRsxChangeHook(
    instance,
    (...args) => userHook?.(...args),
    debugChangeHook,
  );

  Object.defineProperty(expression, 'changeHook', {
    configurable: true,
    enumerable: true,
    get(): ChangeHook {
      return combinedHook;
    },
    set(value: ChangeHook | undefined): void {
      userHook = value;
      descriptor.set?.call(expression, combinedHook);
    },
  });
  descriptor.set.call(expression, combinedHook);
  ensureInitialRsxDebugChangeHook(expression, combinedHook);
  return expression;
}

function createCombinedRsxChangeHook(
  instance: IRsxDebugExpressionInstance,
  userHook: ChangeHook | undefined,
  debugChangeHook: RsxDebugChangeHook | undefined,
): ChangeHook {
  return (expression, oldValue) => {
    (debugChangeHook ?? getRsxDebugChangeHook())?.(
      instance,
      expression,
      oldValue,
    );
    userHook?.(expression, oldValue);
  };
}

function ensureInitialRsxDebugChangeHook(
  expression: IExpression,
  changeHook: ChangeHook,
): void {
  if (expression.value !== undefined) {
    return;
  }
  let subscription: { unsubscribe(): void } | undefined;
  subscription = expression.changed.subscribe((changedExpression) => {
    subscription?.unsubscribe();
    changeHook(changedExpression as IExpressionTree, undefined);
  });
}

function setGlobalRsxDebugChangeHook(
  changeHook: RsxDebugChangeHook | undefined,
): void {
  if (changeHook) {
    globalThis.__RSX_DEBUG_CHANGE_HOOK__ = changeHook;
  } else {
    delete globalThis.__RSX_DEBUG_CHANGE_HOOK__;
  }
}

function findChangeHookDescriptor(
  expression: IExpression,
): PropertyDescriptor | undefined {
  let prototype: object | null = expression;
  while (prototype) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'changeHook');
    if (descriptor) {
      return descriptor;
    }
    prototype = Object.getPrototypeOf(prototype);
  }
  return undefined;
}
