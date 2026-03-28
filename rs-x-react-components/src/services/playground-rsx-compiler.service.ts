export interface IPlaygroundCompilerDiagnostic {
  category: 'semantic' | 'syntax' | 'unsupported';
  message: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

const SOURCE_NAME = 'rsx-playground-user-script.ts';
const EXPRESSION_PARSER_DTS =
  '/virtual/node_modules/@rs-x/expression-parser/index.d.ts';
const PRELUDE_LINES = 1;
const WRAPPER_HEADER = [
  '"use strict";',
  '(async function (api) {',
  '  const rsx = __rsx_import;',
  '  const { rxjs, printValue, stateManager, IndexWatchRule, WaitForEvent, ExpressionChangeTransactionManager } = api;',
  '  {',
];
const WRAPPER_FOOTER = ['  }', '})'];
const WRAPPER_LINE_OFFSET = PRELUDE_LINES + WRAPPER_HEADER.length;
const EXPRESSION_PARSER_GLOBAL_DTS = `
declare global {
  interface IIndexWatchRule {
    context: unknown;
    test(index: unknown, target: unknown): boolean;
  }

  interface IStateManager {
    getState(context: unknown, index: unknown): unknown;
    setState(context: unknown, index: unknown, newValue: unknown, ownerId?: unknown): void;
    releaseState(context: unknown, index: unknown, indexWatchRule?: IIndexWatchRule): void;
  }

  interface IExpressionChangeTransactionManager {
    suspend(): void;
    continue(): void;
    commit(): void;
  }

  const rsx: (expression: string) => (model: unknown) => unknown;
  const rxjs: unknown;
  const printValue: (value: unknown) => void;
  const stateManager: IStateManager;
  const IndexWatchRule: new (...args: unknown[]) => IIndexWatchRule;
  const WaitForEvent: new (...args: unknown[]) => unknown;
  const ExpressionChangeTransactionManager: IExpressionChangeTransactionManager;
  const api: {
    rsx: typeof rsx;
    rxjs: typeof rxjs;
    printValue: typeof printValue;
    stateManager: typeof stateManager;
    IndexWatchRule: typeof IndexWatchRule;
    WaitForEvent: typeof WaitForEvent;
    ExpressionChangeTransactionManager: typeof ExpressionChangeTransactionManager;
  };
}
export {};
`;

function normalizeScriptForRsxValidation(userScript: string): string {
  return userScript.replace(
    /\b(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*api\.rsx(\s*;?)/gu,
    '$1 $2 = __rsx_import$3',
  );
}

function wrapUserScript(userScript: string): string {
  const normalizedScript = normalizeScriptForRsxValidation(userScript);
  return [
    `import { rsx as __rsx_import } from '@rs-x/expression-parser';`,
    ...WRAPPER_HEADER,
    normalizedScript,
    ...WRAPPER_FOOTER,
    '',
  ].join('\n');
}

interface IWrappedExpressionLiteralRange {
  start: number;
  end: number;
  expression: string;
}

function findWrappedExpressionLiteralRanges(
  sourceText: string,
): IWrappedExpressionLiteralRange[] {
  const ranges: IWrappedExpressionLiteralRange[] = [];
  const callPattern = /\b(?:rsx|__rsx_import)\s*(?:<[^>]*>)?\s*\(\s*(['"`])/gu;
  let match: RegExpExecArray | null = null;

  while ((match = callPattern.exec(sourceText)) !== null) {
    const quote = match[1];
    const expressionStart = callPattern.lastIndex;

    let cursor = expressionStart;
    while (cursor < sourceText.length) {
      const char = sourceText[cursor];
      if (char === '\\') {
        cursor += 2;
        continue;
      }
      if (char === quote) {
        ranges.push({
          start: expressionStart,
          end: cursor,
          expression: sourceText.slice(expressionStart, cursor),
        });
        callPattern.lastIndex = cursor + 1;
        break;
      }
      cursor++;
    }
  }

  return ranges;
}

function createInMemoryProgram(args: {
  ts: typeof import('typescript');
  sourceText: string;
}): import('typescript').Program {
  const { ts, sourceText } = args;
  const options: import('typescript').CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    strict: false,
    allowJs: true,
    checkJs: true,
    allowReturnOutsideFunction: true,
    allowNonTsExtensions: true,
    noResolve: true,
    skipLibCheck: true,
    noLib: true,
  };

  const sourceFile = ts.createSourceFile(
    SOURCE_NAME,
    sourceText,
    options.target ?? ts.ScriptTarget.ES2020,
    true,
    ts.ScriptKind.TS,
  );

  const host: import('typescript').CompilerHost = {
    getSourceFile: (fileName) => {
      if (fileName === SOURCE_NAME) {
        return sourceFile;
      }
      if (fileName === EXPRESSION_PARSER_DTS) {
        return ts.createSourceFile(
          EXPRESSION_PARSER_DTS,
          EXPRESSION_PARSER_GLOBAL_DTS,
          options.target ?? ts.ScriptTarget.ES2020,
          true,
          ts.ScriptKind.TS,
        );
      }
      return undefined;
    },
    writeFile: () => {},
    getDefaultLibFileName: () => 'lib.d.ts',
    getCurrentDirectory: () => '/',
    getDirectories: () => [],
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: (fileName) =>
      fileName === SOURCE_NAME || fileName === EXPRESSION_PARSER_DTS,
    readFile: (fileName) => {
      if (fileName === SOURCE_NAME) {
        return sourceText;
      }
      if (fileName === EXPRESSION_PARSER_DTS) {
        return EXPRESSION_PARSER_GLOBAL_DTS;
      }
      return undefined;
    },
    resolveModuleNames: (moduleNames) =>
      moduleNames.map((moduleName) => {
        if (moduleName === '@rs-x/expression-parser') {
          return {
            resolvedFileName: EXPRESSION_PARSER_DTS,
            extension: ts.Extension.Dts,
            isExternalLibraryImport: true,
          };
        }
        return undefined;
      }),
  };

  return ts.createProgram([SOURCE_NAME, EXPRESSION_PARSER_DTS], options, host);
}

export function validatePlaygroundScriptWithRsxCompiler(
  userScript: string,
): Promise<IPlaygroundCompilerDiagnostic[]> {
  return (async () => {
    const [{ getRsxDiagnosticsForFile }, tsModule] = await Promise.all([
      import('@rs-x/compiler'),
      import('typescript'),
    ]);
    const ts = tsModule.default;
    const wrapped = wrapUserScript(userScript);
    const program = createInMemoryProgram({
      ts,
      sourceText: wrapped,
    });
    const sourceFile = program.getSourceFile(SOURCE_NAME);
    if (!sourceFile) {
      return [];
    }

    const diagnostics = getRsxDiagnosticsForFile(program, SOURCE_NAME);
    const literalRanges = findWrappedExpressionLiteralRanges(wrapped);
    return diagnostics.map((diagnostic) => {
      let start = diagnostic.start;
      let end = diagnostic.end;

      const unresolvedIdentifier =
        diagnostic.message.match(
          /Identifier '([^']+)' does not exist on model type\./u,
        )?.[1] ??
        diagnostic.message.match(/index '([^']+)'/u)?.[1];

      if (unresolvedIdentifier) {
        const containingLiteral = literalRanges.find(
          (range) => range.start <= diagnostic.start && diagnostic.end <= range.end,
        );
        if (containingLiteral) {
          const offsetInExpression = containingLiteral.expression.indexOf(
            unresolvedIdentifier,
          );
          if (offsetInExpression >= 0) {
            start = containingLiteral.start + offsetInExpression;
            end = start + unresolvedIdentifier.length;
          }
        }
      }

      const location = sourceFile.getLineAndCharacterOfPosition(start);
      const endLocation = sourceFile.getLineAndCharacterOfPosition(end);
      return {
        category: diagnostic.category,
        message: diagnostic.message,
        line: Math.max(1, location.line + 1 - WRAPPER_LINE_OFFSET),
        column: location.character + 1,
        endLine: Math.max(1, endLocation.line + 1 - WRAPPER_LINE_OFFSET),
        endColumn: endLocation.character + 1,
      };
    });
  })();
}
