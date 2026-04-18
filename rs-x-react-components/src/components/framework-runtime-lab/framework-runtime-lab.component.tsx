'use client';

import './framework-runtime-lab.component.css';

import {
  type CSSProperties,
  type ComponentType,
  createElement,
  useId,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as React from 'react';
import * as ReactJsxRuntime from 'react/jsx-runtime';
import type { BeforeMount, OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { createRoot } from 'react-dom/client';

import { InjectionContainer } from '@rs-x/core';
import {
  type IExpression,
  rsx,
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
} from '@rs-x/expression-parser';
import {
  getExpressionChangeTransactionManager,
  useRsxExpression,
  useRsxModel,
} from '@rs-x/react';
import { FrameworkExampleFeedback } from './framework-example-feedback.component';

import { installRsxExpressionColorizer } from '../../services/rsx-expression-colorizer.service';
import {
  createFrameworkLanguageProgram,
  type FrameworkCompilerDiagnostic,
  type FrameworkKey,
  validateFrameworkSourceWithRsxCompiler,
} from '../../services/framework-example-rsx-compiler.service';

type FrameworkExample = {
  label: string;
  title: string;
  note: string;
  code: string;
};

type CompiledFrameworkModule<TComponent> = {
  component: TComponent;
  dispose?: () => void;
};

export type FrameworkRuntimeModuleLoaders = {
  loadVueModule?: () => Promise<Record<string, unknown>>;
  loadRsxVueModule?: () => Promise<Record<string, unknown>>;
  loadAngularCoreModule?: () => Promise<Record<string, unknown>>;
  loadAngularCommonModule?: () => Promise<Record<string, unknown>>;
  loadAngularFormsModule?: () => Promise<Record<string, unknown>>;
  loadAngularPlatformBrowserModule?: () => Promise<Record<string, unknown>>;
  loadAngularCompilerModule?: () => Promise<Record<string, unknown>>;
  loadAngularRsxModule?: () => Promise<{
    providexRsx: () => any[];
  }>;
  loadRxjsModule?: () => Promise<Record<string, unknown>>;
};

let runtimeReadyPromise: Promise<void> | null = null;
const transpiledModuleCache = new Map<string, string>();
let angularPreviewCompileId = 0;
const MONACO_FRAMEWORK_TYPES_URI = 'file:///node_modules/@types/rsx-docs-runtime.d.ts';
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
  export const IExpressionChangeTransactionManagerToken: {
    readonly __type?: {
      suspend(): void;
      continue(): void;
    };
  };
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
    dispose(): void;
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
  export function inject<T>(token: { readonly __type?: T }): T;
  export function inject<T = unknown>(token: unknown): T;
  export interface OnDestroy {
    ngOnDestroy(): void;
  }
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

type EditorDiagnostic = {
  source: string;
  message: string;
  line: number;
  column: number;
};

function severityFromFrameworkDiagnosticCategory(
  monaco: typeof Monaco,
  category: FrameworkCompilerDiagnostic['category'],
): Monaco.MarkerSeverity {
  switch (category) {
    case 'syntax':
    case 'semantic':
    case 'unsupported':
      return monaco.MarkerSeverity.Error;
  }
}

function createStableCodeKey(source: string): string {
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) | 0;
  }

  return Math.abs(hash).toString(36);
}

function installFrameworkRsxCompilerMarkers(args: {
  framework: FrameworkKey;
  monaco: typeof Monaco;
  model: Monaco.editor.ITextModel;
}): () => void {
  const { framework, monaco, model } = args;
  let generation = 0;
  let disposed = false;

  const isModelDisposed = () => {
    return (
      disposed ||
      (typeof model.isDisposed === 'function' && model.isDisposed())
    );
  };

  const updateMarkers = () => {
    if (isModelDisposed()) {
      return;
    }

    generation += 1;
    const currentGeneration = generation;

    void validateFrameworkSourceWithRsxCompiler({
      framework,
      userSource: model.getValue(),
    }).then((diagnostics) => {
      if (currentGeneration !== generation || isModelDisposed()) {
        return;
      }

      monaco.editor.setModelMarkers(
        model,
        'rsx-compiler',
        diagnostics.map((diagnostic) => ({
          severity: severityFromFrameworkDiagnosticCategory(
            monaco,
            diagnostic.category,
          ),
          source: 'rsx-compiler',
          message: `[${diagnostic.category}] ${diagnostic.message}`,
          startLineNumber: diagnostic.line,
          startColumn: diagnostic.column,
          endLineNumber: diagnostic.endLine,
          endColumn:
            diagnostic.endLine === diagnostic.line &&
            diagnostic.endColumn === diagnostic.column
              ? diagnostic.endColumn + 1
              : diagnostic.endColumn,
        })),
      );
    });
  };

  const sub = model.onDidChangeContent(updateMarkers);
  updateMarkers();

  return () => {
    disposed = true;
    generation += 1;
    sub.dispose();
    if (!isModelDisposed()) {
      monaco.editor.setModelMarkers(model, 'rsx-compiler', []);
    }
  };
}

function installFrameworkRsxCompletionProvider(args: {
  framework: FrameworkKey;
  monaco: typeof Monaco;
  model: Monaco.editor.ITextModel;
}): () => void {
  const { framework, monaco, model } = args;
  const provider = monaco.languages.registerCompletionItemProvider(
    'typescript',
    {
      triggerCharacters: ['.'],
      provideCompletionItems: async (activeModel, position) => {
        if (activeModel.id !== model.id) {
          return { suggestions: [] };
        }

        const [{ getRsxCompletionsAtPosition }, { program, fileName }] =
          await Promise.all([
            import('@rs-x/compiler'),
            createFrameworkLanguageProgram({
              framework,
              sourceText: model.getValue(),
            }),
          ]);
        if (!program) {
          return { suggestions: [] };
        }
        const items = getRsxCompletionsAtPosition(
          program,
          fileName,
          model.getOffsetAt(position),
        );

        if (items.length === 0) {
          return { suggestions: [] };
        }

        const wordInfo = activeModel.getWordUntilPosition(position);
        const replaceRange = new monaco.Range(
          position.lineNumber,
          wordInfo.startColumn,
          position.lineNumber,
          wordInfo.endColumn,
        );

        return {
          suggestions: items.map((item) => ({
            label: item.name,
            kind:
              item.kind === 'method'
                ? monaco.languages.CompletionItemKind.Method
                : item.kind === 'constructor'
                  ? monaco.languages.CompletionItemKind.Constructor
                  : monaco.languages.CompletionItemKind.Property,
            insertText: item.name,
            range: replaceRange,
          })),
        };
      },
    },
  );

  return () => {
    provider.dispose();
  };
}

