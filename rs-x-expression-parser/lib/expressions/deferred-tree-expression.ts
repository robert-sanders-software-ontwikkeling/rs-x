import { type Observable, ReplaySubject, type Subscription } from 'rxjs';

import { AbstractExpression } from './abstract-expression';
import type { IExpressionBindConfiguration } from './expression-bind-configuration.type';
import {
  type ChangeHook,
  ExpressionType,
  type IExpression,
} from './expression-parser.interface';

export class DeferredTreeExpression extends AbstractExpression {
  private readonly _subject = new ReplaySubject<IExpression>(1);
  private _resolvedExpression: AbstractExpression | undefined;
  private _pendingBindSettings: IExpressionBindConfiguration | undefined;
  private _loadStarted = false;
  private _resolvedSubscription: Subscription | undefined;
  private _changeHookValue: ChangeHook | undefined;
  private _lastValue: unknown;

  constructor(
    expressionString: string,
    private readonly _startLoad: () => Promise<AbstractExpression | undefined>,
  ) {
    super(ExpressionType.Identifier, expressionString);
  }

  public override get changed(): Observable<IExpression> {
    return this._resolvedExpression?.changed ?? this._subject;
  }

  public override get value(): unknown {
    return this._resolvedExpression?.value;
  }

  public override get childExpressions(): readonly AbstractExpression[] {
    return (
      (this._resolvedExpression
        ?.childExpressions as readonly AbstractExpression[]) ?? []
    );
  }

  public override get parent(): AbstractExpression | undefined {
    return this._resolvedExpression?.parent;
  }

  public override get hidden(): boolean {
    return this._resolvedExpression?.hidden ?? false;
  }

  public override get isAsync(): boolean | undefined {
    return this._resolvedExpression?.isAsync ?? true;
  }

  public override get changeHook() {
    return this._changeHookValue;
  }

  public override set changeHook(value) {
    this._changeHookValue = value;
    if (this._resolvedExpression) {
      this._resolvedExpression.changeHook = value;
    }
  }

  public override clone(): this {
    return new DeferredTreeExpression(
      this.expressionString,
      this._startLoad,
    ) as this;
  }

  public override bind(settings: IExpressionBindConfiguration): this {
    if (this._resolvedExpression) {
      this._resolvedExpression.bind(settings);
      if (this._changeHookValue !== undefined) {
        this._resolvedExpression.changeHook = this._changeHookValue;
      }
      return this;
    }

    this._pendingBindSettings = settings;
    this.startLoading();
    return this;
  }

  public override dispose(): void {
    this._resolvedSubscription?.unsubscribe();
    this._resolvedSubscription = undefined;
    this._resolvedExpression?.dispose();
    super.dispose();
  }

  protected override evaluate(): unknown {
    return this._resolvedExpression?.value;
  }

  protected override onBind(_settings: IExpressionBindConfiguration): void {}

  private startLoading(): void {
    if (this._loadStarted) {
      return;
    }

    this._loadStarted = true;
    void this._startLoad().then((expression) => {
      if (!expression || this.isDisposed || !this._pendingBindSettings) {
        return;
      }

      const resolvedExpression = expression.clone();
      if (this._changeHookValue !== undefined) {
        resolvedExpression.changeHook = this._changeHookValue;
      }

      resolvedExpression.bind(this._pendingBindSettings);
      this._resolvedExpression = resolvedExpression;
      this._resolvedSubscription = resolvedExpression.changed.subscribe(() => {
        const oldValue = this._lastValue;
        this._lastValue = resolvedExpression.value;
        if (this._changeHookValue) {
          this._changeHookValue(this, oldValue);
        }
        this._subject.next(this);
      });

      if (resolvedExpression.value !== undefined) {
        this._lastValue = resolvedExpression.value;
        this._subject.next(this);
      }
    });
  }
}
