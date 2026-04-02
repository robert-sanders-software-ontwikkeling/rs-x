import dedent from 'dedent';
import type { Metadata } from 'next';

import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../../core-concepts/_template/core-concept-page';

const demoLinks = (
  <div className="docsApiActions" style={{ marginTop: '1rem' }}>
    <a
      className="btn btnGhost"
      href="https://stackblitz.com/~/github.com/robert-sanders-software-ontwikkeling/rs-x-angular-demo"
      target="_blank"
      rel="noopener noreferrer"
    >
      Open in StackBlitz <span aria-hidden="true">↗</span>
    </a>
    <a
      className="btn btnGhost"
      href="https://github.com/robert-sanders-software-ontwikkeling/rs-x-angular-demo"
      target="_blank"
      rel="noopener noreferrer"
    >
      View on GitHub <span aria-hidden="true">↗</span>
    </a>
  </div>
);

const installCode = dedent`
  npm install @rs-x/core @rs-x/state-manager @rs-x/expression-parser @rs-x/angular
`;

const provideRsxCode = dedent`
  // app.config.ts
  import { ApplicationConfig } from '@angular/core';
  import { providexRsx } from '@rs-x/angular';

  export const appConfig: ApplicationConfig = {
    providers: [
      // ... other providers
      ...providexRsx(),
    ],
  };
`;

const provideRsxNgModuleCode = dedent`
  // app.module.ts  (NgModule-based apps)
  import { NgModule } from '@angular/core';
  import { RsxPipe, providexRsx } from '@rs-x/angular';

  @NgModule({
    declarations: [AppComponent],
    imports: [RsxPipe],
    providers: [...providexRsx()],
    bootstrap: [AppComponent],
  })
  export class AppModule {}
`;

const rsxPipeStringCode = dedent`
  // component.ts
  import { Component } from '@angular/core';
  import { RsxPipe } from '@rs-x/angular';

  @Component({
    selector: 'app-greeting',
    standalone: true,
    imports: [RsxPipe],
    template: '<p>{{ \`\${firstName} \${lastName}\` | rsx: model }}</p>',
  })
  export class GreetingComponent {
    model = {
      firstName: 'Jane',
      lastName: 'Doe',
    };
  }

  // Mutate the model — the template updates automatically
  // this.model.firstName = 'Alice';
`;

const rsxPipePrebuiltCode = dedent`
  // component.ts
  import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
  import { FormsModule } from '@angular/forms';
  import { rsx } from '@rs-x/expression-parser';
  import { RsxPipe } from '@rs-x/angular';

  @Component({
    selector: 'app-order-total',
    standalone: true,
    imports: [RsxPipe, FormsModule],
    template: \`
      <input type="number" [(ngModel)]="model.quantity" />
      <span>Total: {{ totalExpr | rsx }}</span>
    \`,
    changeDetection: ChangeDetectionStrategy.OnPush
  })
  export class OrderTotalComponent implements OnDestroy {
    private readonly model = { price: 100, quantity: 3 };
    public readonly totalExpr = rsx('price * quantity')(this.model);

    public ngOnDestroy(): void {
        this.totalExpr.dispose(); 
    }
  }
`;

const rsxPipeAsyncCode = dedent`
  // component.ts
  import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
  import { BehaviorSubject } from 'rxjs';
  import { rsx } from '@rs-x/angular';
  import { RsxPipe } from '@rs-x/angular';

  @Component({
    selector: 'app-live-price',
    standalone: true,
    imports: [RsxPipe],
    template: \`
      <p>Price (inc. tax): {{ price | rsx }}</p>
    \`,
    changeDetection: ChangeDetectionStrategy.OnPush
  })
  export class LivePriceComponent implements OnDestroy {
    private readonly model = {
      base: new BehaviorSubject(100),
      taxRate: 0.21,
    };

    public readonly price = rsx('base * (1 + taxRate)' )(this.model);

    public ngOnDestroy(): void {
        this.price.dispose(); 
    }

    public updatePrice(newBase: number): void {
      this.model.base.next(newBase); // template updates automatically
    }
  }
`;

const rsxPipeNullCode = dedent`
  // Passing null or undefined is safe — the pipe renders nothing
  // and does not create or hold an expression.

  @Component({
    template: \`
      <span>{{ maybeExpr | rsx }}</span>
    \`,
  })
  export class SafeComponent {
    maybeExpr: string | null = null; // renders as empty string
  }
`;

const injectionTokensCode = dedent`
  import { inject, Component } from '@angular/core';
  import { rsx } from '@rs-x/expression-parser';
  import {
    IExpressionChangeTransactionManagerToken,
  } from '@rs-x/angular';

  @Component({ selector: 'app-manual', standalone: true, template: '' })
  export class ManualComponent {
    private readonly txManager = inject(IExpressionChangeTransactionManagerToken);

    public ngOnInit() {
      const model = { a: 1, b: 2 };
      const expr = rsx('a + b')(model);

      // Batch multiple model mutations into a single change notification
      this.txManager.suspend();
      model.a = 10;
      model.b = 20;
      this.txManager.continue(); // expr fires changed once, not twice
    }
  }
`;