function ensureRsxRuntimeReady(): Promise<void> {
  if (!runtimeReadyPromise) {
    const isParserReady =
      InjectionContainer.isBound(
        RsXExpressionParserInjectionTokens.IExpressionParser,
      ) &&
      InjectionContainer.isBound(
        RsXExpressionParserInjectionTokens.IJsExpressionAstParser,
      );

    runtimeReadyPromise = (isParserReady
      ? Promise.resolve()
      : Promise.resolve(InjectionContainer.load(RsXExpressionParserModule))
    ).then(() => undefined);
  }

  return runtimeReadyPromise;
}

function frameworkEditorExtension(framework: FrameworkKey): string {
  switch (framework) {
    case 'react':
    case 'nextjs':
      return 'tsx';
    case 'vue':
      return 'vue';
    case 'angular':
      return 'ts';
  }
}

async function compileReactExampleComponent(
  source: string,
): Promise<CompiledFrameworkModule<ComponentType>> {
  const tsModule = await import('typescript');
  const ts = tsModule.default;
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
    fileName: 'docs-example.tsx',
  }).outputText;

  const module = { exports: {} as Record<string, unknown> };
  const exports = module.exports;
  const require = (id: string) => {
    switch (id) {
      case 'react':
        return React;
      case 'react/jsx-runtime':
        return ReactJsxRuntime;
      case '@rs-x/react':
        return {
          getExpressionChangeTransactionManager,
          useRsxExpression,
          useRsxModel,
        };
      case '@rs-x/expression-parser':
        return {
          rsx,
          RsXExpressionParserModule,
        };
      default:
        throw new Error(`Unsupported docs example import: ${id}`);
    }
  };

  const evaluator = new Function(
    'require',
    'module',
    'exports',
    `${transpiled}\nreturn module.exports;`,
  ) as (
    require: (id: string) => unknown,
    module: { exports: Record<string, unknown> },
    exports: Record<string, unknown>,
  ) => Record<string, unknown>;

  const resolved = evaluator(require, module, exports);
  const component = (resolved.default ?? resolved.OrderTotal ?? resolved.UserCard) as
    | ComponentType
    | undefined;
  const dispose =
    typeof resolved.dispose === 'function'
      ? (resolved.dispose as () => void)
      : undefined;

  if (!component) {
    throw new Error('Compiled docs example did not export a React component.');
  }

  return { component, dispose };
}

async function transpileCommonJsModule(args: {
  cacheKey: string;
  source: string;
  jsx?: boolean;
  experimentalDecorators?: boolean;
}): Promise<string> {
  const { cacheKey, source, jsx = false, experimentalDecorators = false } = args;
  const cached = transpiledModuleCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const tsModule = await import('typescript');
  const ts = tsModule.default;
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      jsx: jsx ? ts.JsxEmit.ReactJSX : ts.JsxEmit.None,
      esModuleInterop: true,
      experimentalDecorators,
      emitDecoratorMetadata: false,
    },
    fileName: jsx ? 'docs-example.tsx' : 'docs-example.ts',
  }).outputText;

  transpiledModuleCache.set(cacheKey, transpiled);
  return transpiled;
}

function evaluateCommonJsModule(args: {
  transpiled: string;
  requireMap: Record<string, unknown>;
}): Record<string, unknown> {
  const { transpiled, requireMap } = args;
  const module = { exports: {} as Record<string, unknown> };
  const exports = module.exports;
  const require = (id: string) => {
    if (id in requireMap) {
      return requireMap[id];
    }

    throw new Error(`Unsupported docs example import: ${id}`);
  };

  const evaluator = new Function(
    'require',
    'module',
    'exports',
    `${transpiled}\nreturn module.exports;`,
  ) as (
    require: (id: string) => unknown,
    module: { exports: Record<string, unknown> },
    exports: Record<string, unknown>,
  ) => Record<string, unknown>;

  return evaluator(require, module, exports);
}

function normalizeCommonJsInteropModule<T extends object>(module: T): T & {
  default: T;
} {
  const maybeDefault = (module as { default?: unknown }).default;
  if (
    maybeDefault &&
    typeof maybeDefault === 'object' &&
    !Array.isArray(maybeDefault)
  ) {
    return {
      ...(maybeDefault as T),
      ...(module as T),
      default: maybeDefault as T,
    };
  }

  return {
    ...(module as T),
    default: module,
  };
}

function findNestedModuleExport<T>(
  module: unknown,
  exportName: string,
  visited = new Set<unknown>(),
): T | undefined {
  if (!module || (typeof module !== 'object' && typeof module !== 'function')) {
    return undefined;
  }

  if (visited.has(module)) {
    return undefined;
  }
  visited.add(module);

  const record = module as Record<string, unknown>;
  const direct = record[exportName];
  if (typeof direct !== 'undefined') {
    return direct as T;
  }

  if ('default' in record) {
    const nestedDefault = findNestedModuleExport<T>(
      record.default,
      exportName,
      visited,
    );
    if (typeof nestedDefault !== 'undefined') {
      return nestedDefault;
    }
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === 'object') {
      const nestedValue = findNestedModuleExport<T>(value, exportName, visited);
      if (typeof nestedValue !== 'undefined') {
        return nestedValue;
      }
    }
  }

  return undefined;
}

