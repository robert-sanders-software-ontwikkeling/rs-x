import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import ts from 'typescript';

import {
  ExpressionType,
  type IExpressionTree,
  JsEspreeExpressionParser,
  JsExpressionAstParser,
} from '@rs-x/expression-parser';

import { validateExpressionSites } from '../lib/compiler/expression-site-validator';

const workspaceRoot = path.resolve(__dirname, '../..');

function createProgram(entryFile: string): ts.Program {
  const program = ts.createProgram({
    rootNames: [entryFile],
    options: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: true,
      skipLibCheck: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      types: ['node'],
      paths: {
        '@rs-x/core': ['./rs-x-core/lib/index.ts'],
        '@rs-x/state-manager': ['./rs-x-state-manager/lib/index.ts'],
        '@rs-x/expression-parser': ['./rs-x-expression-parser/lib/index.ts'],
      },
    },
  });

  const diagnostics = [
    ...program.getOptionsDiagnostics(),
    ...program.getGlobalDiagnostics(),
    ...program.getSyntacticDiagnostics(),
    ...program.getSemanticDiagnostics(),
  ].filter(
    (diagnostic) => !diagnostic.file || diagnostic.file.fileName === entryFile,
  );

  if (diagnostics.length > 0) {
    const formatHost: ts.FormatDiagnosticsHost = {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => workspaceRoot,
      getNewLine: () => '\n',
    };
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(diagnostics, formatHost),
    );
  }

  return program;
}

const expressionByType: Record<ExpressionType, string> = {
  [ExpressionType.Addition]: 'count + 1',
  [ExpressionType.And]: 'isActive && isReady',
  [ExpressionType.Array]: '[count, total]',
  [ExpressionType.BigInt]: '10n',
  [ExpressionType.BitwiseAnd]: 'count & mask',
  [ExpressionType.BitwiseLeftShift]: 'count << 1',
  [ExpressionType.BitwiseNot]: '~count',
  [ExpressionType.BitwiseOr]: 'count | mask',
  [ExpressionType.BitwiseRightShift]: 'count >> 1',
  [ExpressionType.BitwiseUnsignedRightShift]: 'count >>> 1',
  [ExpressionType.BitwiseXor]: 'count ^ mask',
  [ExpressionType.Boolean]: 'true',
  [ExpressionType.Conditional]: 'isActive ? count : total',
  [ExpressionType.Division]: 'total / count',
  [ExpressionType.Equality]: 'count == total',
  [ExpressionType.Exponentiation]: 'count ** 2',
  [ExpressionType.Function]: 'math.sum(count, total)',
  [ExpressionType.GreaterThan]: 'count > 0',
  [ExpressionType.GreaterThanOrEqual]: 'count >= 0',
  [ExpressionType.Identifier]: 'count',
  [ExpressionType.In]: '"name" in user',
  [ExpressionType.ComputedIndex]: 'items[index]',
  [ExpressionType.Inequality]: 'count != total',
  [ExpressionType.Instanceof]: 'dateValue instanceof Date',
  [ExpressionType.LessThan]: 'count < total',
  [ExpressionType.LessThanOrEqual]: 'count <= total',
  [ExpressionType.Member]: 'user.name',
  [ExpressionType.Multiplication]: 'count * total',
  [ExpressionType.New]: 'new Date()',
  [ExpressionType.Not]: '!isActive',
  [ExpressionType.Null]: 'null',
  [ExpressionType.NullishCoalescing]: 'maybeCount ?? count',
  [ExpressionType.Number]: '42',
  [ExpressionType.Object]: '[{ value: count }]',
  [ExpressionType.Or]: 'isActive || isReady',
  [ExpressionType.Property]: '[{ value: count }][0]',
  [ExpressionType.RegExp]: '/abc/',
  [ExpressionType.Remainder]: 'total % count',
  [ExpressionType.Sequence]: '(count, total)',
  [ExpressionType.Spread]: '[...items]',
  [ExpressionType.StrictEquality]: 'count === total',
  [ExpressionType.StrictInequality]: 'count !== total',
  [ExpressionType.String]: '"text"',
  [ExpressionType.Subtraction]: 'total - count',
  [ExpressionType.TemplateLiteral]: '`hello ${user.name}`',
  [ExpressionType.Typeof]: 'typeof count',
  [ExpressionType.UnaryNegation]: '-count',
  [ExpressionType.UnaryPlus]: '+count',
};

function collectExpressionTypes(root: IExpressionTree): Set<ExpressionType> {
  const seen = new Set<ExpressionType>();
  const stack: IExpressionTree[] = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    seen.add(current.type);
    stack.push(...current.childExpressions);
  }

  return seen;
}

describe('expression-site validation (exhaustive matrix)', () => {
  it('covers every ExpressionType in parsed ASTs and validates all without diagnostics', async () => {
    const parser = new JsEspreeExpressionParser(new JsExpressionAstParser());
    const expressionCases = Object.entries(expressionByType).map(
      ([, value]) => value,
    );
    const seenTypes = new Set<ExpressionType>();

    for (const expression of expressionCases) {
      const parsed = parser.parse(expression);
      const localTypes = collectExpressionTypes(parsed);
      for (const type of localTypes) {
        seenTypes.add(type);
      }
    }

    const missingTypes = (
      Object.values(ExpressionType) as ExpressionType[]
    ).filter((type) => !seenTypes.has(type));
    expect(missingTypes).toEqual([]);

    const fixtureDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'rsx-compiler-expression-matrix-'),
    );
    const fixturePath = path.join(fixtureDir, 'matrix.fixture.ts');

    const fixtureSource = `
import { rsx } from '@rs-x/expression-parser';

interface Model {
  count: number;
  total: number;
  mask: number;
  index: number;
  items: number[];
  maybeCount?: number;
  isActive: boolean;
  isReady: boolean;
  dateValue: Date;
  user: { name: string };
  extraObject: { extra: number };
  math: { sum(a: number, b: number): number };
}

declare const model: Model;

${expressionCases.map((expression) => `rsx(${JSON.stringify(expression)})(model);`).join('\n')}
`;

    await fs.writeFile(fixturePath, fixtureSource, 'utf8');
    const program = createProgram(fixturePath);
    const validatedSites = validateExpressionSites(program).filter(
      (site) => site.sourceFile.fileName === fixturePath,
    );

    expect(validatedSites.length).toBe(expressionCases.length);
    expect(
      validatedSites.flatMap((site) =>
        site.diagnostics.map((diagnostic) => diagnostic.message),
      ),
    ).toEqual([]);
  });
});
