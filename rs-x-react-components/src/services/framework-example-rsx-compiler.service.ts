import ts from 'typescript';

export type FrameworkKey = 'react' | 'nextjs' | 'vue' | 'angular';

export type FrameworkCompilerDiagnostic = {
  category: 'semantic' | 'syntax' | 'unsupported';
  message: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
};

const MONACO_FRAMEWORK_TYPES = `
declare module 'react' {
  export type ReactNode = any;
  export type ComponentType<P = any> = (props: P) => any;
  export function useMemo<T>(factory: () => T, deps: unknown[]): T;
  export function useState<T>(initial: T | (() => T)): [T, (value: T) => void];
  const React: {
    createElement: (...args: any[]) => any;
    useMemo: typeof useMemo;
    useState: typeof useState;
  };
  export default React;
}

declare module 'react/jsx-runtime' {
  export const Fragment: unique symbol;
  export function jsx(type: any, props: any, key?: any): any;
  export function jsxs(type: any, props: any, key?: any): any;
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module '@rs-x/react' {
  export type ExpressionChangeTransactionManager = {
    suspend(): void;
    continue(): void;
  };

  export function useRsxExpression<T>(expression: IExpression<T>): T | null;
  export function useRsxExpression<T>(
    expressionFactory: () => IExpression<T>,
    deps?: readonly unknown[],
  ): T | null;
  export function useRsxModel<TModel extends object>(
    model: TModel,
    mustWatch?: (model: object, field: string) => boolean,
  ): TModel;
  export function getExpressionChangeTransactionManager(): ExpressionChangeTransactionManager;
}

declare module '@rs-x/vue' {
  export function useRsxExpression<T>(
    expression: IExpression<T>,
  ): { value: T | null };
  export function useRsxModel<TModel extends object>(
    model: TModel,
    mustWatch?: (model: object, field: string) => boolean,
  ): TModel;
}

declare module '@rs-x/angular' {
  export const RsxPipe: unknown;
  export function providexRsx(): unknown[];
}

declare module '@rs-x/core' {
  export const InjectionContainer: {
    get<T = unknown>(token: unknown): T;
  };
}

declare module '@rs-x/expression-parser' {
  export type ExpressionChangeTransactionManager = {
    suspend(): void;
    continue(): void;
  };

  export type Subscription = {
    unsubscribe(): void;
  };

  export type ObservableLike<T> = {
    subscribe(next: (value: T) => void): Subscription;
  };

  export interface IExpression<T = unknown> {
    readonly value?: T;
    readonly changed: ObservableLike<IExpression<T>>;
  }

  export function rsx<TReturn = unknown, TModel extends object = object>(
    expression: string,
  ): (model: TModel) => IExpression<TReturn>;
  export const RsXExpressionParserInjectionTokens: {
    IExpressionChangeTransactionManager: unknown;
  };
  export const RsXExpressionParserModule: unknown;
}

declare module 'vue' {
  export function defineComponent(options: any): any;
  export function reactive<T extends object>(value: T): T;
  export function createApp(component: any): {
    mount(target: Element | string): unknown;
    unmount(): void;
  };
}

declare module '@angular/core' {
  export function Component(metadata: any): ClassDecorator;
  export const ChangeDetectionStrategy: {
    OnPush: unknown;
  };
}

declare module '@angular/forms' {
  export const FormsModule: unknown;
}

declare module '@angular/platform-browser' {
  export function createApplication(config?: any): Promise<any>;
}

declare module 'rxjs' {
  export class BehaviorSubject<T> {
    constructor(value: T);
    readonly value: T;
    next(value: T): void;
  }
}
`;

const FRAMEWORK_LANGUAGE_TYPES_FILE =
  '/virtual/node_modules/@types/rsx-docs-runtime/index.d.ts';

function frameworkSourceFileName(framework: FrameworkKey): string {
  switch (framework) {
    case 'react':
      return '/virtual/docs-example.react.tsx';
    case 'nextjs':
      return '/virtual/docs-example.next.tsx';
    case 'vue':
      return '/virtual/docs-example.vue';
    case 'angular':
      return '/virtual/docs-example.angular.ts';
  }
}