function normalizeVueRuntimeModule(vueModule: Record<string, unknown>) {
  const defineComponent = findNestedModuleExport<(options: unknown) => unknown>(
    vueModule,
    'defineComponent',
  );
  const reactive = findNestedModuleExport<<T extends object>(value: T) => T>(
    vueModule,
    'reactive',
  );
  const createApp = findNestedModuleExport<
    (component: unknown) => {
      mount(target: Element | string): unknown;
      unmount(): void;
    }
  >(vueModule, 'createApp');

  return {
    ...normalizeCommonJsInteropModule(vueModule),
    defineComponent,
    reactive,
    createApp,
  };
}

async function compileVueExampleComponent(args: {
  source: string;
  loadVueModule?: FrameworkRuntimeModuleLoaders['loadVueModule'];
  loadRsxVueModule?: FrameworkRuntimeModuleLoaders['loadRsxVueModule'];
}) {
  const { source, loadVueModule, loadRsxVueModule } = args;
  const transpiled = await transpileCommonJsModule({
    cacheKey: `vue:${source}`,
    source,
  });
  const [vueModule, rsxVueModule] = await Promise.all([
    loadVueModule ? loadVueModule() : import('vue'),
    loadRsxVueModule ? loadRsxVueModule() : import('@rs-x/vue'),
  ]);
  const normalizedVueModule = normalizeVueRuntimeModule(
    vueModule as Record<string, unknown>,
  );

  const resolved = evaluateCommonJsModule({
    transpiled,
    requireMap: {
      vue: normalizedVueModule,
      '@rs-x/vue': normalizeCommonJsInteropModule(rsxVueModule),
      '@rs-x/core': {
        InjectionContainer,
      },
      '@rs-x/expression-parser': {
        rsx,
        RsXExpressionParserInjectionTokens,
      },
    },
  });

  const component = resolved.default;
  if (!component) {
    throw new Error('Compiled Vue example did not export a component.');
  }

  return {
    component,
    dispose:
      typeof resolved.dispose === 'function'
        ? (resolved.dispose as () => void)
        : undefined,
  };
}

