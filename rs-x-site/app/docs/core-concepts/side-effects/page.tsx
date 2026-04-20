import dedent from 'dedent';
import type { Metadata } from 'next';

import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../_template/core-concept-page';

const sideEffectBasicCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    status: 'pending' as string,
    auditLog: [] as string[],
    notify(s: string) {
      this.auditLog.push(\`status changed to: \${s}\`);
    },
  };

  // notify(status) runs as a side effect; expression value is status
  const expr = rsx<string>('(notify(status), status)')(model);
  await new WaitForEvent(expr, 'changed').wait(emptyFunction);

  console.log(expr.value);        // 'pending'
  console.log(model.auditLog);   // ['status changed to: pending']

  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true })
    .wait(() => { model.status = 'active'; });

  console.log(expr.value);        // 'active'
  console.log(model.auditLog);   // ['status changed to: pending', 'status changed to: active']
`;

const sideEffectBasicPlayground = dedent`
  const emptyFunction = () => {};

  const model = {
    status: 'pending',
    auditLog: [],
    notify(s) {
      this.auditLog.push('status changed to: ' + s);
    },
  };

  const expr = rsx('(notify(status), status)')(model);
  await new WaitForEvent(expr, 'changed').wait(emptyFunction);

  console.log(expr.value);
  console.log(model.auditLog);

  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true })
    .wait(() => { model.status = 'active'; });

  console.log(expr.value);
  console.log(model.auditLog);

  return expr;
`;

const sideEffectMultipleCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    price: 100,
    quantity: 3,
    priceLog: [] as number[],
    qtyLog: [] as number[],
    trackPrice(p: number) { this.priceLog.push(p); },
    trackQty(q: number) { this.qtyLog.push(q); },
  };

  // Two side effects run before the result is returned
  const expr = rsx<number>('(trackPrice(price), trackQty(quantity), price * quantity)')(model);
  await new WaitForEvent(expr, 'changed').wait(emptyFunction);

  console.log(expr.value);       // 300
  console.log(model.priceLog);  // [100]
  console.log(model.qtyLog);    // [3]

  // Only price changes — trackPrice re-runs; trackQty does not (quantity unchanged)
  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true })
    .wait(() => { model.price = 150; });

  console.log(expr.value);       // 450
  console.log(model.priceLog);  // [100, 150]
  console.log(model.qtyLog);    // [3]
`;

const sideEffectMultiplePlayground = dedent`
  const emptyFunction = () => {};

  const model = {
    price: 100,
    quantity: 3,
    priceLog: [],
    qtyLog: [],
    trackPrice(p) { this.priceLog.push(p); },
    trackQty(q) { this.qtyLog.push(q); },
  };

  const expr = rsx('(trackPrice(price), trackQty(quantity), price * quantity)')(model);
  await new WaitForEvent(expr, 'changed').wait(emptyFunction);

  console.log(expr.value);
  console.log(model.priceLog);
  console.log(model.qtyLog);

  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true })
    .wait(() => { model.price = 150; });

  console.log(expr.value);
  console.log(model.priceLog);
  console.log(model.qtyLog);

  return expr;
`;

const sideEffectConditionalCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    count: 3,
    alerts: [] as string[],
    onOverflow(n: number) {
      this.alerts.push(\`overflow at \${n}\`);
    },
  };

  // onOverflow is only called when count > 5
  const expr = rsx<number>('(count > 5 && onOverflow(count), count)')(model);
  await new WaitForEvent(expr, 'changed').wait(emptyFunction);

  console.log(expr.value);     // 3
  console.log(model.alerts);  // [] — threshold not reached

  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true })
    .wait(() => { model.count = 8; });

  console.log(expr.value);     // 8
  console.log(model.alerts);  // ['overflow at 8']

  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true })
    .wait(() => { model.count = 4; });

  console.log(expr.value);     // 4
  console.log(model.alerts);  // ['overflow at 8'] — no new alert (count <= 5)
`;

const sideEffectConditionalPlayground = dedent`
  const emptyFunction = () => {};

  const model = {
    count: 3,
    alerts: [],
    onOverflow(n) {
      this.alerts.push('overflow at ' + n);
    },
  };

  const expr = rsx('(count > 5 && onOverflow(count), count)')(model);
  await new WaitForEvent(expr, 'changed').wait(emptyFunction);

  console.log(expr.value);
  console.log(model.alerts);

  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true })
    .wait(() => { model.count = 8; });

  console.log(expr.value);
  console.log(model.alerts);

  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true })
    .wait(() => { model.count = 4; });

  console.log(expr.value);
  console.log(model.alerts);

  return expr;
`;

const sideEffectCrossPropertyCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    userId: 1,
    profile: { name: 'Alice' },
    viewHistory: [] as number[],
    trackView(id: number) {
      this.viewHistory.push(id);
    },
    formatName(name: string) {
      return name.toUpperCase();
    },
  };

  // trackView tracks userId; formatName tracks profile.name
  // Each dependency is tracked independently
  const expr = rsx<string>('(trackView(userId), formatName(profile.name))')(model);
  await new WaitForEvent(expr, 'changed').wait(emptyFunction);

  console.log(expr.value);          // 'ALICE'
  console.log(model.viewHistory);  // [1]

  // Changing userId re-runs trackView but not formatName
  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true })
    .wait(() => { model.userId = 2; });

  console.log(expr.value);          // 'ALICE' (unchanged)
  console.log(model.viewHistory);  // [1, 2]

  // Changing profile.name re-runs formatName and changes the expression value
  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true })
    .wait(() => { model.profile = { name: 'Bob' }; });

  console.log(expr.value);          // 'BOB'
  console.log(model.viewHistory);  // [1, 2] — trackView did not re-run
