import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { IExpressionServices } from '../../lib/expression-services/expression-services.interface';
import { ExpressionType } from '../../lib/expressions/expression-parser.interface';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';
import { rsx } from '../../lib/rsx';

type Case = {
  readonly name: string;
  readonly source: string;
  readonly expectedType: ExpressionType;
  readonly getModel: () => Record<string, unknown>;
  readonly expectedInitialValue: unknown;
  readonly mutate: (model: Record<string, unknown>) => void;
  readonly expectedUpdatedValue: unknown;
};

const CASES: readonly Case[] = [
  {
    name: 'addition',
    source: 'a + b',
    expectedType: ExpressionType.Addition,
    getModel: () => ({ a: 1, b: 2 }),
    expectedInitialValue: 3,
    mutate: (model) => {
      model.a = 5;
    },
    expectedUpdatedValue: 7,
  },
  {
    name: 'logical and',
    source: 'a && b',
    expectedType: ExpressionType.And,
    getModel: () => ({ a: true, b: false }),
    expectedInitialValue: false,
    mutate: (model) => {
      model.b = true;
    },
    expectedUpdatedValue: true,
  },
  {
    name: 'unary negation',
    source: '-a',
    expectedType: ExpressionType.UnaryNegation,
    getModel: () => ({ a: 2 }),
    expectedInitialValue: -2,
    mutate: (model) => {
      model.a = 5;
    },
    expectedUpdatedValue: -5,
  },
  {
    name: 'conditional',
    source: 'a > b ? c : d',
    expectedType: ExpressionType.Conditional,
    getModel: () => ({ a: 1, b: 2, c: 10, d: 20 }),
    expectedInitialValue: 20,
    mutate: (model) => {
      model.a = 3;
    },
    expectedUpdatedValue: 10,
  },
  {
    name: 'bitwise left shift',
    source: 'a << b',
    expectedType: ExpressionType.BitwiseLeftShift,
    getModel: () => ({ a: 2, b: 3 }),
    expectedInitialValue: 16,
    mutate: (model) => {
      model.a = 3;
    },
    expectedUpdatedValue: 24,
  },
  {
    name: 'nullish coalescing',
    source: 'a ?? b',
    expectedType: ExpressionType.NullishCoalescing,
    getModel: () => ({ a: null, b: 5 }),
    expectedInitialValue: 5,
    mutate: (model) => {
      model.a = 9;
    },
    expectedUpdatedValue: 9,
  },
];

describe('Compiled expression contract tests', () => {
  const previousMode = process.env.RSX_EXPRESSION_ENGINE_MODE;

  beforeAll(async () => {
    process.env.RSX_EXPRESSION_ENGINE_MODE = 'compiled';
    await InjectionContainer.load(RsXExpressionParserModule);
  });

  afterAll(async () => {
    if (previousMode === undefined) {
      delete process.env.RSX_EXPRESSION_ENGINE_MODE;
    } else {
      process.env.RSX_EXPRESSION_ENGINE_MODE = previousMode;
    }
    await unloadRsXExpressionParserModule();
  });

  it.each(CASES)(
    'matches compiled contract for $name',
    async ({
      source,
      expectedType,
      getModel,
      expectedInitialValue,
      mutate,
      expectedUpdatedValue,
    }) => {
      const model = getModel();
      const expression = rsx(source)(model);

      try {
        expect(expression.type).toBe(expectedType);
        expect(expression.expressionString).toBe(source);

        await new WaitForEvent(expression, 'changed').wait(() => {});
        expect(expression.value).toBe(expectedInitialValue);

        const clone = expression.clone();
        const services: IExpressionServices = InjectionContainer.get(
          RsXExpressionParserInjectionTokens.IExpressionServices,
        );
        try {
          expect(clone.type).toBe(expectedType);
          expect(clone.expressionString).toBe(source);
          await new WaitForEvent(clone, 'changed').wait(() => {
            clone.bind({
              context: model,
              services,
            });
          });
          expect(clone.value).toBe(expectedInitialValue);
        } finally {
          clone.dispose();
        }

        await new WaitForEvent(expression, 'changed', {
          ignoreInitialValue: true,
        }).wait(() => {
          mutate(model);
        });
        expect(expression.value).toBe(expectedUpdatedValue);
      } finally {
        expression.dispose();
      }
    },
  );

  it('evaluates nested member shape in compiled mode', async () => {
    const model = { a: { b: 1 }, c: 2 };
    const expression = rsx('a.b + c')(model);

    try {
      expect(expression.type).toBe(ExpressionType.Addition);
      await new WaitForEvent(expression, 'changed').wait(() => {});
      expect(expression.value).toBe(3);
      expect(
        (expression as unknown as { constructor?: { name?: string } })
          ?.constructor?.name,
      ).toBe('CompiledExpression');
    } finally {
      expression.dispose();
    }
  });
});