const doc: CoreConceptDoc = {
  title: 'Angular integration',
  lead: "Bind rs-x expressions to Angular templates with the RsxPipe — reactive updates propagate automatically using Angular's change detection, with no manual subscriptions.",
  whatItMeans:
    "@rs-x/angular ships two exports: the RsxPipe impure pipe and the providexRsx() provider function. The pipe wraps an rs-x expression (string or pre-built IExpression) and calls ChangeDetectorRef.markForCheck() whenever the expression value changes. providexRsx() wires the rs-x DI container into Angular's dependency injection system during APP_INITIALIZER.",
  whyItMatters:
    'You write plain model mutations anywhere in your app — a service, a WebSocket handler, or a button click — and every template that reads that data updates automatically. No BehaviorSubjects, no ngrx actions, no manually managed subscriptions. The pipe is impure by design so Angular calls transform() on each change-detection cycle, but it only allocates a new expression when the input actually changes.',
  keyPoints: [
    'The pipe is impure (pure: false) — Angular checks it every change-detection cycle, but the pipe itself only recreates the expression when the expression string or context object changes.',
    'Pass an expression string and a context object: {{ "a + b" | rsx: model }}. Or pass a pre-built IExpression and omit the context: {{ expr | rsx }}. This is the preferred way, as RS-X does not yet support strongly typed expressions within HTML.',
    'When the pipe owns the expression (string input), it disposes the expression on ngOnDestroy. When you pass a pre-built IExpression, the pipe only subscribes — you own the lifecycle.',
    'providexRsx() registers three providers: an APP_INITIALIZER that loads the rs-x module, IExpressionFactoryToken, and IExpressionChangeTransactionManagerToken.',
    'Use IExpressionChangeTransactionManagerToken to batch multiple model mutations into a single change notification — important for performance when updating many fields at once.',
    'Passing null or undefined to the pipe is safe — it renders nothing and cleans up any previous expression.',
  ],
  examples: [
    {
      title: 'Setup — standalone app',
      description: 'Register rs-x providers in your ApplicationConfig.',
      code: provideRsxCode,
    },
    {
      title: 'Setup — NgModule app',
      description:
        'Import RsxPipe and spread providexRsx() into your providers array.',
      code: provideRsxNgModuleCode,
    },
    {
      title: 'RsxPipe — string expression',
      description:
        'Pass a model as the pipe argument. The pipe creates, owns, and disposes the expression. The template updates whenever any model field changes.',
      code: rsxPipeStringCode,
    },
    {
      title: 'RsxPipe — pre-built IExpression',
      description:
        'Build the expression once (e.g. in a class field or service) and pass it directly. The pipe subscribes but does not dispose on destroy.',
      code: rsxPipePrebuiltCode,
    },
    {
      title: 'RsxPipe — async values',
      description:
        'Async model fields (Promise, Observable) work transparently — no async pipe needed. The template updates whenever the Observable emits.',
      code: rsxPipeAsyncCode,
    },
    {
      title: 'RsxPipe — null safety',
      description:
        'Passing null or undefined is safe and renders as an empty string.',
      code: rsxPipeNullCode,
    },
    {
      title: 'Manual injection — transaction manager',
      description:
        'Inject IExpressionChangeTransactionManagerToken directly to use batched updates.',
      code: injectionTokensCode,
    },
    {
      title: 'Installation',
      description: 'Install all required packages.',
      code: installCode,
    },
  ],
  related: [
    {
      href: '/docs/frameworks/react',
      title: 'React integration',
      meta: 'useRsxExpression and useRsxModel hooks for reactive components',
    },
    {
      href: '/docs/frameworks/vue',
      title: 'Vue integration',
      meta: 'Composition API patterns with rs-x expressions',
    },
    {
      href: '/docs/frameworks/rxjs',
      title: 'RxJS integration',
      meta: 'Observable values inside expressions',
    },
    {
      href: '/docs/core-concepts/async-operations',
      title: 'Async operations',
      meta: 'Mix Promise/Observable/expression values with sync values',
    },
    {
      href: '/docs/core-concepts/batching-transactions',
      title: 'Batching changes',
      meta: 'Group updates and emit once',
    },
    {
      href: '/docs/core-concepts/member-expressions',
      title: 'Member expressions',
      meta: 'Nested property and member access',
    },
    {
      href: '/docs/core-concepts/modular-expressions',
      title: 'Modular expressions',
      meta: 'Compose reusable expression parts',
    },
  ],
};

export const metadata: Metadata = {
  title: doc.title,
  description: doc.lead,
};

export default function Page() {
  return <CoreConceptPageLayout doc={doc} headerNote={demoLinks} />;
}
