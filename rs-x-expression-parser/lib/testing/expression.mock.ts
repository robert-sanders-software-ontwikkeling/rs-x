import { ObservableMock } from '@rs-x/core/testing';

import type { IExpressionBindConfiguration } from '../expressions/expression-bind-configuration.type';
import {
  type ChangeHook,
  type ExpressionType,
  type IExpression,
} from '../expressions/expression-parser.interface';

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

export class ExpressionMock implements IExpression {
  public readonly id!: string;
  public readonly changed = new ObservableMock();
  public readonly type!: ExpressionType;
  public readonly expressionString!: string;
  public readonly parent!: IExpression<unknown, unknown> | undefined;
  public readonly childExpressions!: readonly IExpression<unknown, unknown>[];
  public readonly value!: unknown;
  public readonly isRoot!: boolean;
  public readonly isAsync!: boolean | undefined;
  public readonly isDisposed!: boolean;
  public readonly hidden!: boolean;

  constructor(properties?: Partial<IExpression>) {
    Object.assign(this, properties);
  }

  public readonly changeHook?: ChangeHook | undefined;
  public readonly toString: () => string = createMock(() => '');
  public readonly clone: () => this = createMock(() => this);
  public readonly bind: (
    settings: IExpressionBindConfiguration,
  ) => IExpression<unknown, unknown> = createMock(() => this);
  public readonly dispose: () => void = createMock(() => undefined);
}