`;

const sideEffectCrossPropertyPlayground = dedent`
  const emptyFunction = () => {};

  const model = {
    userId: 1,
    profile: { name: 'Alice' },
    viewHistory: [],
    trackView(id) {
      this.viewHistory.push(id);
    },
    formatName(name) {
      return name.toUpperCase();
    },
  };

  const expr = rsx('(trackView(userId), formatName(profile.name))')(model);
  await new WaitForEvent(expr, 'changed').wait(emptyFunction);

  console.log(expr.value);
  console.log(model.viewHistory);

  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true })
    .wait(() => { model.userId = 2; });

  console.log(expr.value);
  console.log(model.viewHistory);

  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true })
    .wait(() => { model.profile = { name: 'Bob' }; });

  console.log(expr.value);
  console.log(model.viewHistory);

  return expr;
`;

const doc: CoreConceptDoc = {
  title: 'Side effects',
  lead: 'Use the sequence expression to run side-effect calls inline — each call tracks its own dependencies and re-runs only when they change.',
  whatItMeans:
    'The comma (sequence) operator — (expr1, expr2, ..., exprN) — evaluates every expression left to right and returns the last one. In rs-x, each segment is tracked as a normal node in the reactive graph. This means you can place side-effect calls in the earlier positions and a "return value" in the last position. The side-effect calls re-run only when their own dependencies change, independently of the final value.',
  whyItMatters:
    'Without sequence expressions, a side effect would have to be wired manually: subscribe to changed, then call the function. With sequence expressions, the wiring is part of the expression string itself. There is nothing to unsubscribe or coordinate — the side effect lifecycle is owned by the expression and cleaned up when the expression is disposed.',
  keyPoints: [
    'Syntax: (sideEffect(a), sideEffect2(b), result) — any number of comma-separated segments; the last segment is the expression value.',
    'Each segment tracks its own dependencies. A side-effect call only re-runs when the fields it reads change — not when unrelated segments change.',
    'The expression value is the last segment. A side-effect-only expression can return undefined — the result is still tracked.',
    'Combine with && for conditional side effects: (count > limit && onOverflow(count), count) — the side effect runs only when the guard is truthy.',
    'Side effects defined this way are automatically disposed when expression.dispose() is called — no extra cleanup code needed.',
    'The sequence expression is a standard JavaScript comma operator. rs-x parses and tracks it the same way it tracks any other expression node.',
  ],
  deepDive: [
    {
      title: 'How dependencies are isolated between segments',
      paragraphs: [
        'Each segment in a sequence is a fully independent sub-expression. trackPrice(price) only depends on price and trackQty(quantity) only depends on quantity. Changing price re-evaluates the first segment but not the second.',
        'This isolation means side effects are not called more often than needed. A logging call watching one field will not re-run just because an unrelated field — even one in the same expression — changes.',
      ],
    },
    {
      title: 'Conditional side effects with &&',
      paragraphs: [
        'Because && short-circuits, (count > limit && onOverflow(count), count) only calls onOverflow when count > limit is truthy. The right-hand side of && is not evaluated — and therefore not re-run — when the guard is false.',
        'The count field itself is still tracked as a dependency of the guard, so if count changes and the guard becomes true, onOverflow will be called on the next evaluation.',
      ],
    },
    {
      title: 'Side effects vs. subscribing to changed',
      paragraphs: [
        'Subscribing to expression.changed is the right approach when the reaction lives outside the model — for example, updating the DOM or sending an HTTP request from application code.',
        'A sequence side-effect call is the right approach when the reaction belongs to the model itself — for example, recording to an audit log, updating a cache field, or triggering another model method. Keeping it in the expression string means it is co-located with the data it reads and is cleaned up with the expression.',
      ],
    },
  ],
  examples: [
    {
      title: 'Basic side effect with return value',
      description:
        'Call notify(status) as a side effect on every change. The expression value is status, and the call is re-run each time status changes.',
      code: sideEffectBasicCode,
      playgroundScript: sideEffectBasicPlayground,
    },
    {
      title: 'Multiple side effects with independent tracking',
      description:
        'Two side-effect calls before the return value. Each call tracks its own dependency — trackPrice only re-runs when price changes, not when quantity changes.',
      code: sideEffectMultipleCode,
      playgroundScript: sideEffectMultiplePlayground,
    },
    {
      title: 'Conditional side effect',
      description:
        'Guard a side effect with &&. onOverflow is only called when count exceeds the threshold. The expression value is count regardless.',
      code: sideEffectConditionalCode,
      playgroundScript: sideEffectConditionalPlayground,
    },
    {
      title: 'Cross-property tracking',
      description:
        'Side effects and the return value each depend on different fields. Changing userId only re-runs trackView. Changing profile.name only re-runs formatName and updates the expression value.',
      code: sideEffectCrossPropertyCode,
      playgroundScript: sideEffectCrossPropertyPlayground,
    },
  ],
  related: [
    {
      href: '/docs/core-concepts/expression-types',
      title: 'Expression types',
      meta: 'Full list of supported expression node types, including Sequence',
    },
    {
      href: '/docs/core-concepts/functions',
      title: 'Functions',
      meta: 'Call methods and functions directly in expressions',
    },
    {
      href: '/docs/core-concepts/batching-transactions',
      title: 'Batching changes',
      meta: 'Group updates and emit once',
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
