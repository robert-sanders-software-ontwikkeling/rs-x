import path from 'node:path';

import ts from 'typescript';

import { ExpressionType } from '../../rs-x-expression-parser/lib/expressions/expression-parser.interface';
import {
  createRsxStandaloneLanguageService,
  getRsxSemanticTokens,
  rsxSemanticTokenTypes,
} from '../lib/rsx-standalone-language-service';

interface ITokenSnapshot {
  readonly start: number;
  readonly length: number;
  readonly text: string;
  readonly type: string;
}

const workspaceRoot = path.resolve(__dirname, '../..');
const rsxFixturePath = path.resolve(
  workspaceRoot,
  './rs-x-compiler/tests/fixtures/expression-file.fixture.rsx',
);
const tsParityFileName = path.resolve(
  workspaceRoot,
  './rs-x-vscode-extension/tests/fixtures/rsx-color-parity.fixture.ts',
);

const RSX_MODEL_HEADER =
  'model: { a: number; b: number; c: number; flag: boolean; flag2: boolean; text: string; maybeText: string | null; arr: number[]; obj: { value: number; nested: { value: number }; values: number[]; method: (n: number) => number }; maybeObj: { value: number; fn?: (n: number) => number; values?: number[] } | null; fn: (n: number) => number; maybeFn: ((n: number) => number) | null; ctor: new (value: number) => { value: number }; key: string; map: Record<string, number>; tag: (strings: TemplateStringsArray, ...values: unknown[]) => string }' +
  '\nreturn: unknown';

const TS_BASELINE_PREFIX = [
  'const a = 1;',
  'const b = 2;',
  'const c = 3;',
  'const flag = true;',
  'const flag2 = false;',
  "const text = 'text';",
  'const maybeText: string | null = null;',
  'const arr = [1, 2, 3];',
  'const obj = {',
  '  value: 1,',
  '  nested: { value: 2 },',
  '  values: [1, 2, 3],',
  '  method: (n: number) => n + 1,',
  '};',
  'const maybeObj: { value: number; fn?: (n: number) => number; values?: number[] } | null = obj;',
  'const fn = (n: number) => n + 1;',
  'const maybeFn: ((n: number) => number) | null = fn;',
  'const ctor: new (value: number) => { value: number } = class {',
  '  public value: number;',
  '  public constructor(value: number) {',
  '    this.value = value;',
  '  }',
  '};',
  "const key = 'value';",
  'const map: Record<string, number> = { value: 1 };',
  'const tag = (strings: TemplateStringsArray, ...values: unknown[]) =>',
  "  `${strings[0] ?? ''}${values.map(String).join('')}`;",
].join('\n');

const SUPPORTED_EXPRESSION_SAMPLES = new Map<ExpressionType, readonly string[]>(
  [
    [ExpressionType.Addition, ['a + b']],
    [ExpressionType.And, ['flag && flag2']],
    [ExpressionType.Array, ['[a, b, ...arr]']],
    [ExpressionType.BigInt, ['1n']],
    [ExpressionType.BitwiseAnd, ['a & b']],
    [ExpressionType.BitwiseLeftShift, ['a << b']],
    [ExpressionType.BitwiseNot, ['~a']],
    [ExpressionType.BitwiseOr, ['a | b']],
    [ExpressionType.BitwiseRightShift, ['a >> b']],
    [ExpressionType.BitwiseUnsignedRightShift, ['a >>> b']],
    [ExpressionType.BitwiseXor, ['a ^ b']],
    [ExpressionType.Boolean, ['true']],
    [ExpressionType.Conditional, ['flag ? a : b']],
    [ExpressionType.Division, ['a / b']],
    [ExpressionType.Equality, ['a == b']],
    [ExpressionType.Exponentiation, ['a ** b']],
    [ExpressionType.Function, ['fn(a)', '(x) => x + a', 'tag`v:${a}`']],
    [ExpressionType.GreaterThan, ['a > b']],
    [ExpressionType.GreaterThanOrEqual, ['a >= b']],
    [ExpressionType.Identifier, ['a']],
    [ExpressionType.In, ['key in map']],
    [ExpressionType.ComputedIndex, ['arr[a]', 'obj.values?.[a] ?? b']],
    [ExpressionType.Inequality, ['a != b']],
    [ExpressionType.Instanceof, ['obj instanceof ctor']],
    [ExpressionType.LessThan, ['a < b']],
    [ExpressionType.LessThanOrEqual, ['a <= b']],
    [ExpressionType.Member, ['obj.nested.value', 'maybeObj?.value ?? a']],
    [ExpressionType.Multiplication, ['a * b']],
    [ExpressionType.New, ['new ctor(a)']],
    [ExpressionType.Not, ['!flag']],
    [ExpressionType.Null, ['null']],
    [ExpressionType.NullishCoalescing, ['maybeText ?? text']],
    [ExpressionType.Number, ['123']],
    [ExpressionType.Object, ['({ total: a, nested: { value: b }, ...obj })']],
    [ExpressionType.Or, ['flag || flag2']],
    [
      ExpressionType.Property,
      ['({ total: a, nested: { value: b } }).nested.value'],
    ],
    [ExpressionType.RegExp, ['/a+/gi']],
    [ExpressionType.Remainder, ['a % b']],
    [ExpressionType.Sequence, ['(a, b, c)']],
    [ExpressionType.Spread, ['[...arr]', '({ ...obj })']],
    [ExpressionType.StrictEquality, ['a === b']],
    [ExpressionType.StrictInequality, ['a !== b']],
    [ExpressionType.String, ["'hello'"]],
    [ExpressionType.Subtraction, ['a - b']],
    [ExpressionType.TemplateLiteral, ['`value:${a}`']],
    [ExpressionType.Typeof, ['typeof a']],
    [ExpressionType.UnaryNegation, ['-a']],
    [ExpressionType.UnaryPlus, ['+a']],
  ],
);

