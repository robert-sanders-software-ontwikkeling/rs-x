import {
  JsExpressionAstParser,
  JsExpressionParser,
} from '@rs-x/expression-parser';

export type CompilerDiagnosticCategory = 'semantic' | 'syntax' | 'unsupported';

export interface ICompilerDiagnostic {
  readonly category: CompilerDiagnosticCategory;
  readonly message: string;
  readonly token?: string;
}

const parser = new JsExpressionParser(new JsExpressionAstParser());

const trailingOperators = [
  'instanceof',
  '>>>',
  '>>',
  '<<',
  '===',
  '!==',
  '==',
  '!=',
  '>=',
  '<=',
  '&&',
  '||',
  '??',
  '**',
  '+',
  '-',
  '*',
  '/',
  '%',
  '&',
  '|',
  '^',
  '>',
  '<',
  'in',
  '?',
];

export function parseExpressionDiagnostic(
  expression: string,
): ICompilerDiagnostic | null {
  try {
    parser.parse(expression);
    return null;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown parser error';
    return classifyParserError(expression, message);
  }
}

export function classifyParserError(
  expression: string,
  parserMessage: string,
): ICompilerDiagnostic {
  const normalizedExpression = expression.trim();

  if (isUnsupportedMessage(parserMessage)) {
    return {
      category: 'unsupported',
      message: extractUnsupportedMessage(parserMessage),
    };
  }

  const missingOperand = tryCreateMissingOperandMessage(normalizedExpression);
  if (missingOperand) {
    return {
      category: 'syntax',
      message: missingOperand,
    };
  }

  const unterminatedLiteral =
    tryCreateUnterminatedLiteralMessage(normalizedExpression);
  if (unterminatedLiteral) {
    return {
      category: 'syntax',
      message: unterminatedLiteral,
    };
  }

  const missingRightOperand =
    tryCreateMissingRightOperandMessage(normalizedExpression);
  if (missingRightOperand) {
    return {
      category: 'syntax',
      message: missingRightOperand,
    };
  }

  const unclosedToken = tryCreateUnclosedTokenMessage(
    normalizedExpression,
    parserMessage,
  );
  if (unclosedToken) {
    return {
      category: 'syntax',
      message: unclosedToken,
    };
  }

  return {
    category: 'syntax',
    message: `Syntax error in expression '${normalizedExpression}'.`,
  };
}

function isUnsupportedMessage(message: string): boolean {
  return (
    message.includes('not supported') ||
    message.includes('Unsupported expression type') ||
    message.includes('Unsupported')
  );
}

function sanitizeParserMessage(message: string): string {
  return message.replace(/^Line \d+:\s*/u, '').trim();
}

function tryCreateMissingRightOperandMessage(
  normalizedExpression: string,
): string | null {
  for (const operator of trailingOperators) {
    if (endsWithOperator(normalizedExpression, operator)) {
      return `Missing right operand for '${normalizedExpression}'.`;
    }
  }

  if (normalizedExpression.endsWith(':')) {
    return `Missing right operand for '${normalizedExpression}'.`;
  }

  return null;
}

function tryCreateMissingOperandMessage(
  normalizedExpression: string,
): string | null {
  if (
    normalizedExpression === '!' ||
    normalizedExpression === '~' ||
    normalizedExpression === '+' ||
    normalizedExpression === '-' ||
    normalizedExpression === 'typeof' ||
    normalizedExpression === 'new'
  ) {
    return `Missing operand for '${normalizedExpression}'.`;
  }

  return null;
}

function tryCreateUnterminatedLiteralMessage(
  normalizedExpression: string,
): string | null {
  if (hasUnterminatedQuotedLiteral(normalizedExpression, '"')) {
    return `Unterminated string literal in '${normalizedExpression}'.`;
  }

  if (hasUnterminatedQuotedLiteral(normalizedExpression, "'")) {
    return `Unterminated string literal in '${normalizedExpression}'.`;
  }

  if (
    normalizedExpression.startsWith('`') &&
    !normalizedExpression.endsWith('`')
  ) {
    return `Unterminated template literal in '${normalizedExpression}'.`;
  }

  if (
    normalizedExpression.startsWith('/') &&
    normalizedExpression.length > 1 &&
    normalizedExpression.lastIndexOf('/') === 0
  ) {
    return `Unterminated regular expression literal in '${normalizedExpression}'.`;
  }

  return null;
}

function hasUnterminatedQuotedLiteral(
  expression: string,
  quoteCharacter: '"' | "'",
): boolean {
  if (!expression.startsWith(quoteCharacter)) {
    return false;
  }

  return countUnescapedCharacter(expression, quoteCharacter) % 2 !== 0;
}

function countUnescapedCharacter(
  expression: string,
  character: string,
): number {
  let count = 0;

  for (let index = 0; index < expression.length; index += 1) {
    if (expression[index] !== character) {
      continue;
    }

    const previous = expression[index - 1];
    if (previous !== '\\') {
      count += 1;
    }
  }

  return count;
}

function tryCreateUnclosedTokenMessage(
  normalizedExpression: string,
  parserMessage: string,
): string | null {
  if (!hasUnclosedTokenSignal(normalizedExpression, parserMessage)) {
    return null;
  }

  return `Unclosed token in '${normalizedExpression}'.`;
}

function hasUnclosedTokenSignal(
  normalizedExpression: string,
  parserMessage: string,
): boolean {
  const message = sanitizeParserMessage(parserMessage).toLowerCase();

  if (
    message.includes('unexpected end of input') ||
    message.includes('unterminated')
  ) {
    return true;
  }

  return hasUnbalancedDelimiters(normalizedExpression);
}

function extractUnsupportedMessage(parserMessage: string): string {
  const sanitizedMessage = sanitizeParserMessage(parserMessage);
  const unsupportedMatch = sanitizedMessage.match(
    /([^.]*not supported[^.]*)/iu,
  );

  if (!unsupportedMatch) {
    return sanitizedMessage;
  }

  return unsupportedMatch[1].trim();
}

function endsWithOperator(expression: string, operator: string): boolean {
  if (
    (operator === '+' || operator === '-') &&
    /(?:\d+(?:\.\d+)?)[eE][+-]$/u.test(expression)
  ) {
    return false;
  }

  const escapedOperator = operator.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  const operatorPattern =
    operator === 'instanceof' || operator === 'in'
      ? `\\b${escapedOperator}\\s*$`
      : `${escapedOperator}\\s*$`;

  return new RegExp(operatorPattern, 'u').test(expression);
}

function hasUnbalancedDelimiters(expression: string): boolean {
  let roundDepth = 0;
  let squareDepth = 0;
  let curlyDepth = 0;

  for (const character of expression) {
    if (character === '(') {
      roundDepth += 1;
    } else if (character === ')') {
      roundDepth -= 1;
    } else if (character === '[') {
      squareDepth += 1;
    } else if (character === ']') {
      squareDepth -= 1;
    } else if (character === '{') {
      curlyDepth += 1;
    } else if (character === '}') {
      curlyDepth -= 1;
    }
  }

  return roundDepth !== 0 || squareDepth !== 0 || curlyDepth !== 0;
}
