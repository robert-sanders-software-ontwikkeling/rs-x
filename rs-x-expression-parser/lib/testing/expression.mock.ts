import { Subject } from 'rxjs';

import type { IExpressionBindConfiguration } from '../expressions/expression-bind-configuration.type';
import {
  type ChangeHook,
  type ExpressionType,
  type IExpression,
} from '../expressions/expression-parser.interface';

export class ExpressionMock implements IExpression {
  public readonly id!: string;
  public readonly changed = new Subject<IExpression<unknown>>();
  public readonly type!: ExpressionType;
  public readonly expressionString!: string;
  public readonly parent!: IExpression<unknown> | undefined;
  public readonly childExpressions!: readonly IExpression<unknown>[];
  public readonly value!: unknown;
  public readonly isRoot!: boolean;
  public readonly isAsync!: boolean | undefined;
  public readonly isDisposed!: boolean;
  public readonly hidden!: boolean;

  constructor(properties?: Partial<IExpression>) {
    Object.assign(this, properties);
  }

  public readonly changeHook?: ChangeHook | undefined;
  public readonly toString = (): string => '';
  public readonly clone = (): this => this;
  public readonly bind = (
    _settings: IExpressionBindConfiguration,
  ): IExpression<unknown> => this;
  public readonly dispose = (): void => {};
}