const PARITY_CASES = [...SUPPORTED_EXPRESSION_SAMPLES.entries()].flatMap(
  ([expressionType, samples]) =>
    samples.map((expression) => ({
      expressionType,
      expression,
    })),
);

describe('rsx color parity', () => {
  it('includes at least one parity sample for every supported expression type', () => {
    const mappedTypes = [...SUPPORTED_EXPRESSION_SAMPLES.keys()].sort();
    const allTypes = [...Object.values(ExpressionType)].sort();
    expect(mappedTypes).toEqual(allTypes);
  });

  it.each(PARITY_CASES)(
    '$expressionType matches TypeScript token classifications for "$expression"',
    ({ expression }) => {
      const rsxTokens = getRsxColorTokensForExpression(expression);
      const tsTokens = getTypeScriptColorTokensForExpression(expression);
      expect(rsxTokens).toEqual(tsTokens);
    },
  );
});

function getRsxColorTokensForExpression(expression: string): ITokenSnapshot[] {
  const text = [RSX_MODEL_HEADER, '', expression].join('\n');
  const expressionStart = text.lastIndexOf(expression);
  expect(expressionStart).toBeGreaterThanOrEqual(0);
  const expressionEnd = expressionStart + expression.length;
  const document = createRsxStandaloneLanguageService({
    fileName: rsxFixturePath,
    text,
  });

  expect(document).not.toBeNull();
  return normalizeTokenSnapshots({
    sourceText: text,
    rangeStart: expressionStart,
    rangeEnd: expressionEnd,
    tokens: getRsxSemanticTokens(document!),
  });
}

function getTypeScriptColorTokensForExpression(
  expression: string,
): ITokenSnapshot[] {
  const text = `${TS_BASELINE_PREFIX}\nconst __result = (${expression});\n`;
  const expressionStart = text.indexOf(expression);
  expect(expressionStart).toBeGreaterThanOrEqual(0);
  const expressionEnd = expressionStart + expression.length;
  const semanticTokens = getTypeScriptSemanticTokens({
    text,
    expressionStart,
    expressionEnd,
  });
  const syntacticTokens = getTypeScriptSyntacticTokens(expression);
  const bySpan = new Map<string, ITokenSnapshot>();
  for (const token of syntacticTokens) {
    bySpan.set(`${token.start}:${token.length}`, token);
  }
  for (const token of semanticTokens) {
    bySpan.set(`${token.start}:${token.length}`, token);
  }

  return [...bySpan.values()].sort((left, right) =>
    left.start === right.start
      ? left.length - right.length
      : left.start - right.start,
  );
}

