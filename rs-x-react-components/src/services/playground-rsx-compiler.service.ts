import type * as TypeScriptModule from 'typescript';

export interface IPlaygroundCompilerDiagnostic {
  category: 'semantic' | 'syntax' | 'unsupported';
  message: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

export const SOURCE_NAME = 'rsx-playground-user-script.ts';
export const EXPRESSION_PARSER_DTS =
  '/virtual/node_modules/@rs-x/expression-parser/index.d.ts';
const PRELUDE_LINES = 1;
export const WRAPPER_HEADER = [
  '"use strict";',
  '(async function (api: IPlaygroundApi) {',
  '  const rsx = __rsx_import;',
  '  const rxjs: RsxPlaygroundRxjsApi = api.rxjs;',
  '  const printValue = api.printValue;',
  '  const stateManager = api.stateManager;',
  '  const IndexWatchRule = api.IndexWatchRule;',
  '  const WaitForEvent = api.WaitForEvent;',
  '  const ExpressionChangeTransactionManager = api.ExpressionChangeTransactionManager;',
  '  {',
];
export const WRAPPER_FOOTER = ['  }', '})'];
const WRAPPER_LINE_OFFSET = PRELUDE_LINES + WRAPPER_HEADER.length;
const EXPRESSION_PARSER_GLOBAL_DTS = `
declare global {
interface Array<T> {
  readonly length: number;
  [index: number]: T;
}

interface ReadonlyArray<T> {
  readonly length: number;
  readonly [index: number]: T;
}

interface Map<K, V> {
  get(key: K): V | undefined;
  has(key: K): boolean;
}

interface Set<T> {
  has(value: T): boolean;
}

interface PromiseLike<T> {
  then<TResult>(
    onfulfilled?: (value: T) => TResult | PromiseLike<TResult>,
  ): PromiseLike<TResult>;
}

interface Promise<T> extends PromiseLike<T> {}

interface RsxPlaygroundSubscriptionLike {
  unsubscribe(): void;
  readonly closed?: boolean;
}

interface RsxPlaygroundObserver<T> {
  next(value: T): void;
  error?(error: unknown): void;
  complete?(): void;
}

interface RsxPlaygroundOperatorFunction<TSource, TResult> {
  (source: RsxPlaygroundObservable<TSource>): RsxPlaygroundObservable<TResult>;
}

interface RsxPlaygroundMonoTypeOperatorFunction<T>
  extends RsxPlaygroundOperatorFunction<T, T> {}

interface RsxPlaygroundObservable<T> {
  readonly value?: T;
  subscribe(
    observer?: Partial<RsxPlaygroundObserver<T>>,
  ): RsxPlaygroundSubscriptionLike;
  pipe(): RsxPlaygroundObservable<T>;
  pipe<A>(
    op1: RsxPlaygroundOperatorFunction<T, A>,
  ): RsxPlaygroundObservable<A>;
  pipe<A, B>(
    op1: RsxPlaygroundOperatorFunction<T, A>,
    op2: RsxPlaygroundOperatorFunction<A, B>,
  ): RsxPlaygroundObservable<B>;
}

interface RsxPlaygroundSubject<T> extends RsxPlaygroundObservable<T> {
  next(value: T): void;
}

interface RsxPlaygroundBehaviorSubject<T> extends RsxPlaygroundSubject<T> {
  value: T;
  getValue(): T;
}

type RsxPlaygroundRxjsApi = {
  Observable: new <T>() => RsxPlaygroundObservable<T>;
  Subject: new <T>() => RsxPlaygroundSubject<T>;
  BehaviorSubject: new <T>(value: T) => RsxPlaygroundBehaviorSubject<T>;
  ReplaySubject: new <T>(bufferSize?: number) => RsxPlaygroundSubject<T>;
  AsyncSubject: new <T>() => RsxPlaygroundSubject<T>;
  of: <T>(...values: T[]) => RsxPlaygroundObservable<T>;
  interval: (period: number) => RsxPlaygroundObservable<number>;
  timer: (dueTime: number) => RsxPlaygroundObservable<number>;
  map: <TResult>(
    project: (value: unknown, index: number) => TResult,
  ) => RsxPlaygroundOperatorFunction<unknown, TResult>;
  startWith: <TSource>(
    ...values: TSource[]
  ) => RsxPlaygroundMonoTypeOperatorFunction<TSource>;
  filter: <TSource>(
    predicate: (value: TSource, index: number) => boolean,
  ) => RsxPlaygroundMonoTypeOperatorFunction<TSource>;
  tap: <TSource>(
    next: (value: TSource) => void,
  ) => RsxPlaygroundMonoTypeOperatorFunction<TSource>;
};
}

declare global {
  type RsxPlaygroundConstructor<T = unknown> = new (...args: unknown[]) => T;
  type RsxPlaygroundCallable = (...args: unknown[]) => unknown;

  interface Math {
    floor(value: number): number;
    random(): number;
  }

  const Math: Math;
  const Date: RsxPlaygroundConstructor<{
    getFullYear(): number;
    setFullYear(value: number): void;
    getTime(): number;
    setTime(value: number): void;
  }>;
  const Number: {
    (value?: unknown): number;
    new (value?: unknown): { valueOf(): number };
  };
  const String: {
    (value?: unknown): string;
    new (value?: unknown): { valueOf(): string };
  };
  const Boolean: {
    (value?: unknown): boolean;
    new (value?: unknown): { valueOf(): boolean };
  };
  const BigInt: (value?: unknown) => bigint;
  const Symbol: (description?: string) => symbol;
  const Object: RsxPlaygroundConstructor<object> & RsxPlaygroundCallable;
  const Array: RsxPlaygroundConstructor<unknown[]>;
  const RegExp: RsxPlaygroundConstructor<object>;
  const Map: RsxPlaygroundConstructor<object>;
  const Set: RsxPlaygroundConstructor<object>;
  const WeakMap: RsxPlaygroundConstructor<object>;
  const WeakSet: RsxPlaygroundConstructor<object>;
  const Promise: RsxPlaygroundConstructor<PromiseLike<unknown>>;
  const Error: RsxPlaygroundConstructor<Error>;
  const TypeError: RsxPlaygroundConstructor<Error>;
  const RangeError: RsxPlaygroundConstructor<Error>;
  const ReferenceError: RsxPlaygroundConstructor<Error>;
  const SyntaxError: RsxPlaygroundConstructor<Error>;
  const URIError: RsxPlaygroundConstructor<Error>;
  const AggregateError: RsxPlaygroundConstructor<Error>;
  const JSON: {
    parse(text: string): unknown;
    stringify(value: unknown): string;
  };
  const Intl: Record<string, unknown>;
  const Reflect: Record<string, unknown>;
  const Proxy: RsxPlaygroundConstructor<object>;
  const parseInt: (text: string, radix?: number) => number;
  const parseFloat: (text: string) => number;
  const isNaN: (value: unknown) => boolean;
  const isFinite: (value: unknown) => boolean;
  const encodeURI: (value: string) => string;
  const encodeURIComponent: (value: string) => string;
  const decodeURI: (value: string) => string;
  const decodeURIComponent: (value: string) => string;
  const setTimeout: (
    callback: (...args: unknown[]) => void,
    delay?: number,
    ...args: unknown[]
  ) => unknown;
  const clearTimeout: (id: unknown) => void;
  const setInterval: (
    callback: (...args: unknown[]) => void,
    delay?: number,
    ...args: unknown[]
  ) => unknown;
  const clearInterval: (id: unknown) => void;
  const console: {
    log: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };

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
  const rxjs: RsxPlaygroundRxjsApi;
  const printValue: (value: unknown) => void;
  const stateManager: IStateManager;
  const IndexWatchRule: new (...args: unknown[]) => IIndexWatchRule;
  const WaitForEvent: new (...args: unknown[]) => unknown;
  const ExpressionChangeTransactionManager: IExpressionChangeTransactionManager;
  interface IPlaygroundApi {
    rsx: typeof rsx;
    rxjs: RsxPlaygroundRxjsApi;
    printValue: typeof printValue;
    stateManager: typeof stateManager;
    IndexWatchRule: typeof IndexWatchRule;
    WaitForEvent: typeof WaitForEvent;
    ExpressionChangeTransactionManager: typeof ExpressionChangeTransactionManager;
  }

  const api: IPlaygroundApi;
}
export declare const rsx: (expression: string) => (model: unknown) => unknown;
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

export { EXPRESSION_PARSER_GLOBAL_DTS };

export function createInMemoryProgram(args: {
  ts: typeof TypeScriptModule;
  sourceText: string;
}): TypeScriptModule.Program {
  const { ts, sourceText } = args;
  const options: TypeScriptModule.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    strict: false,
    allowJs: true,
    checkJs: true,
    allowReturnOutsideFunction: true,
    allowNonTsExtensions: true,
    noResolve: false,
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

  const host: TypeScriptModule.CompilerHost = {
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
        if (
          moduleName === '@rs-x/expression-parser' ||
          moduleName === 'rxjs' ||
          moduleName === 'rxjs/operators'
        ) {
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
        )?.[1] ?? diagnostic.message.match(/index '([^']+)'/u)?.[1];

      if (unresolvedIdentifier) {
        const containingLiteral = literalRanges.find(
          (range) =>
            range.start <= diagnostic.start && diagnostic.end <= range.end,
        );
        if (containingLiteral) {
          const offsetInExpression =
            containingLiteral.expression.indexOf(unresolvedIdentifier);
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
