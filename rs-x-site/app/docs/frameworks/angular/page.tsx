import dedent from 'dedent';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SyntaxCodeBlock } from '../../../../components/SyntaxCodeBlock';

import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../../core-concepts/_template/core-concept-page';
import {
  AngularCompiledFrameworkExample,
} from './angular-runtime-lab.client';

const demoLinks = (
  <div className="docsApiActions" style={{ marginTop: '1rem' }}>
    <a className="btn btnPrimary" href="/get-started?track=angular">
      Angular setup <span aria-hidden="true">→</span>
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
  rsx init
`;

const provideRsxCode = dedent`
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
  import { Component } from '@angular/core';
  import { RsxPipe } from '@rs-x/angular';

  @Component({
    selector: 'app-greeting',
    standalone: true,
    imports: [RsxPipe],
    template: \`<p>{{ "firstName + ' ' + lastName" | rsx: model }}</p>\`,
  })
  export default class GreetingComponent {
    model = {
      firstName: 'Jane',
      lastName: 'Doe',
    };
  }

  // Mutate the model — the template updates automatically
  // this.model.firstName = 'Alice';
`;

const rsxPipePrebuiltCode = dedent`
  import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
  import { FormsModule } from '@angular/forms';
  import { rsx } from '@rs-x/expression-parser';
  import { RsxPipe } from '@rs-x/angular';

  @Component({
    selector: 'app-order-total',
    standalone: true,
    imports: [RsxPipe, FormsModule],
    template: \`
      <label>
        Price
        <input type="number" [(ngModel)]="model.price" />
      </label>
      <label>
        Quantity
        <input type="number" [(ngModel)]="model.quantity" />
      </label>
      <label>
        Total
        <input type="number" [value]="totalExpr | rsx" readonly />
      </label>
    \`,
    changeDetection: ChangeDetectionStrategy.OnPush
  })
  export default class OrderTotalComponent implements OnDestroy {
    private readonly model = { price: 100, quantity: 3 };
    public readonly totalExpr = rsx('price * quantity')(this.model);

    public ngOnDestroy(): void {
        this.totalExpr.dispose(); 
    }
  }
`;

const rsxPipeAsyncCode = dedent`
  import { ChangeDetectionStrategy, Component, OnDestroy } from '@angular/core';
  import { BehaviorSubject } from 'rxjs';
  import { rsx } from '@rs-x/expression-parser';
  import { RsxPipe } from '@rs-x/angular';

  @Component({
    selector: 'app-live-price',
    standalone: true,
    imports: [RsxPipe],
    template: \`
      <p>Base price: {{ model.base.value }}</p>
      <p>Price (inc. tax): {{ price | rsx }}</p>
      <button (click)="increaseBasePrice()">Increase base price</button>
    \`,
    changeDetection: ChangeDetectionStrategy.OnPush
  })
  export default class LivePriceComponent implements OnDestroy {
    public readonly model = {
      base: new BehaviorSubject(100),
      taxRate: 0.21,
    };

    public readonly price = rsx('base * (1 + taxRate)' )(this.model);

    public ngOnDestroy(): void {
        this.price.dispose(); 
    }

    public increaseBasePrice(): void {
      this.model.base.next(this.model.base.value + 10);
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

const transactionComponentCode = dedent`
  import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
  import { rsx } from '@rs-x/expression-parser';
  import {
    IExpressionChangeTransactionManagerToken,
    RsxPipe,
  } from '@rs-x/angular';

  @Component({
    selector: 'app-order-total',
    standalone: true,
    imports: [RsxPipe],
    template: \`
      <h3>Measured values</h3>
      <dl>
        <div>
          <dt>Price</dt>
          <dd>{{ model.price }}</dd>
        </div>
        <div>
          <dt>Quantity</dt>
          <dd>{{ model.quantity }}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{{ totalExpr | rsx }}</dd>
        </div>
        <div>
          <dt>Last action emit count</dt>
          <dd>{{ stats.commits }}</dd>
        </div>
        <div>
          <dt>Expected emit count</dt>
          <dd>{{ stats.expected }}</dd>
        </div>
        <div>
          <dt>Result</dt>
          <dd>{{ resultText }}</dd>
        </div>
      </dl>

      <h3>How to read this</h3>
      <p>Both buttons apply the same two updates: increase price by 10 and quantity by 1.</p>
      <p>
        The difference is timing: the first button splits them into two async
        steps, while the transaction keeps those async steps batched until the end.
      </p>

      <h3>Try it</h3>
      <button (click)="runWithoutTransaction()" [disabled]="stats.running">
        Run async updates without transaction
      </button>
      <button (click)="runWithTransaction()" [disabled]="stats.running">
        Run async updates with transaction
      </button>
    \`,
    changeDetection: ChangeDetectionStrategy.OnPush,
  })
  export default class OrderTotalComponent implements OnDestroy {
    private readonly tx = inject(IExpressionChangeTransactionManagerToken);

    protected readonly model = {
      price: 100,
      quantity: 2,
    };

    protected readonly stats = {
      commits: 0,
      expected: 0,
      lastMode: 'none',
      running: false,
    };

    protected readonly totalExpr = rsx<number>('price * quantity')(this.model);
    private readonly subscription = this.totalExpr.changed.subscribe(() => {
      this.stats.commits += 1;
    });

    protected get resultText(): string {
      if (this.stats.lastMode === 'none') {
        return '';
      }

      return this.stats.commits === this.stats.expected
        ? 'Verified: ' + this.stats.lastMode + ' emitted ' + this.stats.commits + ' time(s).'
        : 'Unexpected: ' + this.stats.lastMode + ' emitted ' + this.stats.commits + ' time(s), expected ' + this.stats.expected + '.';
    }

    protected async runWithoutTransaction(): Promise<void> {
      this.stats.commits = 0;
      this.stats.expected = 2;
      this.stats.lastMode = 'Async updates';
      this.stats.running = true;
      this.model.price += 10;
      await Promise.resolve();
      this.model.quantity += 1;
      this.stats.running = false;
    }

    protected async runWithTransaction(): Promise<void> {
      this.stats.commits = 0;
      this.stats.expected = 1;
      this.stats.lastMode = 'Transaction';
      this.stats.running = true;
      this.tx.suspend();
      this.model.price += 10;
      await Promise.resolve();
      this.model.quantity += 1;
      this.tx.continue();
      this.stats.running = false;
    }

    public ngOnDestroy(): void {
      this.subscription.unsubscribe();
      this.totalExpr.dispose();
    }
  }
`;

const doc: CoreConceptDoc = {
  title: 'Angular integration',
  lead: "Bind rs-x expressions to Angular templates with the RsxPipe — reactive updates propagate automatically using Angular's change detection, with no manual subscriptions.",
  whatItMeans:
    "@rs-x/angular includes the RsxPipe impure pipe and the providexRsx() provider function. The pipe wraps an rs-x expression (string or pre-built IExpression) and calls ChangeDetectorRef.markForCheck() whenever the expression value changes. providexRsx() connects the rs-x DI container to Angular's dependency injection system during APP_INITIALIZER.",
  whyItMatters:
    'You can mutate the model anywhere in your app, for example from a service, a WebSocket handler, or a button click, and every template that reads that data updates automatically. No BehaviorSubjects, no ngrx actions, and no manually managed subscriptions. The pipe is impure by design, so Angular calls transform() on each change-detection cycle, but it only allocates a new expression when the input actually changes.',
  keyPoints: [
    'The pipe is impure (pure: false) — Angular checks it every change-detection cycle, but the pipe itself only recreates the expression when the expression string or context object changes.',
    'Pass an expression string and a context object: {{ "a + b" | rsx: model }}. Or pass a pre-built IExpression and omit the context: {{ expr | rsx }}.',
    'When the pipe owns the expression (string input), it disposes the expression on ngOnDestroy. When you pass a pre-built IExpression, the pipe only subscribes — you own the lifecycle.',
    'providexRsx() registers an APP_INITIALIZER provider that loads the rs-x module, along with providers for IExpressionFactoryToken and IExpressionChangeTransactionManagerToken.',
    'Inject the change transaction manager with IExpressionChangeTransactionManagerToken when you want to batch multiple model updates into a single change notification — especially when many fields change together.',
    'Passing null or undefined to the pipe is safe — it renders nothing and cleans up any previous expression.',
  ],
  examples: [
    {
      title: 'RsxPipe — pre-built IExpression',
      description:
        'Build the expression once in the component class and pass it directly to the pipe. The pipe subscribes, but the component owns the expression lifecycle.',
      code: rsxPipePrebuiltCode,
    },
    {
      title: 'RsxPipe — string expression',
      description:
        'Pass a model as the pipe argument. The pipe creates, owns, and disposes the expression.',
      code: rsxPipeStringCode,
    },
    {
      title: 'Expression change transactions',
      description:
        'Use the Angular transaction manager token when async multi-step updates should flush one final change instead of intermediate updates.',
      code: transactionComponentCode,
    },
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
      title: 'Installation',
      description: (
        <>
          Run <code>rsx init</code> in your Angular project to detect the
          framework, install the right packages, and apply the setup
          automatically. See the <Link href="/docs/core-concepts/cli">CLI docs</Link>.
        </>
      ),
      code: installCode,
    },
  ],
  related: [
    {
      href: 'https://angular.dev',
      title: 'Angular official website',
      meta: 'Docs, guides, and Angular ecosystem',
    },
    {
      href: '/docs',
      title: 'Docs overview',
      meta: 'Core concepts and API reference',
    },
    {
      href: '/docs/core-concepts/first-expression',
      title: 'First expression',
      meta: 'Bind expressions and subscribe to changes',
    },
    {
      href: '/docs/core-concepts/cli',
      title: 'CLI',
      meta: 'Install, setup, build, and typecheck workflows',
    },
    {
      href: '/docs/core-concepts/compiler',
      title: 'Compiler',
      meta: 'Build-time parsing, validation, and compiled expressions',
    },
    {
      href: '/docs/core-concepts/batching-transactions',
      title: 'Batching transactions',
      meta: 'Group updates and emit once',
    },
    {
      href: '/docs/core-concepts/performance',
      title: 'Performance',
      meta: 'Parsing, binding, update costs, and memory',
    },
  ],
};

export const metadata: Metadata = {
  title: doc.title,
  description: doc.lead,
  alternates: {
    canonical: '/docs/frameworks/angular',
  },
};

export default function Page() {
  return (
    <CoreConceptPageLayout
      doc={doc}
      headerNote={demoLinks}
      examplesSlot={
        <>
          <article className="card docsApiCard">
            <h2 className="cardTitle">RsxPipe — pre-built IExpression example</h2>
            <p className="cardText">
              Build the expression once in the component class and pass it to
              the pipe. The pipe subscribes to changes, while the component owns
              the expression lifecycle.
            </p>
            <AngularCompiledFrameworkExample
              initialCode={rsxPipePrebuiltCode}
              editorId="angular-expression-prebuilt"
            />
          </article>

          <article className="card docsApiCard">
            <h2 className="cardTitle">RsxPipe — string expression example</h2>
            <p className="cardText">
              Pass a string expression plus a model object. The pipe creates,
              owns, and disposes the expression for you.
            </p>
            <AngularCompiledFrameworkExample
              initialCode={rsxPipeStringCode}
              editorId="angular-expression-string"
            />
          </article>

          <article className="card docsApiCard">
            <h2 className="cardTitle">Expression change transactions example</h2>
            <p className="cardText">
              Run the same two async updates with and without a transaction and
              compare the emitted updates.
            </p>
            <AngularCompiledFrameworkExample
              initialCode={transactionComponentCode}
              editorId="angular-expression-transactions"
            />
          </article>

          <article className="card docsApiCard">
            <h2 className="cardTitle">Setup — standalone app</h2>
            <p className="cardText">
              Register <code>providexRsx()</code> in your application config.
            </p>
            <SyntaxCodeBlock code={provideRsxCode} />
          </article>

          <article className="card docsApiCard">
            <h2 className="cardTitle">Setup — NgModule app</h2>
            <p className="cardText">
              Import <code>RsxPipe</code> and spread <code>providexRsx()</code>{' '}
              into the providers array.
            </p>
            <SyntaxCodeBlock code={provideRsxNgModuleCode} />
          </article>

          <article className="card docsApiCard">
            <h2 className="cardTitle">RsxPipe — async values</h2>
            <p className="cardText">
              Observable and Promise-backed fields work without a separate async
              pipe.
            </p>
            <AngularCompiledFrameworkExample
              initialCode={rsxPipeAsyncCode}
              editorId="angular-expression-async"
            />
          </article>

          <article className="card docsApiCard">
            <h2 className="cardTitle">RsxPipe — null safety</h2>
            <p className="cardText">
              Passing <code>null</code> or <code>undefined</code> is safe and
              renders as an empty string.
            </p>
            <SyntaxCodeBlock code={rsxPipeNullCode} />
          </article>

          <article className="card docsApiCard">
            <h2 className="cardTitle">Installation</h2>
            <p className="cardText">
              Run <code>rsx init</code> in your Angular project to detect the
              framework, install the right packages, and apply the setup
              automatically. See the <Link href="/docs/core-concepts/cli">CLI docs</Link>.
            </p>
            <SyntaxCodeBlock code={installCode} />
          </article>
        </>
      }
    />
  );
}