function getTypeScriptSemanticTokens(args: {
  text: string;
  expressionStart: number;
  expressionEnd: number;
}): ITokenSnapshot[] {
  const host: ts.LanguageServiceHost = {
    getCompilationSettings: () => ({
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true,
    }),
    getScriptFileNames: () => [tsParityFileName],
    getScriptSnapshot: (fileName) => {
      if (fileName === tsParityFileName) {
        return ts.ScriptSnapshot.fromString(args.text);
      }
      const fromDisk = ts.sys.readFile(fileName);
      return typeof fromDisk === 'string'
        ? ts.ScriptSnapshot.fromString(fromDisk)
        : undefined;
    },
    getScriptVersion: () => '1',
    getCurrentDirectory: () => workspaceRoot,
    getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
    fileExists: (fileName) =>
      fileName === tsParityFileName || ts.sys.fileExists(fileName),
    readFile: (fileName) =>
      fileName === tsParityFileName ? args.text : ts.sys.readFile(fileName),
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };
  const languageService = ts.createLanguageService(host);
  const spans =
    languageService.getEncodedSemanticClassifications(
      tsParityFileName,
      {
        start: args.expressionStart,
        length: args.expressionEnd - args.expressionStart,
      },
      ts.SemanticClassificationFormat.TwentyTwenty,
    ).spans ?? [];
  languageService.dispose();

  const tokens: ITokenSnapshot[] = [];
  for (let index = 0; index < spans.length; index += 3) {
    const start = spans[index];
    const length = spans[index + 1];
    const encoded = spans[index + 2];
    const tokenType = (encoded >> 8) - 1;
    if (tokenType < 0 || tokenType >= rsxSemanticTokenTypes.length) {
      continue;
    }

    const clampedStart = Math.max(start, args.expressionStart);
    const clampedEnd = Math.min(start + length, args.expressionEnd);
    if (clampedEnd <= clampedStart) {
      continue;
    }

    const relativeStart = clampedStart - args.expressionStart;
    const relativeLength = clampedEnd - clampedStart;
    const text = args.text.slice(clampedStart, clampedEnd);
    const normalizedText = text.trim();
    if (normalizedText.length === 0) {
      continue;
    }

    tokens.push({
      start: relativeStart,
      length: relativeLength,
      text,
      type: rsxSemanticTokenTypes[tokenType]!,
    });
  }

  return tokens;
}

function getTypeScriptSyntacticTokens(expression: string): ITokenSnapshot[] {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    expression,
    undefined,
  );
  const tokens: ITokenSnapshot[] = [];

  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    const tokenStart = scanner.getTokenPos();
    const tokenEnd = scanner.getTextPos();
    if (tokenEnd > tokenStart) {
      const tokenType = toSyntacticTokenType(token);
      if (tokenType !== null) {
        const text = expression.slice(tokenStart, tokenEnd);
        const normalizedText = text.trim();
        if (normalizedText.length > 0 && normalizedText !== '`') {
          tokens.push({
            start: tokenStart,
            length: tokenEnd - tokenStart,
            text,
            type: tokenType,
          });
        }
      }
    }

    token = scanner.scan();
  }

  return tokens;
}

function normalizeTokenSnapshots(args: {
  sourceText: string;
  rangeStart: number;
  rangeEnd: number;
  tokens: readonly {
    start: number;
    length: number;
    tokenType: number;
  }[];
}): ITokenSnapshot[] {
  const normalized = new Map<string, ITokenSnapshot>();
  for (const token of args.tokens) {
    const tokenStart = token.start;
    const tokenEnd = token.start + token.length;
    if (tokenEnd <= args.rangeStart || tokenStart >= args.rangeEnd) {
      continue;
    }

    const clampedStart = Math.max(tokenStart, args.rangeStart);
    const clampedEnd = Math.min(tokenEnd, args.rangeEnd);
    if (clampedEnd <= clampedStart) {
      continue;
    }

    const relativeStart = clampedStart - args.rangeStart;
    const relativeLength = clampedEnd - clampedStart;
    const text = args.sourceText.slice(clampedStart, clampedEnd);
    const normalizedText = text.trim();
    if (normalizedText.length === 0 || normalizedText === '`') {
      continue;
    }

    const type = rsxSemanticTokenTypes[token.tokenType];
    if (!type) {
      continue;
    }

    normalized.set(`${relativeStart}:${relativeLength}`, {
      start: relativeStart,
      length: relativeLength,
      text,
      type,
    });
  }

  return [...normalized.values()].sort((left, right) =>
    left.start === right.start
      ? left.length - right.length
      : left.start - right.start,
  );
}

function toSyntacticTokenType(token: ts.SyntaxKind): string | null {
  if (
    token >= ts.SyntaxKind.FirstKeyword &&
    token <= ts.SyntaxKind.LastKeyword
  ) {
    return 'keyword';
  }

  if (
    token === ts.SyntaxKind.SingleLineCommentTrivia ||
    token === ts.SyntaxKind.MultiLineCommentTrivia
  ) {
    return 'comment';
  }

  if (
    token === ts.SyntaxKind.StringLiteral ||
    token === ts.SyntaxKind.NoSubstitutionTemplateLiteral ||
    token === ts.SyntaxKind.TemplateHead ||
    token === ts.SyntaxKind.TemplateMiddle ||
    token === ts.SyntaxKind.TemplateTail
  ) {
    return 'string';
  }

  if (
    token === ts.SyntaxKind.NumericLiteral ||
    token === ts.SyntaxKind.BigIntLiteral
  ) {
    return 'number';
  }

  if (token === ts.SyntaxKind.RegularExpressionLiteral) {
    return 'regexp';
  }

  const tokenText = ts.tokenToString(token);
  if (tokenText && isOperatorLikeTokenText(tokenText)) {
    return 'operator';
  }

  return null;
}

function isOperatorLikeTokenText(text: string): boolean {
  return /^[+\-*\/%<>=!&|^~?:.,;()\[\]{}]+$/u.test(text);
}