async function compileAngularExampleComponent(args: {
  source: string;
  loadAngularCoreModule?: FrameworkRuntimeModuleLoaders['loadAngularCoreModule'];
  loadAngularCommonModule?: FrameworkRuntimeModuleLoaders['loadAngularCommonModule'];
  loadAngularFormsModule?: FrameworkRuntimeModuleLoaders['loadAngularFormsModule'];
  loadAngularPlatformBrowserModule?: FrameworkRuntimeModuleLoaders['loadAngularPlatformBrowserModule'];
  loadAngularCompilerModule?: FrameworkRuntimeModuleLoaders['loadAngularCompilerModule'];
  loadAngularRsxModule?: FrameworkRuntimeModuleLoaders['loadAngularRsxModule'];
  loadRxjsModule?: FrameworkRuntimeModuleLoaders['loadRxjsModule'];
}): Promise<{
  component: unknown;
  dispose?: () => void;
  createApplication: (options: { providers: unknown[] }) => Promise<{
    bootstrap: (component: unknown, host: Element) => void;
    destroy: () => void;
  }>;
  providexRsx: () => unknown[];
}> {
  const {
    source,
    loadAngularCoreModule,
    loadAngularCommonModule,
    loadAngularFormsModule,
    loadAngularPlatformBrowserModule,
    loadAngularCompilerModule,
    loadAngularRsxModule,
    loadRxjsModule,
  } = args;
  const compileId = ++angularPreviewCompileId;
  const angularIdentitySuffix = `rsx-preview-${compileId}`;
  const preparedSource = source.replace(
    /selector:\s*(['"`])([^'"`]+)\1/,
    (_match, quote: string, selector: string) =>
      `selector: ${quote}${selector}-${angularIdentitySuffix}${quote},\n    host: { 'data-rsx-preview-id': '${angularIdentitySuffix}' }`,
  );

  const transpiled = await transpileCommonJsModule({
    cacheKey: `angular:${preparedSource}`,
    source: preparedSource,
    experimentalDecorators: true,
  });

  if (!loadAngularRsxModule) {
    throw new Error(
      'Angular previews require loadAngularRsxModule to be provided.',
    );
  }

  await import('zone.js');
  const _angularCompiler = loadAngularCompilerModule
    ? await loadAngularCompilerModule()
    : await import('@angular/compiler');

  const [
    angularCore,
    angularCommon,
    angularForms,
    angularPlatformBrowser,
    rsxAngular,
    rxjsModule,
  ] = await Promise.all([
    loadAngularCoreModule ? loadAngularCoreModule() : import('@angular/core'),
    loadAngularCommonModule ? loadAngularCommonModule() : import('@angular/common'),
    loadAngularFormsModule ? loadAngularFormsModule() : import('@angular/forms'),
    loadAngularPlatformBrowserModule
      ? loadAngularPlatformBrowserModule()
      : import('@angular/platform-browser'),
    loadAngularRsxModule(),
    loadRxjsModule ? loadRxjsModule() : import('rxjs'),
  ]);

  const resolved = evaluateCommonJsModule({
    transpiled,
    requireMap: {
      '@angular/core': angularCore,
      '@angular/common': angularCommon,
      '@angular/forms': angularForms,
      '@angular/platform-browser': angularPlatformBrowser,
      '@angular/compiler': _angularCompiler,
      '@rs-x/angular': rsxAngular,
      rxjs: rxjsModule,
      '@rs-x/expression-parser': {
        rsx,
      },
    },
  });

  const component = resolved.default;
  if (!component) {
    throw new Error('Compiled Angular example did not export a component.');
  }

  return {
    component,
    dispose:
      typeof resolved.dispose === 'function'
        ? (resolved.dispose as () => void)
        : undefined,
    createApplication: angularPlatformBrowser.createApplication as (
      options: { providers: unknown[] },
    ) => Promise<{
      bootstrap: (component: unknown, host: Element) => void;
      destroy: () => void;
    }>,
    providexRsx: rsxAngular.providexRsx as () => unknown[],
  };
}

export function CompiledFrameworkExamplePreview({
  framework,
  code,
  isBlocked,
  moduleLoaders,
  onErrorChange,
}: {
  framework: 'react' | 'nextjs' | 'vue' | 'angular';
  code: string;
  isBlocked?: boolean;
  moduleLoaders?: FrameworkRuntimeModuleLoaders;
  onErrorChange?: (message: string | null) => void;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const reactRootRef = useRef<ReturnType<typeof createRoot> | null>(null);
  const reactHostRef = useRef<HTMLDivElement | null>(null);
  const moduleDisposeRef = useRef<(() => void) | null>(null);
  const vueAppRef = useRef<{
    mount: (target: Element | string) => unknown;
    unmount: () => void;
  } | null>(null);
  const angularAppRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(true);

  const clearReactPreview = () => {
    reactRootRef.current?.render(null);
  };

  const clearModuleDispose = () => {
    moduleDisposeRef.current?.();
    moduleDisposeRef.current = null;
  };

  const clearMountedPreviews = () => {
    vueAppRef.current?.unmount();
    vueAppRef.current = null;
    angularAppRef.current?.destroy();
    angularAppRef.current = null;
    clearReactPreview();
    clearModuleDispose();
    if (hostRef.current && !reactRootRef.current) {
      hostRef.current.textContent = '';
    }
  };

  useEffect(() => {
    if (isBlocked) {
      clearMountedPreviews();
      setIsBusy(false);
      setError(null);
      onErrorChange?.(null);
      return;
    }

    let cancelled = false;
    clearMountedPreviews();
    setIsBusy(true);
    setError(null);
    onErrorChange?.(null);

    void ensureRsxRuntimeReady()
      .then(async () => {
        const host = hostRef.current;
        if (!host) {
          return;
        }

        vueAppRef.current?.unmount();
        vueAppRef.current = null;
        angularAppRef.current?.destroy();
        angularAppRef.current = null;

        if (framework === 'react' || framework === 'nextjs') {
          const compiled = await compileReactExampleComponent(code);
          if (cancelled) {
            compiled.dispose?.();
            return;
          }
          moduleDisposeRef.current = compiled.dispose ?? null;
          if (reactHostRef.current !== host) {
            reactRootRef.current = null;
            reactHostRef.current = host;
          }
          if (!reactRootRef.current) {
            reactRootRef.current = createRoot(host);
          }
          reactRootRef.current.render(createElement(compiled.component));
          return;
        }

        clearReactPreview();
        host.innerHTML = '';

        if (framework === 'vue') {
          const [vueModule, compiled] = await Promise.all([
            moduleLoaders?.loadVueModule
              ? moduleLoaders.loadVueModule()
              : import('vue'),
            compileVueExampleComponent({
              source: code,
              loadVueModule: moduleLoaders?.loadVueModule,
              loadRsxVueModule: moduleLoaders?.loadRsxVueModule,
            }),
          ]);
          if (cancelled) {
            compiled.dispose?.();
            return;
          }
          moduleDisposeRef.current = compiled.dispose ?? null;
          const normalizedVueModule = normalizeVueRuntimeModule(
            vueModule as Record<string, unknown>,
          );
          if (!normalizedVueModule.createApp) {
            throw new Error('Vue runtime is missing createApp.');
          }
          const vueApp = normalizedVueModule.createApp(compiled.component);
          vueAppRef.current = vueApp;
          vueApp.mount(host);
          if (host.childNodes.length === 0 && !host.textContent?.trim()) {
            throw new Error('Vue example did not render any UI.');
          }
          return;
        }

        const compiled = await compileAngularExampleComponent({
          source: code,
          loadAngularCoreModule: moduleLoaders?.loadAngularCoreModule,
          loadAngularCommonModule: moduleLoaders?.loadAngularCommonModule,
          loadAngularFormsModule: moduleLoaders?.loadAngularFormsModule,
          loadAngularPlatformBrowserModule:
            moduleLoaders?.loadAngularPlatformBrowserModule,
          loadAngularCompilerModule: moduleLoaders?.loadAngularCompilerModule,
          loadAngularRsxModule: moduleLoaders?.loadAngularRsxModule,
          loadRxjsModule: moduleLoaders?.loadRxjsModule,
        });
        if (cancelled) {
          compiled.dispose?.();
          return;
        }
        moduleDisposeRef.current = compiled.dispose ?? null;
        angularAppRef.current = await compiled.createApplication({
          providers: [...compiled.providexRsx()],
        });
        const angularMountTarget = document.createElement('div');
        angularMountTarget.className = 'frameworkLabAngularMountTarget';
        host.appendChild(angularMountTarget);
        angularAppRef.current.bootstrap(compiled.component, angularMountTarget);
        if (
          angularMountTarget.childNodes.length === 0 &&
          !angularMountTarget.textContent?.trim()
        ) {
          throw new Error('Angular example did not render any UI.');
        }
      })
      .then(() => {
        if (!cancelled) {
          setError(null);
          setIsBusy(false);
          onErrorChange?.(null);
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          clearMountedPreviews();
          const message =
            reason instanceof Error ? reason.message : String(reason);
          setError(message);
          setIsBusy(false);
          onErrorChange?.(message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code, framework, isBlocked, moduleLoaders, onErrorChange]);

  useEffect(() => {
    return () => {
      vueAppRef.current?.unmount();
      vueAppRef.current = null;
      angularAppRef.current?.destroy();
      angularAppRef.current = null;
      clearModuleDispose();
      if (reactRootRef.current) {
        const root = reactRootRef.current;
        reactRootRef.current = null;
        setTimeout(() => {
          root.unmount();
        }, 0);
      }
    };
  }, []);

  return (
    <div className="frameworkLabPreview">
      {isBlocked ? null : (
        <>
          <p className={`frameworkLabStatus${isBusy ? '' : ' isHidden'}`}>
            Compiling runnable example…
          </p>
          <div className={`frameworkLabMount${error ? ' isHidden' : ''}`}>
            <div ref={hostRef} className="frameworkLabMountInner" />
          </div>
        </>
      )}
    </div>
  );
}

export function EditableCompiledFrameworkExample({
  framework,
  initialCode,
  editorId,
  moduleLoaders,
}: {
  framework: 'react' | 'nextjs' | 'vue' | 'angular';
  initialCode: string;
  editorId?: string;
  moduleLoaders?: FrameworkRuntimeModuleLoaders;
}) {
  const generatedEditorId = useId().replace(/:/gu, '-');
  const [code, setCode] = useState(initialCode);
  const [editorMarkerErrors, setEditorMarkerErrors] = useState<EditorDiagnostic[]>(
    [],
  );
  const [compilerErrors, setCompilerErrors] = useState<EditorDiagnostic[]>([]);
  const [isCompilerValidationPending, setIsCompilerValidationPending] =
    useState(true);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [resetVersion, setResetVersion] = useState(0);
  const [EditorComponent, setEditorComponent] =
    useState<null | React.ComponentType<{
      theme?: string;
      path?: string;
      height?: string | number;
      defaultLanguage?: string;
      value?: string;
      options?: Monaco.editor.IStandaloneEditorConstructionOptions;
      onChange?: (value: string | undefined) => void;
      onMount?: OnMount;
      beforeMount?: BeforeMount;
    }>>(null);
  const [editorTheme, setEditorTheme] = useState<'vs' | 'vs-dark'>('vs');

  useEffect(() => {
    setCode(initialCode);
    setEditorMarkerErrors([]);
    setCompilerErrors([]);
    setRuntimeError(null);
    setResetVersion((version) => version + 1);
  }, [initialCode]);

  useEffect(() => {
    let isCurrent = true;
    setIsCompilerValidationPending(true);

    void validateFrameworkSourceWithRsxCompiler({
      framework,
      userSource: code,
    }).then((diagnostics) => {
      if (!isCurrent) {
        return;
      }

      setCompilerErrors(
        diagnostics.map((diagnostic) => ({
          source: 'rsx-compiler',
          message: `[${diagnostic.category}] ${diagnostic.message}`,
          line: diagnostic.line,
          column: diagnostic.column,
        })),
      );
      setIsCompilerValidationPending(false);
    });

    return () => {
      isCurrent = false;
    };
  }, [code, framework]);

  useEffect(() => {
    let isMounted = true;

    void import('@monaco-editor/react').then(({ Editor }) => {
      if (isMounted) {
        setEditorComponent(() => Editor);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const resolveTheme = () => {
      const isDark =
        document.documentElement.getAttribute('data-theme') === 'dark';
      setEditorTheme(isDark ? 'vs-dark' : 'vs');
    };

    resolveTheme();

    const observer = new MutationObserver(resolveTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const editorOptions = useMemo<Monaco.editor.IStandaloneEditorConstructionOptions>(
    () => ({
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineHeight: 22,
      tabSize: 2,
      wordWrap: 'off',
      padding: { top: 16, bottom: 16 },
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      renderLineHighlight: 'line',
      roundedSelection: true,
      guides: {
        indentation: true,
      },
    }),
    [],
  );

  const beforeMount: BeforeMount = (monaco) => {
    const ts = monaco.typescript;

    ts.typescriptDefaults.setEagerModelSync(true);
    ts.typescriptDefaults.setCompilerOptions({
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      jsx: ts.JsxEmit.ReactJSX,
      allowNonTsExtensions: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
    });
    ts.typescriptDefaults.addExtraLib(
      MONACO_FRAMEWORK_TYPES,
      MONACO_FRAMEWORK_TYPES_URI,
    );
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    const model = editor.getModel();
    if (!model) {
      return;
    }

    const disposeCompilerMarkers = installFrameworkRsxCompilerMarkers({
      framework,
      monaco,
      model,
    });
    const disposeCompletionProvider = installFrameworkRsxCompletionProvider({
      framework,
      monaco,
      model,
    });
    const disposeColorizer = installRsxExpressionColorizer(monaco, model);

    const updateErrors = () => {
      const markers = monaco.editor
        .getModelMarkers({ resource: model.uri })
        .filter((marker) => marker.severity === monaco.MarkerSeverity.Error);
      const nextErrors = markers
        .map((marker) => ({
          source:
            typeof marker.source === 'string' && marker.source.length > 0
              ? marker.source
              : 'typescript',
          message: marker.message,
          line: marker.startLineNumber,
          column: marker.startColumn,
        }))
        .filter(
          (marker, index, collection) =>
            collection.findIndex(
              (candidate) =>
                candidate.source === marker.source &&
                candidate.message === marker.message &&
                candidate.line === marker.line &&
                candidate.column === marker.column,
            ) === index,
        );
      setEditorMarkerErrors(nextErrors);
    };

    updateErrors();
    const markerSub = monaco.editor.onDidChangeMarkers((uris) => {
      if (uris.some((uri) => uri.toString() === model.uri.toString())) {
        updateErrors();
      }
    });

    editor.onDidDispose(() => {
      markerSub.dispose();
      disposeCompilerMarkers();
      disposeCompletionProvider();
      disposeColorizer();
    });
  };

  const editorStyle: CSSProperties = {
    flex: 1,
    minHeight: '24rem',
    borderRadius: '14px',
    overflow: 'hidden',
    border: '1px solid color-mix(in srgb, var(--border-soft) 68%, transparent)',
  };

  const editorPath = `framework-example-${editorId ?? `${framework}-${generatedEditorId}`}-${createStableCodeKey(initialCode)}.${frameworkEditorExtension(
    framework,
  )}`;
  const editorErrors = [...compilerErrors, ...editorMarkerErrors].filter(
    (marker, index, collection) =>
      collection.findIndex(
        (candidate) =>
          candidate.source === marker.source &&
          candidate.message === marker.message &&
          candidate.line === marker.line &&
          candidate.column === marker.column,
      ) === index,
  );
  const isPreviewBlocked = isCompilerValidationPending || editorErrors.length > 0;

  useEffect(() => {
    if (isPreviewBlocked && runtimeError) {
      setRuntimeError(null);
    }
  }, [isPreviewBlocked, runtimeError]);

  return (
    <div className="frameworkLabSplit">
      <div className="frameworkLabPane">
        <p className="frameworkLabPaneTitle">Preview</p>
        <p className="frameworkLabPaneText">
          Edit the code and the preview recompiles from that updated source.
        </p>
        <FrameworkExampleFeedback
          runtimeError={runtimeError}
          editorErrors={editorErrors}
          preview={
            <CompiledFrameworkExamplePreview
              key={`preview-${framework}-${editorId ?? generatedEditorId}-${resetVersion}`}
              framework={framework}
              code={code}
              isBlocked={isPreviewBlocked}
              moduleLoaders={moduleLoaders}
              onErrorChange={setRuntimeError}
            />
          }
        />
      </div>
      <div className="frameworkLabPane">
        <div className="frameworkLabEditorHeader">
          <p className="frameworkLabPaneTitle">Code</p>
          <button
            type="button"
            className="btn btnGhost btnSm"
            onClick={() => {
              setCode(initialCode);
              setRuntimeError(null);
              setResetVersion((value) => value + 1);
            }}
          >
            Reset code
          </button>
        </div>
        {EditorComponent ? (
          <div className="frameworkLabEditorShell" style={editorStyle}>
            <EditorComponent
              theme={editorTheme}
              path={editorPath}
              height="100%"
              defaultLanguage="typescript"
              value={code}
              options={editorOptions}
              beforeMount={beforeMount}
              onMount={handleEditorMount}
              onChange={(value) => {
                setCode(value ?? '');
              }}
            />
          </div>
        ) : (
          <textarea
            className="frameworkLabEditor"
            spellCheck={false}
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
            }}
          />
        )}
      </div>
    </div>
  );
}

export function CompiledReactExamplePreview({
  code,
}: {
  code: string;
}) {
  const [component, setComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const disposeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    void ensureRsxRuntimeReady()
      .then(() => compileReactExampleComponent(code))
      .then((compiled) => {
        if (cancelled) {
          compiled.dispose?.();
          return;
        }

        disposeRef.current?.();
        disposeRef.current = compiled.dispose ?? null;

        if (!cancelled) {
          setComponent(() => compiled.component);
          setError(null);
        }
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : String(reason));
          setComponent(null);
        }
      });

    return () => {
      cancelled = true;
      disposeRef.current?.();
      disposeRef.current = null;
    };
  }, [code]);

  if (error) {
    return <p className="frameworkLabStatus">Preview error: {error}</p>;
  }

  if (!component) {
    return <p className="frameworkLabStatus">Compiling runnable example…</p>;
  }

  return (
    <div className="frameworkLabPreview">
      {createElement(component)}
    </div>
  );
}

const expressionExamples: Record<FrameworkKey, FrameworkExample> = {
  react: {
    label: 'React',
    title: 'React live expression example',
    note: 'This preview runs the real rs-x React hook inside the docs site.',
    code: `import { useEffect, useMemo } from 'react';
import { rsx } from '@rs-x/expression-parser';
import { useRsxExpression } from '@rs-x/react';

export function OrderTotal() {
  const model = useMemo(() => ({ price: 100, quantity: 3 }), []);
  const totalExpr = useMemo(
    () => rsx<number>('price * quantity')(model),
    [model],
  );
  const total = useRsxExpression(totalExpr);

  useEffect(() => {
    return () => {
      totalExpr.dispose();
    };
  }, [totalExpr]);

  return (
    <div>
      <label>
        Price
        <input
          type="number"
          value={model.price}
          onChange={(event) => {
            model.price = Number(event.target.value);
          }}
        />
      </label>
      <label>
        Quantity
        <input
          type="number"
          value={model.quantity}
          onChange={(event) => {
            model.quantity = Number(event.target.value);
          }}
        />
      </label>
      <p>Total: {total}</p>
    </div>
  );
}`,
  },
  nextjs: {
    label: 'Next.js',
    title: 'Next.js client component example',
    note: 'The preview simulates the client-component behavior; the code pane shows the actual Next.js shape.',
    code: `'use client';

import { rsx } from '@rs-x/expression-parser';
import { useRsxExpression } from '@rs-x/react';

const pageModel = { price: 100, quantity: 3 };
const totalExpr = rsx<number>('price * quantity')(pageModel);

export default function OrderPage() {
  const total = useRsxExpression(totalExpr);

  return (
    <main>
      <input
        type="number"
        value={pageModel.price}
        onChange={(event) => {
          pageModel.price = Number(event.target.value);
        }}
      />
      <input
        type="number"
        value={pageModel.quantity}
        onChange={(event) => {
          pageModel.quantity = Number(event.target.value);
        }}
      />
      <p>Total: {total}</p>
    </main>
  );
}

export function dispose() {
  totalExpr.dispose();
}`,
  },
  vue: {
    label: 'Vue',
    title: 'Vue composable example',
    note: 'This preview compiles the shown Vue component code and mounts it with the real Vue runtime.',
    code: `import { rsx } from '@rs-x/expression-parser';
import { useRsxExpression, useRsxModel } from '@rs-x/vue';

const model = {
  price: 100,
  quantity: 3,
};
const totalExpr = rsx<number>('price * quantity')(model);

export default {
  name: 'OrderTotal',
  setup() {
    useRsxModel(model);
    const total = useRsxExpression(totalExpr);

    return {
      model,
      total,
    };
  },
  template: \`
    <div>
      <label>
        Price
        <input
          :value="model.price"
          type="number"
          @input="model.price = Number($event.target.value)"
        />
      </label>
      <label>
        Quantity
        <input
          :value="model.quantity"
          type="number"
          @input="model.quantity = Number($event.target.value)"
        />
      </label>
      <p>Total: {{ total }}</p>
    </div>
  \`,
};

export function dispose() {
  totalExpr.dispose();
}
`,
  },
  angular: {
    label: 'Angular',
    title: 'Angular RsxPipe example',
    note: 'This preview compiles the shown standalone Angular component and bootstraps it into the docs page.',
    code: `import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RsxPipe } from '@rs-x/angular';
import { rsx } from '@rs-x/expression-parser';

@Component({
  selector: 'app-order-total',
  standalone: true,
  imports: [FormsModule, RsxPipe],
  template: \`
    <label>
      Price
      <input type="number" [ngModel]="model.price" (ngModelChange)="model.price = +$event" />
    </label>
    <label>
      Quantity
      <input type="number" [ngModel]="model.quantity" (ngModelChange)="model.quantity = +$event" />
    </label>
    <p>Total: {{ totalExpr | rsx }}</p>
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class OrderTotalComponent {
  readonly model = { price: 100, quantity: 3 };
  readonly totalExpr = rsx<number>('price * quantity')(this.model);

  ngOnDestroy() {
    this.totalExpr.dispose();
  }
}`,
  },
};

const modelBindingExamples: Record<'react' | 'nextjs', FrameworkExample> = {
  react: {
    label: 'React',
    title: 'React useRsxModel example',
    note: 'This one shows the direct-mutation path: update the original model fields and the UI follows.',
    code: `import { useMemo } from 'react';
import { useRsxModel } from '@rs-x/react';

export function UserCard() {
  const model = useMemo(
    () => ({
      user: {
        name: 'Alice',
        age: 30,
      },
      score: 42,
    }),
    [],
  );

  const values = useRsxModel(model);

  return (
    <div>
      <p>{values.user.name} — age {values.user.age}</p>
      <p>Score: {values.score}</p>
      <button
        onClick={() => {
          model.user.name = 'Bob';
          model.score = 100;
        }}
      >
        Update model
      </button>
    </div>
  );
}`,
  },
  nextjs: {
    label: 'Next.js',
    title: 'Next.js client useRsxModel example',
    note: 'Same runtime rule as React, but inside a client component.',
    code: `'use client';

import { useMemo } from 'react';
import { useRsxModel } from '@rs-x/react';

export default function ProfileCard() {
  const model = useMemo(
    () => ({
      user: {
        name: 'Alice',
        age: 30,
      },
      score: 42,
    }),
    [],
  );

  const values = useRsxModel(model);

  return (
    <main>
      <p>{values.user.name} — age {values.user.age}</p>
      <p>Score: {values.score}</p>
      <button
        onClick={() => {
          model.user.name = 'Bob';
          model.score = 100;
        }}
      >
        Update model
      </button>
    </main>
  );
}`,
  },
};

const prebuiltPreviewModel = {
  price: 100,
  quantity: 3,
};

let prebuiltPreviewExpression: IExpression<number> | null = null;

function getPrebuiltPreviewExpression(): IExpression<number> {
  if (!prebuiltPreviewExpression) {
    prebuiltPreviewExpression = rsx<number>('price * quantity')(
      prebuiltPreviewModel,
    );
  }

  return prebuiltPreviewExpression;
}

function ExpressionPreview() {
  const model = useMemo(
    () => ({
      price: 100,
      quantity: 3,
    }),
    [],
  );
  const totalExpr = useMemo(() => rsx<number>('price * quantity')(model), [model]);
  const total = useRsxExpression(totalExpr);

  useEffect(() => {
    return () => {
      totalExpr.dispose();
    };
  }, [totalExpr]);

  return (
    <div className="frameworkLabPreview">
      <div className="frameworkLabInputGrid">
        <label className="frameworkLabField">
          <span className="frameworkLabFieldLabel">Price</span>
          <input
            className="frameworkLabInput"
            type="number"
            value={model.price}
            onChange={(event) => {
              model.price = Number(event.target.value);
            }}
          />
        </label>
        <label className="frameworkLabField">
          <span className="frameworkLabFieldLabel">Quantity</span>
          <input
            className="frameworkLabInput"
            type="number"
            value={model.quantity}
            onChange={(event) => {
              model.quantity = Number(event.target.value);
            }}
          />
        </label>
      </div>
      <div className="frameworkLabStats">
        <div>
          <span className="frameworkLabStatLabel">Price</span>
          <strong>{model.price}</strong>
        </div>
        <div>
          <span className="frameworkLabStatLabel">Quantity</span>
          <strong>{model.quantity}</strong>
        </div>
        <div>
          <span className="frameworkLabStatLabel">Total</span>
          <strong>{total ?? '...'}</strong>
        </div>
      </div>
    </div>
  );
}

export function ModuleScopedExpressionInlinePreview() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void ensureRsxRuntimeReady().then(() => {
      if (!cancelled) {
        setIsReady(true);
      }
    });

    return () => {
      cancelled = true;
      prebuiltPreviewExpression?.dispose();
      prebuiltPreviewExpression = null;
    };
  }, []);

  if (!isReady) {
    return <p className="frameworkLabStatus">Loading runnable example…</p>;
  }

  return <ModuleScopedExpressionPreviewBody />;
}

function ModuleScopedExpressionPreviewBody() {
  const total = useRsxExpression(
    useMemo(() => getPrebuiltPreviewExpression(), []),
  );

  return (
    <div className="frameworkLabPreview">
      <div className="frameworkLabInputGrid">
        <label className="frameworkLabField">
          <span className="frameworkLabFieldLabel">Price</span>
          <input
            className="frameworkLabInput"
            type="number"
            value={prebuiltPreviewModel.price}
            onChange={(event) => {
              prebuiltPreviewModel.price = Number(event.target.value);
            }}
          />
        </label>
        <label className="frameworkLabField">
          <span className="frameworkLabFieldLabel">Quantity</span>
          <input
            className="frameworkLabInput"
            type="number"
            value={prebuiltPreviewModel.quantity}
            onChange={(event) => {
              prebuiltPreviewModel.quantity = Number(event.target.value);
            }}
          />
        </label>
      </div>
      <div className="frameworkLabStats">
        <div>
          <span className="frameworkLabStatLabel">Price</span>
          <strong>{prebuiltPreviewModel.price}</strong>
        </div>
        <div>
          <span className="frameworkLabStatLabel">Quantity</span>
          <strong>{prebuiltPreviewModel.quantity}</strong>
        </div>
        <div>
          <span className="frameworkLabStatLabel">Total</span>
          <strong>{total ?? '...'}</strong>
        </div>
      </div>
    </div>
  );
}

function ModelBindingPreview() {
  const model = useMemo(
    () => ({
      user: {
        name: 'Alice',
        age: 30,
      },
      score: 42,
    }),
    [],
  );
  const values = useRsxModel<
    typeof model,
    {
      user: {
        name: string;
        age: number;
      };
      score: number;
    }
  >(model);

  return (
    <div className="frameworkLabPreview">
      <div className="frameworkLabStats">
        <div>
          <span className="frameworkLabStatLabel">Name</span>
          <strong>{values.user.name}</strong>
        </div>
        <div>
          <span className="frameworkLabStatLabel">Age</span>
          <strong>{values.user.age}</strong>
        </div>
        <div>
          <span className="frameworkLabStatLabel">Score</span>
          <strong>{values.score}</strong>
        </div>
      </div>
      <div className="frameworkLabButtonRow">
        <button
          className="btn btnGhost btnSm"
          type="button"
          onClick={() => {
            model.user.name = 'Bob';
            model.score = 100;
          }}
        >
          Set Bob / 100
        </button>
        <button
          className="btn btnGhost btnSm"
          type="button"
          onClick={() => {
            model.user.name = 'Alice';
            model.score = 42;
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export function MemoExpressionInlinePreview() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void ensureRsxRuntimeReady().then(() => {
      if (!cancelled) {
        setIsReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isReady) {
    return <p className="frameworkLabStatus">Loading runnable example…</p>;
  }

  return <ExpressionPreview />;
}

export function ModelBindingInlinePreview() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void ensureRsxRuntimeReady().then(() => {
      if (!cancelled) {
        setIsReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isReady) {
    return <p className="frameworkLabStatus">Loading runnable example…</p>;
  }

  return <ModelBindingPreview />;
}

export function FrameworkRuntimeLab({
  defaultFramework = 'react',
  frameworks,
  moduleLoaders,
}: {
  defaultFramework?: FrameworkKey;
  frameworks?: FrameworkKey[];
  moduleLoaders?: FrameworkRuntimeModuleLoaders;
}) {
  const availableFrameworks = frameworks ?? [
    'react',
    'nextjs',
    'vue',
    'angular',
  ];
  const [activeFramework, setActiveFramework] =
    useState<FrameworkKey>(defaultFramework);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void ensureRsxRuntimeReady().then(() => {
      if (!cancelled) {
        setIsReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const example = expressionExamples[activeFramework];

  return (
    <article className="card docsApiCard frameworkLabCard">
      <h2 className="cardTitle">Live framework preview</h2>
      <p className="cardText">
        Run a small rs-x UI example directly inside the docs. The preview is
        clickable, and the code pane shows the framework-specific code shape
        you would use in a real app.
      </p>

      {availableFrameworks.length > 1 ? (
        <div className="frameworkLabTabs" role="tablist" aria-label="Frameworks">
          {availableFrameworks.map((key) => (
            <button
              key={key}
              type="button"
              className={`frameworkLabTab${
                activeFramework === key ? ' isActive' : ''
              }`}
              onClick={() => {
                setActiveFramework(key);
              }}
            >
              {expressionExamples[key].label}
            </button>
          ))}
        </div>
      ) : null}

      <p className="frameworkLabPaneTitle">{example.title}</p>
      <p className="frameworkLabPaneText">{example.note}</p>
      {isReady ? (
        <EditableCompiledFrameworkExample
          framework={activeFramework}
          initialCode={example.code}
          moduleLoaders={moduleLoaders}
        />
      ) : (
        <p className="frameworkLabStatus">Loading rs-x runtime…</p>
      )}
    </article>
  );
}

export function ModelBindingLab({
  defaultFramework = 'react',
  frameworks,
  moduleLoaders,
}: {
  defaultFramework?: 'react' | 'nextjs';
  frameworks?: Array<'react' | 'nextjs'>;
  moduleLoaders?: FrameworkRuntimeModuleLoaders;
}) {
  const availableFrameworks = frameworks ?? ['react', 'nextjs'];
  const [activeFramework, setActiveFramework] = useState<'react' | 'nextjs'>(
    defaultFramework,
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void ensureRsxRuntimeReady().then(() => {
      if (!cancelled) {
        setIsReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const example = modelBindingExamples[activeFramework];

  return (
    <article className="card docsApiCard frameworkLabCard">
      <h2 className="cardTitle">Live useRsxModel preview</h2>
      <p className="cardText">
        This one demonstrates the direct-mutation behavior explicitly: click the
        button, mutate the original model fields, and watch the UI update.
      </p>

      {availableFrameworks.length > 1 ? (
        <div className="frameworkLabTabs" role="tablist" aria-label="Frameworks">
          {availableFrameworks.map((key) => (
            <button
              key={key}
              type="button"
              className={`frameworkLabTab${
                activeFramework === key ? ' isActive' : ''
              }`}
              onClick={() => {
                setActiveFramework(key);
              }}
            >
              {modelBindingExamples[key].label}
            </button>
          ))}
        </div>
      ) : null}

      <p className="frameworkLabPaneTitle">{example.title}</p>
      <p className="frameworkLabPaneText">{example.note}</p>
      {isReady ? (
        <EditableCompiledFrameworkExample
          framework={activeFramework}
          initialCode={example.code}
          moduleLoaders={moduleLoaders}
        />
      ) : (
        <p className="frameworkLabStatus">Loading rs-x runtime…</p>
      )}
    </article>
  );
}
