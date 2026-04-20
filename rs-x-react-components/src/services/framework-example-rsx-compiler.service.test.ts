import { describe, expect, it } from 'vitest';

import { validateFrameworkSourceWithRsxCompiler } from './framework-example-rsx-compiler.service';

describe('validateFrameworkSourceWithRsxCompiler', () => {
  it('reports RS-X diagnostics for Vue framework examples', async () => {
    const diagnostics = await validateFrameworkSourceWithRsxCompiler({
      framework: 'vue',
      userSource: [
        "import { rsx } from '@rs-x/expression-parser';",
        "import { useRsxExpression } from '@rs-x/vue';",
        '',
        'const model = {',
        '  price: 100,',
        '  quantity: 3,',
        '};',
        '',
        "const totalExpr = rsx<number>('pricef * quantity')(model);",
        '',
        'export default {',
        "  name: 'OrderTotal',",
        '  setup() {',
        '    const total = useRsxExpression(totalExpr);',
        '    return { model, total };',
        '  },',
        '  template: `<div>{{ total }}</div>`,',
        '};',
      ].join('\n'),
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'semantic',
          message: "Identifier 'pricef' does not exist on model type.",
        }),
      ]),
    );
  });

  it('keeps accepting valid Vue framework examples', async () => {
    const diagnostics = await validateFrameworkSourceWithRsxCompiler({
      framework: 'vue',
      userSource: [
        "import { rsx } from '@rs-x/expression-parser';",
        "import { useRsxExpression } from '@rs-x/vue';",
        '',
        'const model = {',
        '  price: 100,',
        '  quantity: 3,',
        '};',
        '',
        "const totalExpr = rsx<number>('price * quantity')(model);",
        '',
        'export default {',
        "  name: 'OrderTotal',",
        '  setup() {',
        '    const total = useRsxExpression(totalExpr);',
        '    return { model, total };',
        '  },',
        '  template: `<div>{{ total }}</div>`,',
        '};',
      ].join('\n'),
    });

    expect(diagnostics).toEqual([]);
  });

  it('keeps accepting valid Vue useRsxModel pre-built expression examples', async () => {
    const diagnostics = await validateFrameworkSourceWithRsxCompiler({
      framework: 'vue',
      userSource: [
        "import { rsx } from '@rs-x/expression-parser';",
        "import { useRsxExpression, useRsxModel } from '@rs-x/vue';",
        '',
        'type OrderModel = {',
        '  price: number;',
        '  quantity: number;',
        '};',
        '',
        'const sourceModel: OrderModel = {',
        '  price: 100,',
        '  quantity: 3,',
        '};',
        '',
        'export default {',
        "  name: 'OrderTotal',",
        '  setup() {',
        '    const model: OrderModel = useRsxModel(sourceModel);',
        "    const totalExpr = rsx<number>('price * quantity')(model);",
        '    const total = useRsxExpression(totalExpr);',
        '    return { model, total };',
        '  },',
        '  template: `<div>{{ total }}</div>`,',
        '};',
      ].join('\n'),
    });

    expect(diagnostics).toEqual([]);
  });

  it('keeps accepting the exact current Vue pre-built docs example', async () => {
    const diagnostics = await validateFrameworkSourceWithRsxCompiler({
      framework: 'vue',
      userSource: [
        "import { rsx } from '@rs-x/expression-parser';",
        "import { useRsxExpression, useRsxModel } from '@rs-x/vue';",
        '',
        '// Create a module-scoped model and expression once',
        'const sourceModel = {',
        '  price: 100,',
        '  quantity: 3,',
        '};',
        "const totalExpr = rsx<number>('price * quantity')(sourceModel);",
        '',
        'export default {',
        "  name: 'OrderTotal',",
        '  setup() {',
        '    const model = useRsxModel(sourceModel);',
        '    const total = useRsxExpression(totalExpr);',
        '',
        '    return {',
        '      model,',
        '      total,',
        '    };',
        '  },',
        '  template: `',
        '    <div>',
        '      <label>',
        '        Price',
        '        <input v-model.number="model.price" type="number" />',
        '      </label>',
        '      <label>',
        '        Quantity',
        '        <input v-model.number="model.quantity" type="number" />',
        '      </label>',
        '      <dl>',
        '        <div class="metricRow">',
        '          <dt>Total</dt>',
        '          <dd class="metricValue">{{ total }}</dd>',
        '        </div>',
        '      </dl>',
        '    </div>',
        '  `,',
        '};',
      ].join('\n'),
    });

    expect(diagnostics).toEqual([]);
  });

  it('keeps accepting the exact current React pre-built docs example', async () => {
    const diagnostics = await validateFrameworkSourceWithRsxCompiler({
      framework: 'react',
      userSource: [
        "import { rsx } from '@rs-x/expression-parser';",
        "import { useRsxExpression } from '@rs-x/react';",
        '',
        '// Create a module-scoped model and expression once',
        'const model = { price: 100, quantity: 3 };',
        "const totalExpr = rsx<number>('price * quantity')(model);",
        '',
        'export default function OrderTotal() {',
        '  // Pass the pre-built IExpression — no model needed',
        '  const total = useRsxExpression(totalExpr);',
        '',
        '  return (',
        '    <div>',
        '      <label>',
        '        Price',
        '        <input',
        '          type="number"',
        '          value={model.price}',
        '          onChange={(event) => {',
        '            model.price = Number(event.target.value);',
        '          }}',
        '        />',
        '      </label>',
        '      <label>',
        '        Quantity',
        '        <input',
        '          type="number"',
        '          value={model.quantity}',
        '          onChange={(event) => {',
        '            model.quantity = Number(event.target.value);',
        '          }}',
        '        />',
        '      </label>',
        '      <span>Total: {total}</span>',
        '    </div>',
        '  );',
        '}',
      ].join('\n'),
    });

    expect(diagnostics).toEqual([]);
  });
});
