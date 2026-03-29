import dedent from 'dedent';
import type { Metadata } from 'next';

import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../_template/core-concept-page';

const functionBasicCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    a: 10,
    multiplyWithTwo(x: number) {
      return 2 * x;
    },
  };

  // Expression calls the method and tracks the argument 'a'
  const expr = rsx<number>('multiplyWithTwo(a)')(model);
  await new WaitForEvent(expr, 'changed').wait(emptyFunction);

  console.log(expr.value); // 20

  // Changing 'a' causes the call to re-evaluate
  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true })
    .wait(() => { model.a = 5; });

  console.log(expr.value); // 10
`;

const functionBasicPlayground = dedent`
  const emptyFunction = () => {};

  const model = {
    a: 10,
    multiplyWithTwo(x) {
      return 2 * x;
    },
  };

  const expr = rsx('multiplyWithTwo(a)')(model);
  await new WaitForEvent(expr, 'changed').wait(emptyFunction);
  console.log(expr.value); // 20

  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true })
    .wait(() => { model.a = 5; });
  console.log(expr.value); // 10

  return expr;
`;

const functionNestedThisCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    a: 10,
    b: {
      x: 3,
      multiply(factor: number) {
        return this.x * factor; // 'this' is bound to 'b'
      },
    },
  };

  const expr = rsx<number>('b.multiply(a)')(model);
  await new WaitForEvent(expr, 'changed').wait(emptyFunction);

  console.log(expr.value); // 30

  // Replacing the owner 'b' re-evaluates the call against the new object
  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true })
    .wait(() => {
      model.b = { x: 5, multiply(factor) { return this.x * factor; } };
    });

  console.log(expr.value); // 50
`;

const functionNestedThisPlayground = dedent`
  const emptyFunction = () => {};

  const model = {
    a: 10,
    b: {
      x: 3,
      multiply(factor) {
        return this.x * factor;
      },
    },
  };

  const expr = rsx('b.multiply(a)')(model);
  await new WaitForEvent(expr, 'changed').wait(emptyFunction);
  console.log(expr.value); // 30

  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true })
    .wait(() => {
      model.b = { x: 5, multiply(factor) { return this.x * factor; } };
    });
  console.log(expr.value); // 50

  return expr;
`;

const functionDynamicDispatchCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    a: 10,
    b: {
      methodName: 'multiply' as 'multiply' | 'add',
      multiply(x: number) { return 3 * x; },
      add(x: number) { return 3 + x; },
    },
  };

  // The method name itself comes from another reactive field
  const expr = rsx<number>('b[b.methodName](a)')(model);
  await new WaitForEvent(expr, 'changed').wait(emptyFunction);

  console.log(expr.value); // 30 (multiply: 3 * 10)

  // Changing 'methodName' selects a different method
  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true })
    .wait(() => { model.b.methodName = 'add'; });

  console.log(expr.value); // 13 (add: 3 + 10)
`;

const functionDynamicDispatchPlayground = dedent`
  const emptyFunction = () => {};

  const model = {
    a: 10,
    b: {
      methodName: 'multiply',
      multiply(x) { return 3 * x; },
      add(x) { return 3 + x; },
    },
  };

  const expr = rsx('b[b.methodName](a)')(model);
  await new WaitForEvent(expr, 'changed').wait(emptyFunction);
  console.log(expr.value); // 30 (multiply)

  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true })
    .wait(() => { model.b.methodName = 'add'; });
  console.log(expr.value); // 13 (add)

  return expr;
`;

const functionChainedCode = dedent`
  import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    cart: {
      items: [{ qty: 1 }, { qty: 2 }],
      first() { return this.items[0]; },
    },
  };

  // Return value of first() becomes the owner of .qty
  const expr = rsx<number>('cart.first().qty')(model);
  await new WaitForEvent(expr, 'changed').wait(emptyFunction);

  console.log(expr.value); // 1

  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true })
    .wait(() => { model.cart.items[0].qty = 4; });

  console.log(expr.value); // 4
`;

const functionChainedPlayground = dedent`
  const emptyFunction = () => {};

  const model = {
    cart: {
      items: [{ qty: 1 }, { qty: 2 }],
      first() { return this.items[0]; },
    },
  };

  const expr = rsx('cart.first().qty')(model);
  await new WaitForEvent(expr, 'changed').wait(emptyFunction);
  console.log(expr.value); // 1

  await new WaitForEvent(expr, 'changed', { ignoreInitialValue: true })
    .wait(() => { model.cart.items[0].qty = 4; });
  console.log(expr.value); // 4

  return expr;
`;

const doc: CoreConceptDoc = {
  title: 'Functions',
  lead: 'Call methods and functions directly in expressions — arguments are tracked, this is bound to the immediate owner, and return values participate in the reactive graph.',
  whatItMeans:
    'You can call any method or function in an expression string: multiply(a), b.multiply(a), cart.byId(id).qty. rs-x treats function call nodes like any other expression node — dependencies on arguments and on the function owner are tracked, and results update automatically when those dependencies change.',
  whyItMatters:
    'No manual wiring is needed to include a function return value in a reactive graph. Pass a reactive field as an argument and the call re-evaluates when that field changes. Replace the owner object and the call re-evaluates against the new owner. The expression string is the complete specification.',
  keyPoints: [
    'Arguments are tracked: if a reactive field is passed as an argument, the call re-evaluates when that field changes.',
    'this is always bound to the immediate owner object, so b.multiply(a) binds this to b.',
    'Dynamic dispatch is supported: b[b.methodName](a) re-evaluates when methodName changes, not just when a changes.',
    'Function calls can be chained: cart.first().qty — the return value becomes the owner for the next member access segment.',
    'Zero-argument calls are supported: initializeA() — side-effect calls work and the result (including undefined) is tracked.',
  ],
  examples: [
    {
      title: 'Basic method call',
      description:
        'Call a method on the root model object. The expression re-evaluates automatically when the argument field changes.',
      code: functionBasicCode,
      playgroundScript: functionBasicPlayground,
    },
    {
      title: 'Nested method call with this binding',
      description:
        'Call a method on a nested object where this refers to that nested object. Re-evaluates when the owner object is replaced.',
      code: functionNestedThisCode,
      playgroundScript: functionNestedThisPlayground,
    },
    {
      title: 'Dynamic dispatch',
      description:
        'Select the method at runtime via a computed member name: b[b.methodName](a). Re-evaluates when the method name field changes.',
      code: functionDynamicDispatchCode,
      playgroundScript: functionDynamicDispatchPlayground,
    },
    {
      title: 'Chained call',
      description:
        'The return value of a function call becomes the owner of the next member access: cart.first().qty.',
      code: functionChainedCode,
      playgroundScript: functionChainedPlayground,
    },
  ],
  related: [
    {
      href: '/docs/core-concepts/member-expressions',
      title: 'Member expressions',
      meta: 'Nested property and member access',
    },
    {
      href: '/docs/core-concepts/expression-types',
      title: 'Expression types',
      meta: 'Full list of supported expression node types',
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
