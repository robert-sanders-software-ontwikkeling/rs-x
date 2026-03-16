import dedent from 'dedent';
import type { Metadata } from 'next';

import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../_template/core-concept-page';

const exampleCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import {
    type IExpressionChangeTransactionManager,
    rsx,
    RsXExpressionParserInjectionTokens,
    RsXExpressionParserModule,
  } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const tx = InjectionContainer.get<IExpressionChangeTransactionManager>(
    RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager,
  );

  const model = {
    subtotal: 100,
    shipping: 15,
    discount: 5,
  };

  const totalExpression = rsx<number>('subtotal + shipping - discount')(model);

  let changeCount = 0;
  totalExpression.changed.subscribe(() => {
    changeCount++;
    console.log('changed ->', totalExpression.value);
  });

  await new WaitForEvent(totalExpression, 'changed').wait(emptyFunction);
  // Intentionally use next task (setTimeout 0), not queueMicrotask.
  // Commit processing can chain multiple microtasks, and we want a full
  // boundary so each write is observed as a separate unbatched step.
  const flushCommitQueue = (): Promise<void> =>
    new Promise((resolve) => {
      setTimeout(() => resolve(undefined), 0);
    });

  const beforeWithoutSuspend = changeCount;
  model.subtotal = 120;
  await flushCommitQueue();
  model.shipping = 20;
  await flushCommitQueue();
  model.discount = 10;
  await flushCommitQueue();
  console.log('without suspend emissions:', changeCount - beforeWithoutSuspend); // 3

  const beforeWithSuspend = changeCount;
  tx.suspend();
  model.subtotal = 150;
  await flushCommitQueue();
  model.shipping = 25;
  await flushCommitQueue();
  model.discount = 15;
  await flushCommitQueue();
  tx.continue();
  await flushCommitQueue();
  console.log('with suspend emissions:', changeCount - beforeWithSuspend); // 1
  console.log('final total:', totalExpression.value); // 160
`;

const playgroundScript = dedent`
  const rsx = api.rsx;
  const WaitForEvent = api.WaitForEvent;
  const tx = api.ExpressionChangeTransactionManager;
  const emptyFunction = () => {};

  const model = {
    subtotal: 100,
    shipping: 15,
    discount: 5,
  };

  const totalExpression = rsx('subtotal + shipping - discount')(model);

  let changeCount = 0;
  totalExpression.changed.subscribe(() => {
    changeCount++;
    console.log('changed ->', totalExpression.value);
  });

  await new WaitForEvent(totalExpression, 'changed').wait(emptyFunction);
  // Intentionally use next task (setTimeout 0), not queueMicrotask.
  // Commit processing can chain multiple microtasks, and we want a full
  // boundary so each write is observed as a separate unbatched step.
  const flushCommitQueue = () =>
    new Promise((resolve) => {
      setTimeout(() => resolve(undefined), 0);
    });

  const beforeWithoutSuspend = changeCount;
  model.subtotal = 120;
  await flushCommitQueue();
  model.shipping = 20;
  await flushCommitQueue();
  model.discount = 10;
  await flushCommitQueue();
  console.log('without suspend emissions:', changeCount - beforeWithoutSuspend); // 3

  const beforeWithSuspend = changeCount;
  tx.suspend();
  model.subtotal = 150;
  await flushCommitQueue();
  model.shipping = 25;
  await flushCommitQueue();
  model.discount = 15;
  await flushCommitQueue();
  tx.continue();
  await flushCommitQueue();
  console.log('with suspend emissions:', changeCount - beforeWithSuspend); // 1
  console.log('final total:', totalExpression.value); // 160

  return totalExpression;
`;

const doc: CoreConceptDoc = {
  title: 'Batching changes',
  lead: 'Group multiple model updates and emit one final expression change.',
  whatItMeans:
    'rs-x collects updates first and publishes the final value at the end of a change cycle. You can pause publishing with suspend() and release all pending work with continue().',
  whyItMatters:
    'This keeps change events predictable: fewer noisy intermediate values, less duplicate work, and clearer logs for subscribers.',
  keyPoints: [
    'One completed cycle usually produces one final changed event per root expression.',
    'Back-to-back writes in the same synchronous block can already collapse into one emission, even without suspend().',
    'Use suspend() and continue() when updates happen over multiple async steps but should still notify once.',
    'Use normal updates when intermediate values are meaningful for your flow.',
    'changed is only emitted when the final value is actually different.',
  ],
  deepDive: [
    {
      title: 'What this example proves',
      paragraphs: [
        'The example intentionally flushes between unbatched writes, so each write gets its own commit and you can see multiple emissions.',
        'In the batched part, the same writes run while suspended. continue() then flushes once, so subscribers see one final emission.',
      ],
    },
    {
      title: 'Why unbatched can still look like one emission',
      paragraphs: [
        'If several writes happen immediately after each other in one synchronous turn, rs-x can still publish one final value.',
        'That is expected behavior. It means the system coalesced those writes before the commit boundary.',
      ],
    },
    {
      title: 'When to use suspend and continue',
      paragraphs: [
        'Use it for multi-step updates where partial states should stay private until everything is ready.',
        'Typical cases are import pipelines, validation-and-fix passes, or grouped recalculations where you only care about the final result.',
      ],
    },
  ],
  exampleCode: exampleCode,
  playgroundScript: playgroundScript,
  related: [
    {
      href: '/docs/expression-change-transaction-manager',
      title: 'Change transaction manager',
      meta: 'Batch and commit changes',
    },
    {
      href: '/docs/expression-change-commit-handler',
      title: 'Commit handler',
      meta: 'Commit execution behavior',
    },
  ],
};

export const metadata: Metadata = {
  title: doc.title,
  description: doc.lead,
};

export default function Page() {
  return <CoreConceptPageLayout doc={doc} />;
}
