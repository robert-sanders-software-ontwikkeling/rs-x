import type { Expression } from 'estree';

import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import {
  clearPreparsedExpressionAsts,
  registerPreparsedExpressionAst,
} from '../../lib/expression-cache/preparsed-expression-ast-registry';
import type { IExpressionFactory } from '../../lib/expression-factory';
import type { IExpressionParser } from '../../lib/expressions/expression-parser.interface';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';
import { rsx } from '../../lib/rsx';

function createAdditionAst(): Expression {
  return {
    type: 'BinaryExpression',
    operator: '+',
    left: {
      type: 'Identifier',
      name: 'a',
    },
    right: {
      type: 'Identifier',
      name: 'b',
    },
  } as unknown as Expression;
}

async function waitForValue(
  expression: { value: unknown },
  maxRounds = 200,
): Promise<void> {
  for (let i = 0; i < maxRounds; i += 1) {
    if (expression.value !== undefined) {
      return;
    }
    await Promise.resolve();
  }
}

describe('Preparsed expression AST registry integration', () => {
  let expressionFactory: IExpressionFactory;
  let expressionParser: IExpressionParser;

  beforeAll(async () => {
    await InjectionContainer.load(RsXExpressionParserModule);
    expressionFactory = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionFactory,
    ) as IExpressionFactory;
    expressionParser = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionParser,
    ) as IExpressionParser;
  });

  afterEach(() => {
    clearPreparsedExpressionAsts();
  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  it('uses preparsed cache entry when expression is created through rsx shortcut', async () => {
    registerPreparsedExpressionAst('a + b', createAdditionAst());
    const parseSpy = jest.spyOn(expressionParser, 'parse');

    const model = { a: 2, b: 3 };
    const expression = rsx<number>('a + b')(model);

    await waitForValue(expression);
    expect(expression.value).toBe(5);
    expect(parseSpy).not.toHaveBeenCalled();

    await new WaitForEvent(expression, 'changed').wait(() => {
      model.a = 8;
    });
    expect(expression.value).toBe(11);
    expression.dispose();
    parseSpy.mockRestore();
  });

  it('uses preparsed cache entry when expression is created through expressionFactory.create', async () => {
    registerPreparsedExpressionAst('a + b + 1', {
      type: 'BinaryExpression',
      operator: '+',
      left: createAdditionAst(),
      right: {
        type: 'Literal',
        value: 1,
      },
    } as unknown as Expression);
    const parseSpy = jest.spyOn(expressionParser, 'parse');

    const model = { a: 1, b: 4 };
    const expression = expressionFactory.create<number>(model, 'a + b + 1');

    await waitForValue(expression);
    expect(expression.value).toBe(6);
    expect(parseSpy).not.toHaveBeenCalled();

    await new WaitForEvent(expression, 'changed').wait(() => {
      model.b = 10;
    });
    expect(expression.value).toBe(12);
    expression.dispose();
    parseSpy.mockRestore();
  });
});
