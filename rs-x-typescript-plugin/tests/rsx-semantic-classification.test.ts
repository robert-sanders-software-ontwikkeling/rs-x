import { tokenizeRsxExpression } from '@rs-x/compiler';

import {
  createRsxSemanticClassificationContext,
  resolveSemanticTokenTypeForIdentifier,
  RSX_SEMANTIC_TOKEN_TYPE,
} from '../lib/rsx-semantic-classification';

function findIdentifierToken(args: {
  expression: string;
  value: string;
  occurrence?: number;
}) {
  const { expression, value, occurrence = 0 } = args;
  const tokens = tokenizeRsxExpression(expression).filter(
    (token) =>
      token.kind === 'identifier' &&
      expression.slice(token.start, token.end) === value,
  );
  const token = tokens[occurrence];
  if (!token) {
    throw new Error(`Identifier token not found: ${value}#${occurrence}`);
  }

  return token;
}

describe('rsx semantic classification', () => {
  it('classifies lambda parameters and references as parameters', () => {
    const expression = 'lines.reduce((sum, line) => sum + line.qty, 0)';
    const context = createRsxSemanticClassificationContext(expression);

    const lambdaSumDeclaration = findIdentifierToken({
      expression,
      value: 'sum',
      occurrence: 0,
    });
    const lambdaLineDeclaration = findIdentifierToken({
      expression,
      value: 'line',
      occurrence: 0,
    });
    const lambdaSumReference = findIdentifierToken({
      expression,
      value: 'sum',
      occurrence: 1,
    });
    const lambdaLineReference = findIdentifierToken({
      expression,
      value: 'line',
      occurrence: 1,
    });
    const propertyReference = findIdentifierToken({
      expression,
      value: 'qty',
    });

    expect(
      resolveSemanticTokenTypeForIdentifier({
        context,
        text: expression,
        token: lambdaSumDeclaration,
      }),
    ).toBe(RSX_SEMANTIC_TOKEN_TYPE.parameter);
    expect(
      resolveSemanticTokenTypeForIdentifier({
        context,
        text: expression,
        token: lambdaLineDeclaration,
      }),
    ).toBe(RSX_SEMANTIC_TOKEN_TYPE.parameter);
    expect(
      resolveSemanticTokenTypeForIdentifier({
        context,
        text: expression,
        token: lambdaSumReference,
      }),
    ).toBe(RSX_SEMANTIC_TOKEN_TYPE.parameter);
    expect(
      resolveSemanticTokenTypeForIdentifier({
        context,
        text: expression,
        token: lambdaLineReference,
      }),
    ).toBe(RSX_SEMANTIC_TOKEN_TYPE.parameter);
    expect(
      resolveSemanticTokenTypeForIdentifier({
        context,
        text: expression,
        token: propertyReference,
      }),
    ).toBe(RSX_SEMANTIC_TOKEN_TYPE.property);
  });

  it('keeps non-lambda identifiers classified as variables or functions', () => {
    const expression = 'count + test(1)';
    const context = createRsxSemanticClassificationContext(expression);

    const variableToken = findIdentifierToken({
      expression,
      value: 'count',
    });
    const functionToken = findIdentifierToken({
      expression,
      value: 'test',
    });

    expect(
      resolveSemanticTokenTypeForIdentifier({
        context,
        text: expression,
        token: variableToken,
      }),
    ).toBe(RSX_SEMANTIC_TOKEN_TYPE.variable);
    expect(
      resolveSemanticTokenTypeForIdentifier({
        context,
        text: expression,
        token: functionToken,
      }),
    ).toBe(RSX_SEMANTIC_TOKEN_TYPE.function);
  });
});
