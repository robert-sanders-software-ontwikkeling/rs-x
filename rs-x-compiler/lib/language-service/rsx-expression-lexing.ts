export type RsxTokenKind =
  | 'identifier'
  | 'keyword'
  | 'number'
  | 'operator'
  | 'punctuation'
  | 'string';

export interface IRsxToken {
  start: number;
  end: number;
  kind: RsxTokenKind;
}

export interface IRsxExpressionLiteralRange {
  start: number;
  end: number;
  expression: string;
}

const RSX_KEYWORDS = new Set([
  'true',
  'false',
  'null',
  'undefined',
  'new',
  'typeof',
  'instanceof',
  'in',
  'void',
  'delete',
  'this',
]);

const OPERATOR_HEAD = new Set([
  '+',
  '-',
  '*',
  '/',
  '%',
  '=',
  '!',
  '<',
  '>',
  '&',
  '|',
  '^',
  '~',
  '?',
]);

const OPERATORS = [
  '>>>',
  '===',
  '!==',
  '<<=',
  '>>=',
  '&&',
  '||',
  '??',
  '==',
  '!=',
  '<=',
  '>=',
  '=>',
  '<<',
  '>>',
  '**',
  '?.',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '&=',
  '|=',
  '^=',
  '++',
  '--',
] as const;

const PUNCTUATION = new Set(['(', ')', '[', ']', '{', '}', '.', ',', ':', ';']);

function isWhitespace(char: string): boolean {
  return /\s/u.test(char);
}

function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_$]/u.test(char);
}

function isIdentifierPart(char: string): boolean {
  return /[A-Za-z0-9_$]/u.test(char);
}

function consumeIdentifier(text: string, start: number): number {
  let end = start + 1;
  while (end < text.length && isIdentifierPart(text[end])) {
    end++;
  }
  return end;
}

function isNumberStart(text: string, index: number): boolean {
  const char = text[index];
  const next = text[index + 1];
  if (/\d/u.test(char)) {
    return true;
  }
  return char === '.' && /\d/u.test(next);
}

function consumeNumber(text: string, start: number): number {
  let index = start;

  if (text[index] === '0' && index + 1 < text.length) {
    const marker = text[index + 1];
    if (marker === 'x' || marker === 'X') {
      index += 2;
      while (index < text.length && /[0-9A-Fa-f_]/u.test(text[index])) {
        index++;
      }
      return index;
    }
    if (marker === 'b' || marker === 'B') {
      index += 2;
      while (index < text.length && /[01_]/u.test(text[index])) {
        index++;
      }
      return index;
    }
    if (marker === 'o' || marker === 'O') {
      index += 2;
      while (index < text.length && /[0-7_]/u.test(text[index])) {
        index++;
      }
      return index;
    }
  }

  while (index < text.length && /[0-9_]/u.test(text[index])) {
    index++;
  }

  if (text[index] === '.') {
    index++;
    while (index < text.length && /[0-9_]/u.test(text[index])) {
      index++;
    }
  }

  if (text[index] === 'e' || text[index] === 'E') {
    const exponentStart = index;
    index++;
    if (text[index] === '+' || text[index] === '-') {
      index++;
    }
    const digitsStart = index;
    while (index < text.length && /[0-9_]/u.test(text[index])) {
      index++;
    }
    if (digitsStart === index) {
      return exponentStart;
    }
  }

  if (text[index] === 'n') {
    index++;
  }

  return index;
}

function isQuote(char: string): boolean {
  return char === "'" || char === '"' || char === '`';
}

function consumeQuoted(text: string, start: number, quote: string): number {
  let index = start + 1;
  while (index < text.length) {
    const char = text[index];
    if (char === '\\') {
      index += 2;
      continue;
    }
    index++;
    if (char === quote) {
      return index;
    }
  }
  return text.length;
}

function matchOperator(text: string, index: number): string | null {
  for (const op of OPERATORS) {
    if (text.startsWith(op, index)) {
      return op;
    }
  }
  return null;
}

export function tokenizeRsxExpression(text: string): IRsxToken[] {
  const tokens: IRsxToken[] = [];
  let index = 0;

  while (index < text.length) {
    const char = text[index];
    if (isWhitespace(char)) {
      index++;
      continue;
    }

    if (isQuote(char)) {
      const end = consumeQuoted(text, index, char);
      tokens.push({ start: index, end, kind: 'string' });
      index = end;
      continue;
    }

    if (isNumberStart(text, index)) {
      const end = consumeNumber(text, index);
      tokens.push({ start: index, end, kind: 'number' });
      index = end;
      continue;
    }

    if (isIdentifierStart(char)) {
      const end = consumeIdentifier(text, index);
      const value = text.slice(index, end);
      tokens.push({
        start: index,
        end,
        kind: RSX_KEYWORDS.has(value) ? 'keyword' : 'identifier',
      });
      index = end;
      continue;
    }

    const operator = matchOperator(text, index);
    if (operator) {
      tokens.push({
        start: index,
        end: index + operator.length,
        kind: 'operator',
      });
      index += operator.length;
      continue;
    }

    if (PUNCTUATION.has(char)) {
      tokens.push({ start: index, end: index + 1, kind: 'punctuation' });
      index += 1;
      continue;
    }

    if (OPERATOR_HEAD.has(char)) {
      tokens.push({ start: index, end: index + 1, kind: 'operator' });
      index += 1;
      continue;
    }

    index += 1;
  }

  return tokens;
}

function consumeUntilMatchingQuote(args: {
  text: string;
  start: number;
  quote: string;
}): number {
  const { text, start, quote } = args;
  let index = start;
  while (index < text.length) {
    const char = text[index];
    if (char === '\\') {
      index += 2;
      continue;
    }
    if (char === quote) {
      return index;
    }
    index++;
  }
  return -1;
}

export function findRsxExpressionLiteralRanges(
  sourceText: string,
): IRsxExpressionLiteralRange[] {
  const ranges: IRsxExpressionLiteralRange[] = [];
  let cursor = 0;

  while (cursor < sourceText.length) {
    const rsxCallStart = sourceText.indexOf('rsx', cursor);
    if (rsxCallStart === -1) {
      break;
    }

    let index = rsxCallStart + 3;
    while (index < sourceText.length && /\s/u.test(sourceText[index])) {
      index++;
    }
    if (sourceText[index] !== '(') {
      cursor = rsxCallStart + 3;
      continue;
    }
    index++;
    while (index < sourceText.length && /\s/u.test(sourceText[index])) {
      index++;
    }

    const quote = sourceText[index];
    if (quote !== "'" && quote !== '"' && quote !== '`') {
      cursor = rsxCallStart + 3;
      continue;
    }
    const contentStart = index + 1;
    const quoteEnd = consumeUntilMatchingQuote({
      text: sourceText,
      start: contentStart,
      quote,
    });
    if (quoteEnd === -1) {
      break;
    }

    ranges.push({
      start: contentStart,
      end: quoteEnd,
      expression: sourceText.slice(contentStart, quoteEnd),
    });

    cursor = quoteEnd + 1;
  }

  return ranges;
}
