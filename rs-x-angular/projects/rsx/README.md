# RS-X Angular Pipe

The **RS-X Angular Extension** provides seamless integration of RS-X expressions within Angular templates. It allows you to bind expressions to your data models, making your templates fully reactive without extra boilerplate.

## Installation

Update the `dependencies` section in your `package.json` to include the required RS-X packages. You can ignore the version numbers and use the latest versions compatible with your Angular version. The latest RS-X packages are currently built with Angular 21. After updating, run `npm install` to install the dependencies.

```json
"dependencies": {
    "@rs-x/core": "^0.4.12",
    "@rs-x/state-manager": "^0.4.12",
    "@rs-x/expression-parser": "^0.4.12",
    "@rs-x/angular": "^0.4.12",
  },
```

## Prepare Angular application for using rs-x

Add the RS-X providers to the `providers` array when bootstrapping your Angular application. After that you can use the rsx-pipe and inject the rsx expression factory as a service

So

```ts
providers: [...providexRsx()];
```

Example:

```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import {
  provideRouter,
  withDebugTracing,
  withViewTransitions,
} from '@angular/router';
import { provideBrowserGlobalErrorListeners } from '@angular/core';
import { providexRsx } from '@rs-x/angular';

bootstrapApplication(App, {
  providers: [
    provideRouter([], withDebugTracing(), withViewTransitions()),
    provideBrowserGlobalErrorListeners(),
    ...providexRsx(),
  ],
}).catch((err) => console.error(err));
```

## Rsx pipe

The `rsx` pipe enables binding RS-X expressions or strings to Angular templates and automatically updates the view whenever the underlying data changes. It transforms expressions into reactive values, subscribes to changes, triggers Angular change detection, and cleans up subscriptions when no longer needed. It supports both synchronous and asynchronous data sources.

The value passed to the `rsx` pipe can be either an expression string or an expression tree. Expression trees are created by the expression factory. The `rsx` pipe also requires a model, as the expression tree is bound to that model to resolve the necessary data.

Example:

```ts
import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { RsxPipe } from '@rs-x/angular';
import { type IExpression } from '@rs-x/expression-parser';


@Component({
  selector: 'rsx-field',
  standalone: true,
  imports: [ RsxPipe],
  template: ' {{ expression | rsx: model }}',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RsxField {
    @Input()  expression!: string | IExpression;
    @Input()  model!: object;
```

## Injection the expression factory and change transaction manager

- **Expression Factory**: Used to translate a JavaScript expression string into an observable expression tree.
- **Change Transaction Manager**: Used to temporarily suspend change event emission, allowing you to update the model without emitting more than one change event per expression.

The example below shows how you can use these two services.

```ts
import { inject, Injectable } from '@angular/core';

import {
  IExpressionChangeTransactionManagerToken,
  IExpressionFactoryToken,
} from '@rs-x/angular';
import { IExpression } from '@rs-x/expression-parser';

import { Observable, Subject, Subscription } from 'rxjs';

interface IModel {
  x: number;
  r: number;
}

@Injectable({ providedIn: 'root' })
export class MyFormula {
  private _isDisposed = false;
  private readonly _expressionFactory = inject(IExpressionFactoryToken);
  private readonly _expressionChangeTransactionManager = inject(
    IExpressionChangeTransactionManagerToken,
  );
  private readonly _changed: Subject<number | undefined>;
  private readonly _changedSubscription: Subscription;
  private readonly _expression: IExpression<number | undefined>;
  private readonly _model: IModel = {
    x: 10,
    r: 2,
  };

  constructor() {
    this._changed = new Subject();
    this._expression = this._expressionFactory.create(
      this._model,
      'r * x * (1 - x)',
    );
    this._changedSubscription = this._expression.changed.subscribe(() =>
      this._changed.next(this._expression.value),
    );
  }

  public get changed(): Observable<number | undefined> {
    return this._changed;
  }

  public dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._expression.dispose();
    this._changedSubscription.unsubscribe();
    this._isDisposed = true;
  }

  public update(r: number, x: number): void {
    // Suspend change event emission to prevent emitting it twice
    this._expressionChangeTransactionManager.suspend();
    this._model.r = r;
    this._model.x = x;
    this._expressionChangeTransactionManager.continue();
  }
}
```

## Benefits

- **Reactive Templates:** Automatically updates Angular views whenever bound data changes.
- **Supports Complex Data:** Works with synchronous, asynchronous, or mixed data models.
- **Minimal Boilerplate:** No manual subscriptions or change detection needed.
- **Full Angular Integration:** Works seamlessly with Angular’s dependency injection and change detection system.

## References

- [RS-X]('../../../readme.md')
- [RS-X core]('../../../rs-x-core/readme.md')
- [RS-X state manager]('../../../rs-x-state-manager/readme.md')
- [RS-X expression parser]('../../../rs-x-expression-parser/readme.md')
- [RS=X angular demo](https://stackblitz.com/~/github.com/robert-sanders-software-ontwikkeling/rs-x-angular-demo)
