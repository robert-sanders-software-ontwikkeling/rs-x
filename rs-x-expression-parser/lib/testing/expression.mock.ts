import { Subject } from 'rxjs';

import {
  type ChangeHook,
  type ExpressionType,
  type IExpression,
} from '../expressions/expression-parser.interface';

declare const jest: {
  fn: <T extends (...args: any[]) => any>(implementation?: T) => T;
};

export class ExpressionMock implements IExpression {
  public readonly id!: string;
  public readonly changed = new Subject<IExpression<unknown, unknown>>();
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
  public readonly toString = jest.fn();
  public readonly clone = jest.fn();
  public readonly bind = jest.fn();
  public readonly dispose = jest.fn();
}