export async function createFrameworkLanguageProgram(args: {
  framework: FrameworkKey;
  sourceText: string;
}) {
  const { framework, sourceText } = args;
  const [{ createVueBackedProgramForFile }, tsModule] = await Promise.all([
    import('@rs-x/compiler'),
    import('typescript'),
  ]);
  const fileName = frameworkSourceFileName(framework);
  const isTsx = framework === 'react' || framework === 'nextjs';
  const scriptKind = isTsx ? tsModule.ScriptKind.TSX : tsModule.ScriptKind.TS;
  const sourceFile = tsModule.createSourceFile(
    fileName,
    sourceText,
    tsModule.ScriptTarget.ES2020,
    true,
    scriptKind,
  );
  const declarationsFile = tsModule.createSourceFile(
    FRAMEWORK_LANGUAGE_TYPES_FILE,
    MONACO_FRAMEWORK_TYPES,
    tsModule.ScriptTarget.ES2020,
    true,
    tsModule.ScriptKind.TS,
  );
  const options = {
    target: tsModule.ScriptTarget.ES2020,
    module: tsModule.ModuleKind.ESNext,
    moduleResolution: tsModule.ModuleResolutionKind.NodeJs,
    strict: false,
    allowJs: true,
    checkJs: true,
    allowNonTsExtensions: true,
    noResolve: false,
    skipLibCheck: true,
    noLib: true,
    jsx: isTsx ? tsModule.JsxEmit.ReactJSX : tsModule.JsxEmit.None,
  };
  const host = {
    getSourceFile: (requestedFileName: string) => {
      if (requestedFileName === fileName) {
        return sourceFile;
      }
      if (requestedFileName === FRAMEWORK_LANGUAGE_TYPES_FILE) {
        return declarationsFile;
      }
      return undefined;
    },
    writeFile: () => {},
    getDefaultLibFileName: () => 'lib.d.ts',
    getCurrentDirectory: () => '/',
    getDirectories: () => [],
    getCanonicalFileName: (requestedFileName: string) => requestedFileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: (requestedFileName: string) =>
      requestedFileName === fileName ||
      requestedFileName === FRAMEWORK_LANGUAGE_TYPES_FILE,
    readFile: (requestedFileName: string) => {
      if (requestedFileName === fileName) {
        return sourceText;
      }
      if (requestedFileName === FRAMEWORK_LANGUAGE_TYPES_FILE) {
        return MONACO_FRAMEWORK_TYPES;
      }
      return undefined;
    },
    resolveModuleNames: (moduleNames: string[]) =>
      moduleNames.map((moduleName) => {
        if (
          moduleName === 'react' ||
          moduleName === 'react/jsx-runtime' ||
          moduleName === '@rs-x/react' ||
          moduleName === '@rs-x/vue' ||
          moduleName === '@rs-x/angular' ||
          moduleName === '@rs-x/expression-parser' ||
          moduleName === '@rs-x/core' ||
          moduleName === 'vue' ||
          moduleName === '@angular/core' ||
          moduleName === '@angular/forms' ||
          moduleName === '@angular/platform-browser' ||
          moduleName === 'rxjs'
        ) {
          return {
            resolvedFileName: FRAMEWORK_LANGUAGE_TYPES_FILE,
            extension: tsModule.Extension.Dts,
            isExternalLibraryImport: true,
          };
        }
        return undefined;
      }),
  };

  const program = tsModule.createProgram(
    [fileName, FRAMEWORK_LANGUAGE_TYPES_FILE],
    options,
    host,
  );

  if (framework !== 'vue') {
    return { program, fileName };
  }

  const vueBacked = createVueBackedProgramForFile(program, fileName);
  return {
    program: vueBacked?.program ?? program,
    fileName: vueBacked?.fileName ?? fileName,
  };
}

export async function validateFrameworkSourceWithRsxCompiler(args: {
  framework: FrameworkKey;
  userSource: string;
}): Promise<FrameworkCompilerDiagnostic[]> {
  const [{ getRsxDiagnosticsForFile }, { program, fileName }] =
    await Promise.all([
      import('@rs-x/compiler'),
      createFrameworkLanguageProgram({
        framework: args.framework,
        sourceText: args.userSource,
      }),
    ]);
  const sourceFile = program.getSourceFile(fileName);
  if (!sourceFile) {
    return [];
  }

  return getRsxDiagnosticsForFile(program, fileName).map((diagnostic) => {
    const start = sourceFile.getLineAndCharacterOfPosition(diagnostic.start);
    const end = sourceFile.getLineAndCharacterOfPosition(diagnostic.end);
    return {
      category: diagnostic.category,
      message: diagnostic.message,
      line: start.line + 1,
      column: start.character + 1,
      endLine: end.line + 1,
      endColumn: end.character + 1,
    };
  });
}
