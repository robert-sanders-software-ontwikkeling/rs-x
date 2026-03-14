import fs from 'node:fs/promises';
import path from 'node:path';

import dedent from 'dedent';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import {
  LeftAccentCard,
  type LeftAccentCardTone,
} from '@rs-x/react-components';

import type { ApiParameterItem } from '../../../../components/ApiParameterList';
import { ApiParameterList } from '../../../../components/ApiParameterList';
import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';
import { SyntaxCodeBlock } from '../../../../components/SyntaxCodeBlock';
import { resolveSymbolDocumentationLink } from '../../../../lib/type-doc-links';
import {
  formatModuleLabel,
  stateManagerApiBySymbol,
  stateManagerApiGroupByModulePath,
  stateManagerApiItems,
} from '../state-manager-api.helpers';

const STATE_MANAGER_GITHUB_BASE =
  'https://github.com/robert-sanders-software-ontwikkeling/rs-x/blob/main/rs-x-state-manager/lib';

type SymbolDocumentation = {
  summary?: string;
  parameters?: ApiParameterItem[];
  returns?: string;
  notes?: string;
  exampleCode?: string;
  fullSignature?: string;
};

type ApiMemberParameter = {
  name: string;
  type: string;
  optional: boolean;
  rest: boolean;
};

type ApiMember = {
  name: string;
  kind: 'method' | 'property' | 'constructor' | 'index' | 'call';
  signature: string;
  parameters: ApiMemberParameter[];
  returnType?: string;
  optional: boolean;
  readonly: boolean;
  abstract: boolean;
  access?: 'public' | 'protected';
  description: string;
};

const MODULE_DETAILS: Record<string, string> = {
  'state-manager':
    'Primary runtime implementation for watched-state registration, subscription management, change emission, and context rebinding.',
  'state-manager/state-change-subscription-manager':
    'Handles grouped observer subscriptions for each watched state key and index-watch-rule variant.',
  'grouped-change-subscriptions-for-context-manager':
    'Groups watcher subscriptions by context and exposes per-context subscription orchestration.',
  'object-property-observer-proxy-pair-manager':
    'Resolves observer/proxy pair managers by value type and coordinates observer lifecycle.',
  'object-observer':
    'Contains object-level observer contracts and managers used to detect structural and nested changes.',
  'object-observer/factories':
    'Factory set that selects observer/proxy strategies for arrays, maps, sets, dates, promises, observables, and plain objects.',
  'property-observer':
    'Property-level observer contracts and base abstractions.',
  'property-observer/factories':
    'Property observer factory entry points used by the runtime to track index/key/path changes.',
  'property-observer/factories/collection-item':
    'Specialized property observers for collection item tracking (Array/Map/Set item-level observers).',
  'property-observer/factories/date-property':
    'Specialized property observers for Date property paths (year/month/day/utc variants and time).',
  'property-observer/factories/indexed-value-observer-proxy-pair':
    'Observer/proxy pair support for indexed-value scenarios.',
  'property-observer/factories/non-iterable-object-property':
    'Property observer strategy for non-iterable object properties.',
  'index-watch-rule-registry':
    'Index-watch-rule contracts, registry, and default recursive/non-recursive watch rules.',
  'proxies/array-proxy':
    'Array proxy factory and contracts that emit semantic index/mutation changes.',
  'proxies/map-proxy':
    'Map proxy factory and contracts that emit semantic key/mutation changes.',
  'proxies/set-proxy':
    'Set proxy factory and contracts that emit semantic membership changes.',
  'proxies/date-proxy':
    'Date proxy factory that maps setter calls to semantic date-part changes.',
  'proxies/promise-proxy':
    'Promise proxy factory and change contracts for resolved/rejected transitions.',
  'proxies/observable-proxy':
    'Observable proxy factory and change contracts for emitted value transitions.',
  'rs-x-state-manager.module':
    'DI module registration for state-manager services, observer factories, and proxy factories.',
  'rs-x-state-manager-injection-tokens':
    'Injection token surface for resolving state-manager services from the container.',
  'object-change':
    'Object change contract and related type definitions used in the change pipeline.',
  'observer-group': 'Observer grouping contracts and helper types.',
  'observer.interface': 'Observer lifecycle interface contract.',
};

const MEMBER_DESCRIPTION_OVERRIDES: Record<string, Record<string, string>> = {
  IStateManager: {
    changed:
      'Observable stream that emits state changes with `{ context, index, oldValue, newValue, oldContext }` payload.',
    contextChanged:
      'Observable stream that emits when a watched context branch is rebound from one object reference to another.',
    startChangeCycle:
      'Observable stream emitted at the beginning of a change cycle, before queued changes are flushed.',
    endChangeCycle:
      'Observable stream emitted at the end of a change cycle, after processing and cleanup.',
    watchState:
      'Registers a watch for `(context, index)` (optionally with owner and index-watch-rule) and returns the current value snapshot.',
    releaseState:
      'Releases one watch reference for `(context, index)` and unsubscribes observers when reference count reaches zero.',
    isWatched:
      'Checks whether `(context, index, indexWatchRule)` is currently registered in the watcher graph.',
    clear:
      'Clears all watched state, subscriptions, and observer/proxy manager resources.',
    getState:
      'Returns the currently stored state value for `(context, index)` from the object-state manager.',
    setState:
      'Sets state for `(context, index)`, triggers rebinding if needed, and emits a semantic change when value differs.',
    toString:
      'Returns a string snapshot of the internal state store for diagnostics/debugging.',
  },
  StateManager: {
    changed:
      'Observable stream of semantic state changes produced by StateManager after equality checks.',
    contextChanged:
      'Observable stream emitted when a watched branch is rebound from old context to new context.',
    startChangeCycle:
      'Lifecycle stream emitted when StateManager starts processing an incoming observer change cycle.',
    endChangeCycle:
      'Lifecycle stream emitted after StateManager finishes a change cycle.',
    watchState:
      'Registers (or reuses) a watch for `(context, index)` and returns current state value.',
    releaseState:
      'Releases watch references and unregisters observer subscriptions when no references remain.',
    clear:
      'Disposes subscriptions and state store entries managed by this StateManager instance.',
    getState:
      'Reads stored state value for `(context, index)` from the object-state manager.',
    setState:
      'Writes state for `(context, index)`, applies rebinding logic, and emits change if value meaningfully changed.',
    isWatched:
      'Returns true when the requested state key is currently tracked in the subscription graph.',
    toString:
      'Delegates to object-state-manager string output for diagnostics.',
  },
};

const SYMBOL_DOCS: Record<string, SymbolDocumentation> = {
  StateManager: {
    summary:
      'Default `@rs-x/state-manager` service that starts and stops watched values, manages subscriptions, stores previous and current value snapshots, emits change events, and reconnects watchers when an object branch is replaced.',
    notes:
      'Use this service through `IStateManager` (resolved from DI). In normal runtime flow, expression observers call `watchState(...)`/`releaseState(...)`, and StateManager emits `changed`/`contextChanged` to keep dependent expression segments synchronized.',
    exampleCode: dedent`
      import { InjectionContainer } from '@rs-x/core';
      import {
        RsXStateManagerModule,
        RsXStateManagerInjectionTokens,
        type IStateManager,
      } from '@rs-x/state-manager';

      await InjectionContainer.load(RsXStateManagerModule);

      const stateManager = InjectionContainer.get<IStateManager>(
        RsXStateManagerInjectionTokens.IStateManager,
      );

      const model = { cart: [{ id: 'A', qty: 1 }] };
      const ownerId = 'docs-demo-owner';

      // Start watching model.cart
      const current = stateManager.watchState(model, 'cart', { ownerId });
      console.log(current); // [{ id: 'A', qty: 1 }]

      // Update through state-manager API
      stateManager.setState(model, 'cart', [{ id: 'A', qty: 2 }], ownerId);

      // When done, always release
      stateManager.releaseState(model, 'cart');
    `,
  },
  IStateManager: {
    summary:
      'Main state-manager contract used by expression runtime services to watch, read, write, release, and observe state changes.',
  },
};

function isCallableTypeSignature(signature: string): boolean {
  return /^export type\s+\w+\s*=/.test(signature) && signature.includes('=>');
}

function defaultWhatItDoes(
  symbol: string,
  kind: string,
  moduleName: string,
  description: string,
): string {
  if (!/exported from/i.test(description)) {
    return description;
  }

  if (kind === 'class' || kind === 'abstract class') {
    return `\`${symbol}\` is a runtime class exported from \`${moduleName}\` in \`@rs-x/state-manager\`.`;
  }
  if (kind === 'interface') {
    return `\`${symbol}\` defines an API contract exported from \`${moduleName}\` in \`@rs-x/state-manager\`.`;
  }
  if (kind === 'type') {
    return `\`${symbol}\` is a type alias exported from \`${moduleName}\` in \`@rs-x/state-manager\`.`;
  }
  if (kind === 'function') {
    return `\`${symbol}\` is a function exported from \`${moduleName}\` in \`@rs-x/state-manager\`.`;
  }
  if (kind === 'const') {
    return `\`${symbol}\` is a constant export from \`${moduleName}\` in \`@rs-x/state-manager\`.`;
  }

  return description;
}

function defaultParameters(kind: string, signature: string): ApiParameterItem[] {
  if (kind === 'function' || isCallableTypeSignature(signature)) {
    return [
      {
        name: 'See declaration',
        type: 'Signature-defined',
        description:
          'Parameter names and types are defined in the declaration block.',
      },
    ];
  }
  return [];
}

function defaultReturnType(kind: string, signature: string): string {
  if (kind === 'function') {
    const match = signature.match(/\)\s*:\s*([^;{]+)/);
    return match?.[1]?.trim() ?? 'See declaration';
  }
  if (isCallableTypeSignature(signature)) {
    const match = signature.match(/=>\s*([^;]+)/);
    return match?.[1]?.trim() ?? 'See declaration';
  }
  if (kind === 'const') {
    return '';
  }
  if (kind.includes('class')) {
    return 'Class instance when constructed.';
  }
  if (kind === 'interface' || kind === 'type' || kind === 'enum') {
    return 'Type-level contract (no direct runtime return value).';
  }
  return 'See declaration';
}

function defaultExample(symbol: string, kind: string): string {
  if (kind === 'function') {
    return `import { ${symbol} } from '@rs-x/state-manager';\n\n${symbol}(/* arguments */);`;
  }
  if (kind === 'abstract class') {
    return `import { ${symbol} } from '@rs-x/state-manager';\n\nclass My${symbol} extends ${symbol} {\n  // implement abstract members\n}`;
  }
  if (kind.includes('class')) {
    return `import { ${symbol} } from '@rs-x/state-manager';\n\nconst instance = new ${symbol}(...args);`;
  }
  if (kind === 'interface') {
    return '';
  }
  if (kind === 'type') {
    return `import type { ${symbol} } from '@rs-x/state-manager';\n\ntype Local${symbol} = ${symbol};`;
  }
  if (kind === 'const') {
    return `import { ${symbol} } from '@rs-x/state-manager';\n\nconsole.log(${symbol});`;
  }
  return `import { ${symbol} } from '@rs-x/state-manager';`;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function readFullTypeDeclaration(
  symbol: string,
  sourcePath: string,
  kind: string,
): Promise<string | null> {
  const filePath = path.resolve(
    process.cwd(),
    '../rs-x-state-manager/lib',
    sourcePath,
  );
  const fileContent = await fs.readFile(filePath, 'utf8');

  if (kind === 'type') {
    const typeRegex = new RegExp(`export\\s+type\\s+${escapeRegex(symbol)}\\b`);
    const typeMatch = typeRegex.exec(fileContent);
    if (!typeMatch) {
      return null;
    }

    const start = typeMatch.index;
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;
    let angleDepth = 0;
    let inString: '"' | "'" | '`' | null = null;
    let inLineComment = false;
    let inBlockComment = false;
    let escaped = false;

    for (let i = start; i < fileContent.length; i += 1) {
      const char = fileContent[i];
      const next = fileContent[i + 1];

      if (inLineComment) {
        if (char === '\n') {
          inLineComment = false;
        }
        continue;
      }

      if (inBlockComment) {
        if (char === '*' && next === '/') {
          inBlockComment = false;
          i += 1;
        }
        continue;
      }

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === '\\') {
          escaped = true;
          continue;
        }
        if (char === inString) {
          inString = null;
        }
        continue;
      }

      if (char === '/' && next === '/') {
        inLineComment = true;
        i += 1;
        continue;
      }

      if (char === '/' && next === '*') {
        inBlockComment = true;
        i += 1;
        continue;
      }

      if (char === '"' || char === "'" || char === '`') {
        inString = char;
        continue;
      }

      if (char === '(') {
        parenDepth += 1;
      } else if (char === ')' && parenDepth > 0) {
        parenDepth -= 1;
      } else if (char === '[') {
        bracketDepth += 1;
      } else if (char === ']' && bracketDepth > 0) {
        bracketDepth -= 1;
      } else if (char === '{') {
        braceDepth += 1;
      } else if (char === '}' && braceDepth > 0) {
        braceDepth -= 1;
      } else if (char === '<') {
        angleDepth += 1;
      } else if (char === '>' && angleDepth > 0) {
        angleDepth -= 1;
      }

      if (
        char === ';' &&
        parenDepth === 0 &&
        bracketDepth === 0 &&
        braceDepth === 0 &&
        angleDepth === 0
      ) {
        return fileContent.slice(start, i + 1).trim();
      }
    }

    return fileContent.slice(start).trim();
  }

  const declarationRegexByKind: Record<string, RegExp> = {
    interface: new RegExp(`export\\s+interface\\s+${escapeRegex(symbol)}\\b`),
    class: new RegExp(`export\\s+class\\s+${escapeRegex(symbol)}\\b`),
    'abstract class': new RegExp(
      `export\\s+abstract\\s+class\\s+${escapeRegex(symbol)}\\b`,
    ),
  };
  const declarationRegex = declarationRegexByKind[kind];
  if (!declarationRegex) {
    return null;
  }
  const match = declarationRegex.exec(fileContent);
  if (!match) {
    return null;
  }

  const start = match.index;
  let openBraceIndex = -1;
  let angleDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let inHeaderString: '"' | "'" | '`' | null = null;
  let inHeaderLineComment = false;
  let inHeaderBlockComment = false;
  let headerEscaped = false;

  for (let index = start; index < fileContent.length; index += 1) {
    const char = fileContent[index];
    const next = fileContent[index + 1];

    if (inHeaderLineComment) {
      if (char === '\n') {
        inHeaderLineComment = false;
      }
      continue;
    }

    if (inHeaderBlockComment) {
      if (char === '*' && next === '/') {
        inHeaderBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inHeaderString) {
      if (headerEscaped) {
        headerEscaped = false;
        continue;
      }
      if (char === '\\') {
        headerEscaped = true;
        continue;
      }
      if (char === inHeaderString) {
        inHeaderString = null;
      }
      continue;
    }

    if (char === '/' && next === '/') {
      inHeaderLineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inHeaderBlockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inHeaderString = char;
      continue;
    }

    if (char === '<') {
      angleDepth += 1;
      continue;
    }
    if (char === '>' && angleDepth > 0) {
      angleDepth -= 1;
      continue;
    }
    if (char === '(') {
      parenDepth += 1;
      continue;
    }
    if (char === ')' && parenDepth > 0) {
      parenDepth -= 1;
      continue;
    }
    if (char === '[') {
      bracketDepth += 1;
      continue;
    }
    if (char === ']' && bracketDepth > 0) {
      bracketDepth -= 1;
      continue;
    }

    if (
      char === '{' &&
      angleDepth === 0 &&
      parenDepth === 0 &&
      bracketDepth === 0
    ) {
      openBraceIndex = index;
      break;
    }
  }

  if (openBraceIndex < 0) {
    return null;
  }

  let depth = 0;
  let inString: '"' | "'" | '`' | null = null;
  let inLineComment = false;
  let inBlockComment = false;
  let escaped = false;
  let closeBraceIndex = -1;

  for (let index = openBraceIndex; index < fileContent.length; index += 1) {
    const char = fileContent[index];
    const next = fileContent[index + 1];

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false;
      }
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '/' && next === '/') {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inBlockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        closeBraceIndex = index;
        break;
      }
    }
  }

  if (closeBraceIndex < 0) {
    return null;
  }

  return fileContent.slice(start, closeBraceIndex + 1).trim();
}

function interfaceBody(declaration: string): string {
  let openBraceIndex = -1;
  let angleDepth = 0;
  let parenDepth = 0;
  let bracketDepth = 0;
  let inString: '"' | "'" | '`' | null = null;

  for (let index = 0; index < declaration.length; index += 1) {
    const char = declaration[index];
    const prev = index > 0 ? declaration[index - 1] : '';

    if (inString) {
      if (char === inString && prev !== '\\') {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }

    if (char === '<') {
      angleDepth += 1;
      continue;
    }
    if (char === '>' && angleDepth > 0) {
      angleDepth -= 1;
      continue;
    }
    if (char === '(') {
      parenDepth += 1;
      continue;
    }
    if (char === ')' && parenDepth > 0) {
      parenDepth -= 1;
      continue;
    }
    if (char === '[') {
      bracketDepth += 1;
      continue;
    }
    if (char === ']' && bracketDepth > 0) {
      bracketDepth -= 1;
      continue;
    }

    if (
      char === '{' &&
      angleDepth === 0 &&
      parenDepth === 0 &&
      bracketDepth === 0
    ) {
      openBraceIndex = index;
      break;
    }
  }

  if (openBraceIndex < 0) {
    return '';
  }

  let closeBraceIndex = -1;
  let braceDepth = 0;
  inString = null;
  for (let index = openBraceIndex; index < declaration.length; index += 1) {
    const char = declaration[index];
    const prev = index > openBraceIndex ? declaration[index - 1] : '';

    if (inString) {
      if (char === inString && prev !== '\\') {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }

    if (char === '{') {
      braceDepth += 1;
      continue;
    }
    if (char === '}') {
      braceDepth -= 1;
      if (braceDepth === 0) {
        closeBraceIndex = index;
        break;
      }
    }
  }

  if (closeBraceIndex <= openBraceIndex) {
    return '';
  }

  return declaration.slice(openBraceIndex + 1, closeBraceIndex);
}

function splitInterfaceStatements(body: string): string[] {
  const statements: string[] = [];
  let current = '';
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplateString = false;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    const prev = index > 0 ? body[index - 1] : '';

    if (char === "'" && !inDoubleQuote && !inTemplateString && prev !== '\\') {
      inSingleQuote = !inSingleQuote;
    } else if (
      char === '"' &&
      !inSingleQuote &&
      !inTemplateString &&
      prev !== '\\'
    ) {
      inDoubleQuote = !inDoubleQuote;
    } else if (
      char === '`' &&
      !inSingleQuote &&
      !inDoubleQuote &&
      prev !== '\\'
    ) {
      inTemplateString = !inTemplateString;
    }

    if (inSingleQuote || inDoubleQuote || inTemplateString) {
      current += char;
      continue;
    }

    if (char === '(') {
      parenDepth += 1;
    }
    if (char === ')') {
      parenDepth -= 1;
    }
    if (char === '{') {
      braceDepth += 1;
    }
    if (char === '}') {
      braceDepth -= 1;
    }
    if (char === '[') {
      bracketDepth += 1;
    }
    if (char === ']') {
      bracketDepth -= 1;
    }

    if (
      char === ';' &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0
    ) {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const last = current.trim();
  if (last) {
    statements.push(last);
  }

  return statements;
}

function splitClassStatements(body: string): string[] {
  const statements: string[] = [];
  let current = '';
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];

    if (char === '(') {
      parenDepth += 1;
    }
    if (char === ')') {
      parenDepth -= 1;
    }
    if (char === '[') {
      bracketDepth += 1;
    }
    if (char === ']') {
      bracketDepth -= 1;
    }

    if (
      char === ';' &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0
    ) {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = '';
      continue;
    }

    if (
      char === '{' &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0
    ) {
      const header = current.trim();
      if (header && header.includes('(')) {
        statements.push(header);
      }
      current = '';
      braceDepth = 1;
      continue;
    }

    if (char === '{') {
      braceDepth += 1;
      continue;
    }

    if (char === '}') {
      if (braceDepth > 0) {
        braceDepth -= 1;
      }
      continue;
    }

    if (braceDepth === 0) {
      current += char;
    }
  }

  const tail = current.trim();
  if (tail) {
    statements.push(tail);
  }

  return statements;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeSignature(value: string): string {
  return normalizeWhitespace(value).replace(/,\s*\)/g, ')');
}

function splitTopLevelCsv(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let angleDepth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inTemplateString = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    const prev = index > 0 ? value[index - 1] : '';

    if (char === "'" && !inDoubleQuote && !inTemplateString && prev !== '\\') {
      inSingleQuote = !inSingleQuote;
    } else if (
      char === '"' &&
      !inSingleQuote &&
      !inTemplateString &&
      prev !== '\\'
    ) {
      inDoubleQuote = !inDoubleQuote;
    } else if (
      char === '`' &&
      !inSingleQuote &&
      !inDoubleQuote &&
      prev !== '\\'
    ) {
      inTemplateString = !inTemplateString;
    }

    if (inSingleQuote || inDoubleQuote || inTemplateString) {
      current += char;
      continue;
    }

    if (char === '(') {
      parenDepth += 1;
    }
    if (char === ')') {
      parenDepth -= 1;
    }
    if (char === '{') {
      braceDepth += 1;
    }
    if (char === '}') {
      braceDepth -= 1;
    }
    if (char === '[') {
      bracketDepth += 1;
    }
    if (char === ']') {
      bracketDepth -= 1;
    }
    if (char === '<') {
      angleDepth += 1;
    }
    if (char === '>' && angleDepth > 0) {
      angleDepth -= 1;
    }

    if (
      char === ',' &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0 &&
      angleDepth === 0
    ) {
      const part = current.trim();
      if (part) {
        parts.push(part);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) {
    parts.push(tail);
  }

  return parts;
}

function parseMethodParameters(params: string): ApiMemberParameter[] {
  const cleaned = params.trim();
  if (!cleaned) {
    return [];
  }

  return splitTopLevelCsv(cleaned).map((rawParam) => {
    let normalized = rawParam.trim();
    normalized = normalized.replace(/^@\w+(?:\([^)]*\))?\s*/g, '');
    normalized = normalized.replace(
      /^(?:(?:public|private|protected|readonly|override)\s+)+/,
      '',
    );
    const match = normalized.match(
      /^(\.\.\.)?([A-Za-z_$][\w$]*)(\?)?(?:\s*:\s*([^=]+?))?(?:\s*=\s*[\s\S]+)?$/,
    );
    if (match) {
      const [, rest, name, optionalMark, explicitType] = match;
      const hasDefaultValue = /\s=\s/.test(normalized);
      const normalizedType = explicitType?.trim() || 'unknown';
      return {
        name: `${rest ?? ''}${name}`,
        type: normalizedType,
        optional: optionalMark === '?' || hasDefaultValue,
        rest: Boolean(rest),
      };
    }

    return {
      name: normalized,
      type: 'unknown',
      optional: false,
      rest: false,
    };
  });
}

function plainMemberName(name: string): string {
  return name
    .replace(/^readonly\s+/i, '')
    .replace(/\?$/, '')
    .trim();
}

function formatMemberLabel(name: string): string {
  const normalized = plainMemberName(name).replace(/^_+/, '');
  return normalized
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
}

function joinParamNames(parameters: ApiMemberParameter[]): string {
  const names = parameters.map((item) => item.name.replace(/^\.\.\./, ''));
  if (names.length === 0) {
    return '';
  }
  if (names.length === 1) {
    return names[0];
  }
  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function buildMemberDescription(
  symbolName: string,
  kind: ApiMember['kind'],
  name: string,
  returnType: string | undefined,
  parameters: ApiMemberParameter[],
  optional: boolean,
  readonly: boolean,
): string {
  const baseName = plainMemberName(name);
  const symbolOverrides = MEMBER_DESCRIPTION_OVERRIDES[symbolName];
  const override =
    symbolOverrides &&
    Object.prototype.hasOwnProperty.call(symbolOverrides, baseName)
      ? symbolOverrides[baseName]
      : undefined;
  if (override) {
    return override;
  }

  const memberLabel = formatMemberLabel(baseName);
  const paramList = joinParamNames(parameters);

  if (kind === 'property') {
    const readonlyNote = readonly ? 'Read-only.' : '';
    const optionalNote = optional ? 'Optional.' : '';
    const typeNote = returnType ? `Type: \`${returnType}\`.` : '';
    return [
      `Represents the \`${memberLabel || baseName}\` value on this API.`,
      readonlyNote,
      optionalNote,
      typeNote,
    ]
      .filter(Boolean)
      .join(' ');
  }

  if (kind === 'method') {
    const inputNote =
      parameters.length > 0
        ? `Accepts ${parameters.length === 1 ? 'parameter' : 'parameters'} ${paramList}.`
        : 'Takes no parameters.';
    const returnNote = returnType ? `Returns \`${returnType}\`.` : '';

    if (/^get[A-Z_]/.test(baseName)) {
      return `Reads ${memberLabel.replace(/^get\s+/, '') || 'a value'} from runtime state. ${inputNote} ${returnNote}`.trim();
    }
    if (/^set[A-Z_]/.test(baseName)) {
      return `Updates ${memberLabel.replace(/^set\s+/, '') || 'a value'} in runtime state. ${inputNote} ${returnNote}`.trim();
    }
    if (/^is[A-Z_]/.test(baseName) || /^has[A-Z_]/.test(baseName)) {
      return `Checks whether ${memberLabel} is true. ${inputNote} ${returnNote}`.trim();
    }
    if (/^watch[A-Z_]/.test(baseName) || /^observe[A-Z_]/.test(baseName)) {
      return `Subscribes to ${memberLabel.replace(/^(watch|observe)\s+/, '') || 'changes'} and links it to the runtime pipeline. ${inputNote} ${returnNote}`.trim();
    }
    return `Performs \`${memberLabel || baseName}\`. ${inputNote} ${returnNote}`.trim();
  }

  if (kind === 'constructor') {
    const paramCount = parameters.length;
    return paramCount === 0
      ? 'Constructor for creating an instance without parameters.'
      : `Constructor for creating an instance with ${paramCount} parameter${paramCount === 1 ? '' : 's'}.`;
  }

  if (kind === 'index') {
    return returnType
      ? `Allows keyed access and resolves values as type \`${returnType}\`.`
      : 'Allows keyed access on this type.';
  }

  return returnType
    ? `This type can be called like a function and returns \`${returnType}\`.`
    : 'This type can be called like a function.';
}

function memberSortName(name: string): string {
  return name
    .replace(/^readonly\s+/i, '')
    .replace(/[?()[\]]/g, '')
    .trim()
    .toLowerCase();
}

function memberKindRank(kind: ApiMember['kind']): number {
  if (kind === 'constructor') {
    return 0;
  }
  if (kind === 'property') {
    return 1;
  }
  if (kind === 'method') {
    return 2;
  }
  if (kind === 'index') {
    return 3;
  }
  return 4;
}

function memberAccessRank(access?: ApiMember['access']): number {
  if (access === 'public') {
    return 0;
  }
  if (access === 'protected') {
    return 1;
  }
  return 2;
}

function parseDeclarationMembers(
  declaration: string,
  symbolName: string,
): ApiMember[] {
  const body = interfaceBody(declaration);
  if (!body) {
    return [];
  }

  const isClassDeclaration = /^export\s+(?:abstract\s+)?class\b/.test(
    declaration,
  );
  const statements = isClassDeclaration
    ? splitClassStatements(body)
    : splitInterfaceStatements(body);
  const members: ApiMember[] = [];

  const resolveAccess = (
    modifiers: string,
  ): 'public' | 'protected' | undefined => {
    if (!isClassDeclaration) {
      return undefined;
    }
    if (/\bprotected\b/.test(modifiers)) {
      return 'protected';
    }
    return 'public';
  };

  for (const statement of statements) {
    const cleaned = normalizeSignature(statement);
    if (!cleaned) {
      continue;
    }

    const indexMatch = cleaned.match(/^\[([^\]]+)\]\s*:\s*(.+)$/);
    if (indexMatch) {
      members.push({
        name: `[${indexMatch[1]}]`,
        kind: 'index',
        signature: cleaned,
        parameters: [],
        returnType: indexMatch[2],
        optional: false,
        readonly: false,
        abstract: false,
        access: undefined,
        description: buildMemberDescription(
          symbolName,
          'index',
          `[${indexMatch[1]}]`,
          indexMatch[2],
          [],
          false,
          false,
        ),
      });
      continue;
    }

    const methodMatch = cleaned.match(
      /^((?:(?:public|private|protected|static|abstract|readonly|async|override)\s+)*)(constructor|[A-Za-z_$][\w$]*)(?:<[\s\S]+>)?(\?)?\s*\((.*)\)\s*(?::\s*(.+))?$/,
    );
    if (methodMatch) {
      const [, modifiers, name, optionalMark, params, rawReturnType] =
        methodMatch;
      if (isClassDeclaration && /\bprivate\b/.test(modifiers)) {
        continue;
      }
      const optional = optionalMark === '?';
      const isConstructor = name === 'constructor';
      const returnType = isConstructor
        ? undefined
        : (rawReturnType?.trim() ?? 'void');
      const parsedParams = parseMethodParameters(params);
      const isAbstract = isClassDeclaration && /\babstract\b/.test(modifiers);

      members.push({
        name: optional ? `${name}?` : name,
        kind: isConstructor ? 'constructor' : 'method',
        signature: cleaned,
        parameters: parsedParams,
        returnType,
        optional,
        readonly: false,
        abstract: isAbstract,
        access: resolveAccess(modifiers),
        description: buildMemberDescription(
          symbolName,
          isConstructor ? 'constructor' : 'method',
          optional ? `${name}?` : name,
          returnType,
          parsedParams,
          optional,
          false,
        ),
      });
      continue;
    }

    const callSignatureMatch = cleaned.match(/^\((.*)\)\s*:\s*(.+)$/);
    if (callSignatureMatch) {
      const parsedParams = parseMethodParameters(callSignatureMatch[1]);
      members.push({
        name: '(call)',
        kind: 'call',
        signature: cleaned,
        parameters: parsedParams,
        returnType: callSignatureMatch[2],
        optional: false,
        readonly: false,
        abstract: false,
        access: undefined,
        description: buildMemberDescription(
          symbolName,
          'call',
          '(call)',
          callSignatureMatch[2],
          parsedParams,
          false,
          false,
        ),
      });
      continue;
    }

    const propertyMatch = cleaned.match(
      /^((?:(?:public|private|protected|static|abstract)\s+)*)(readonly\s+)?([A-Za-z_$][\w$]*)(\?)?\s*:\s*(.+)$/,
    );
    if (propertyMatch) {
      const modifiers = propertyMatch[1];
      if (isClassDeclaration && /\bprivate\b/.test(modifiers)) {
        continue;
      }
      const readonly = Boolean(propertyMatch[2]);
      const name = propertyMatch[3];
      const optional = propertyMatch[4] === '?';
      const type = propertyMatch[5];
      const isAbstract = isClassDeclaration && /\babstract\b/.test(modifiers);
      members.push({
        name: `${readonly ? 'readonly ' : ''}${name}${optional ? '?' : ''}`,
        kind: 'property',
        signature: cleaned,
        parameters: [],
        returnType: type,
        optional,
        readonly,
        abstract: isAbstract,
        access: resolveAccess(modifiers),
        description: buildMemberDescription(
          symbolName,
          'property',
          `${readonly ? 'readonly ' : ''}${name}${optional ? '?' : ''}`,
          type,
          [],
          optional,
          readonly,
        ),
      });
    }
  }

  return members.sort((left, right) => {
    const kindDiff = memberKindRank(left.kind) - memberKindRank(right.kind);
    if (kindDiff !== 0) {
      return kindDiff;
    }
    const accessDiff =
      memberAccessRank(left.access) - memberAccessRank(right.access);
    if (accessDiff !== 0) {
      return accessDiff;
    }
    return memberSortName(left.name).localeCompare(memberSortName(right.name));
  });
}

function memberGroupTitle(kind: ApiMember['kind']): string {
  if (kind === 'property') {
    return 'Properties';
  }
  if (kind === 'method') {
    return 'Methods';
  }
  if (kind === 'constructor') {
    return 'Constructors';
  }
  if (kind === 'index') {
    return 'Index signatures';
  }
  return 'Call signatures';
}

function formatMemberSignatureForDisplay(member: ApiMember): string {
  const signature = member.signature.trim();
  if (!['method', 'constructor', 'call'].includes(member.kind)) {
    return signature;
  }

  const openParen = signature.indexOf('(');
  if (openParen < 0) {
    return signature;
  }

  let closeParen = -1;
  let depth = 0;
  for (let i = openParen; i < signature.length; i += 1) {
    const char = signature[i];
    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
      if (depth === 0) {
        closeParen = i;
        break;
      }
    }
  }

  if (closeParen < 0) {
    return signature;
  }

  const before = signature.slice(0, openParen).trimEnd();
  const rawParams = signature.slice(openParen + 1, closeParen).trim();
  const after = signature.slice(closeParen + 1).trim();
  const parameters =
    rawParams.length > 0 ? splitTopLevelCsv(rawParams) : [];
  const shouldMultiline = parameters.length > 1 || signature.length > 110;

  if (!shouldMultiline) {
    return signature;
  }

  if (parameters.length === 0) {
    return `${before}()${after.length > 0 ? `${after.startsWith(':') ? '' : ' '}${after}` : ''}`;
  }

  const formattedParams = parameters
    .map((parameter, index) => {
      const suffix = index < parameters.length - 1 ? ',' : '';
      return `  ${parameter}${suffix}`;
    })
    .join('\n');

  return `${before}(\n${formattedParams}\n)${after.length > 0 ? `${after.startsWith(':') ? '' : ' '}${after}` : ''}`;
}

function groupMembers(
  members: ApiMember[],
): Array<{ kind: ApiMember['kind']; title: string; members: ApiMember[] }> {
  const order: ApiMember['kind'][] = [
    'constructor',
    'property',
    'method',
    'index',
    'call',
  ];
  return order
    .map((kind) => ({
      kind,
      title: memberGroupTitle(kind),
      members: members.filter((member) => member.kind === kind),
    }))
    .filter((group) => group.members.length > 0);
}

function splitTopLevelCommaList(value: string): string[] {
  const items: string[] = [];
  let current = '';
  let angleDepth = 0;
  let parenDepth = 0;
  let braceDepth = 0;
  let bracketDepth = 0;

  for (const char of value) {
    if (char === '<') {
      angleDepth += 1;
      current += char;
      continue;
    }
    if (char === '>' && angleDepth > 0) {
      angleDepth -= 1;
      current += char;
      continue;
    }
    if (char === '(') {
      parenDepth += 1;
      current += char;
      continue;
    }
    if (char === ')' && parenDepth > 0) {
      parenDepth -= 1;
      current += char;
      continue;
    }
    if (char === '{') {
      braceDepth += 1;
      current += char;
      continue;
    }
    if (char === '}' && braceDepth > 0) {
      braceDepth -= 1;
      current += char;
      continue;
    }
    if (char === '[') {
      bracketDepth += 1;
      current += char;
      continue;
    }
    if (char === ']' && bracketDepth > 0) {
      bracketDepth -= 1;
      current += char;
      continue;
    }

    if (
      char === ',' &&
      angleDepth === 0 &&
      parenDepth === 0 &&
      braceDepth === 0 &&
      bracketDepth === 0
    ) {
      const normalized = current.replace(/\s+/g, ' ').trim();
      if (normalized.length > 0) {
        items.push(normalized);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const tail = current.replace(/\s+/g, ' ').trim();
  if (tail.length > 0) {
    items.push(tail);
  }

  return items;
}

function extractBaseClassName(
  kind: string,
  declaration: string,
): string | null {
  if (!['class', 'abstract class'].includes(kind)) {
    return null;
  }

  const headerMatch = declaration.match(
    /(?:abstract\s+)?class\s+[A-Za-z_$][\w$]*(?:\s*<[\s\S]*?>)?\s*([\s\S]*?)\{/,
  );
  if (!headerMatch) {
    return null;
  }

  const heritage = headerMatch[1].replace(/\s+/g, ' ').trim();
  const extendsMatch = heritage.match(
    /\bextends\s+([\s\S]*?)(?:\bimplements\b|$)/,
  );
  if (!extendsMatch) {
    return null;
  }

  const baseClass = extendsMatch[1]?.trim();
  return baseClass && baseClass.length > 0 ? baseClass : null;
}

function extractImplementedInterfaces(
  kind: string,
  declaration: string,
): string[] {
  if (!['class', 'abstract class'].includes(kind)) {
    return [];
  }

  const headerMatch = declaration.match(
    /(?:abstract\s+)?class\s+[A-Za-z_$][\w$]*(?:\s*<[\s\S]*?>)?\s*([\s\S]*?)\{/,
  );
  if (!headerMatch) {
    return [];
  }

  const heritage = headerMatch[1].replace(/\s+/g, ' ').trim();
  const implementsMatch = heritage.match(/\bimplements\s+([\s\S]*)$/);
  if (!implementsMatch) {
    return [];
  }

  return splitTopLevelCommaList(implementsMatch[1]);
}

function extractExtendedInterfaces(
  kind: string,
  declaration: string,
): string[] {
  if (kind !== 'interface') {
    return [];
  }

  const headerMatch = declaration.match(
    /interface\s+[A-Za-z_$][\w$]*(?:\s*<[\s\S]*?>)?\s*extends\s+([\s\S]*?)\{/,
  );
  if (!headerMatch) {
    return [];
  }

  return splitTopLevelCommaList(headerMatch[1]);
}

function renderTypeWithLinks(type: string, currentSymbol?: string): ReactNode {
  const nodes: ReactNode[] = [];
  const identifierRe = /[A-Za-z_][A-Za-z0-9_]*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = identifierRe.exec(type)) !== null) {
    const [word] = match;
    const start = match.index;
    const end = start + word.length;

    if (start > lastIndex) {
      nodes.push(
        <span key={`type-txt-${lastIndex}`}>
          {type.slice(lastIndex, start)}
        </span>,
      );
    }

    const href = resolveSymbolDocumentationLink(word);
    if (href && word !== currentSymbol) {
      if (href.startsWith('http')) {
        nodes.push(
          <a
            key={`type-ext-${start}`}
            className="codeInline"
            href={href}
            target="_blank"
            rel="noreferrer"
          >
            {word}
          </a>,
        );
      } else {
        nodes.push(
          <Link key={`type-lnk-${start}`} className="codeInline" href={href}>
            {word}
          </Link>,
        );
      }
    } else {
      nodes.push(
        <span key={`type-word-${start}`} className="codeInline">
          {word}
        </span>,
      );
    }

    lastIndex = end;
  }

  if (lastIndex < type.length) {
    nodes.push(
      <span key={`type-txt-end-${lastIndex}`}>{type.slice(lastIndex)}</span>,
    );
  }

  return nodes;
}

function renderTypeListWithLinks(
  types: string[],
  currentSymbol?: string,
): ReactNode {
  return types.flatMap((item, index) => {
    const nodes: ReactNode[] = [];
    if (index > 0) {
      nodes.push(<span key={`type-sep-${index}`}>, </span>);
    }
    nodes.push(
      <span key={`type-item-${index}`}>
        {renderTypeWithLinks(item, currentSymbol)}
      </span>,
    );
    return nodes;
  });
}

function renderTextWithLinks(text: string, currentSymbol?: string): ReactNode {
  const segments = text.split(/(`[^`]*`)/g);
  const externalWordLinks: Record<string, string> = {
    Inversify: 'https://inversify.io/',
  };
  const plainWordNoLink = new Set(['Type']);

  return segments.flatMap((segment, segmentIndex) => {
    const isCode = segment.startsWith('`') && segment.endsWith('`');
    if (isCode) {
      const codeText = segment.slice(1, -1);
      const href = resolveSymbolDocumentationLink(codeText);

      if (href && codeText !== currentSymbol) {
        if (href.startsWith('http')) {
          return (
            <a
              key={`code-ext-${segmentIndex}`}
              className="codeInline"
              href={href}
              target="_blank"
              rel="noreferrer"
            >
              {codeText}
            </a>
          );
        }

        return (
          <Link
            key={`code-lnk-${segmentIndex}`}
            className="codeInline"
            href={href}
          >
            {codeText}
          </Link>
        );
      }

      return (
        <span key={`code-${segmentIndex}`} className="codeInline">
          {codeText}
        </span>
      );
    }

    const nodes: ReactNode[] = [];
    const identifierRe = /[A-Za-z_][A-Za-z0-9_]*/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = identifierRe.exec(segment)) !== null) {
      const [word] = match;
      const start = match.index;
      const end = start + word.length;

      if (start > lastIndex) {
        nodes.push(
          <span key={`txt-${segmentIndex}-${lastIndex}`}>
            {segment.slice(lastIndex, start)}
          </span>,
        );
      }

      const previousChar = start > 0 ? segment[start - 1] : '';
      const isMemberSegment = previousChar === '.';
      const externalHref = externalWordLinks[word];
      const href = resolveSymbolDocumentationLink(word);

      if (externalHref) {
        nodes.push(
          <a
            key={`ext-${segmentIndex}-${start}`}
            href={externalHref}
            target="_blank"
            rel="noreferrer"
          >
            {word}
          </a>,
        );
        lastIndex = end;
        continue;
      }

      if (
        word === currentSymbol ||
        !href ||
        isMemberSegment ||
        plainWordNoLink.has(word)
      ) {
        nodes.push(<span key={`txt-${segmentIndex}-${start}`}>{word}</span>);
      } else {
        nodes.push(
          <Link key={`lnk-${segmentIndex}-${start}`} href={href}>
            {word}
          </Link>,
        );
      }

      lastIndex = end;
    }

    if (lastIndex < segment.length) {
      nodes.push(
        <span key={`txt-${segmentIndex}-${lastIndex}`}>
          {segment.slice(lastIndex)}
        </span>,
      );
    }

    return nodes;
  });
}

function memberAccentTone(kind: ApiMember['kind']): LeftAccentCardTone {
  if (kind === 'constructor') {
    return 'done';
  }
  if (kind === 'method') {
    return 'active';
  }
  if (kind === 'property') {
    return 'mostly';
  }
  return 'brand';
}

export function generateStaticParams() {
  return stateManagerApiItems.map((item) => ({ symbol: item.symbol }));
}

type StateManagerSymbolPageProps = {
  params: Promise<{ symbol: string }>;
};

export async function generateMetadata({ params }: StateManagerSymbolPageProps) {
  const { symbol } = await params;
  const entry = stateManagerApiBySymbol.get(decodeURIComponent(symbol));
  if (!entry) {
    return { title: '@rs-x/state-manager API' };
  }

  const override = SYMBOL_DOCS[entry.symbol];
  return {
    title: `${entry.symbol} | @rs-x/state-manager API`,
    description: override?.summary ?? entry.description,
  };
}

export default async function StateManagerApiSymbolPage({
  params,
}: StateManagerSymbolPageProps) {
  const { symbol } = await params;
  const entry = stateManagerApiBySymbol.get(decodeURIComponent(symbol));
  if (!entry) {
    notFound();
  }

  const moduleHref = `/docs/${entry.module}`;
  const groupEntry = stateManagerApiGroupByModulePath.get(entry.module);
  const usageSnippet =
    entry.kind === 'type' || entry.kind === 'interface'
      ? `import type { ${entry.symbol} } from '@rs-x/state-manager';`
      : `import { ${entry.symbol} } from '@rs-x/state-manager';`;
  const override = SYMBOL_DOCS[entry.symbol];
  const moduleDetail =
    MODULE_DETAILS[entry.module] ??
    'State-manager runtime export used for observer orchestration, change propagation, and tracked state lifecycle.';
  const parameterDocs =
    override?.parameters ?? defaultParameters(entry.kind, entry.signature);
  const returnTypeDoc =
    override?.returns ?? defaultReturnType(entry.kind, entry.signature);
  const usageNotes = override?.notes;
  const isTypeLike = ['interface', 'type', 'enum'].includes(entry.kind);
  const usageExample =
    override?.exampleCode ?? defaultExample(entry.symbol, entry.kind);
  const showExample =
    !['interface', 'type'].includes(entry.kind) &&
    usageExample.trim().length > 0;
  const showWhenToUse =
    !['interface', 'type'].includes(entry.kind) && Boolean(usageNotes);

  let fullTypeSignature: string | null = null;
  if (
    !override?.fullSignature &&
    ['interface', 'class', 'abstract class', 'type'].includes(entry.kind)
  ) {
    try {
      fullTypeSignature = await readFullTypeDeclaration(
        entry.symbol,
        entry.sourcePath,
        entry.kind,
      );
    } catch {
      fullTypeSignature = null;
    }
  }
  const apiSignature =
    override?.fullSignature ?? fullTypeSignature ?? entry.signature;
  const memberDocs = parseDeclarationMembers(apiSignature, entry.symbol);
  const classHasDisposeMethod =
    ['class', 'abstract class'].includes(entry.kind) &&
    memberDocs.some((member) => plainMemberName(member.name) === 'dispose');
  const memberGroups = groupMembers(memberDocs);
  const showMembersCard =
    memberDocs.length > 0 &&
    ['interface', 'class', 'abstract class'].includes(entry.kind);
  const supportsMembers = ['interface', 'class', 'abstract class'].includes(
    entry.kind,
  );
  const showDetailCards = !showMembersCard && !isTypeLike;
  const showParametersCard = showDetailCards && parameterDocs.length > 0;
  const showReturnTypeCard =
    showDetailCards &&
    !['class', 'abstract class'].includes(entry.kind) &&
    Boolean(returnTypeDoc?.trim());
  const showDeclaration = !['class', 'abstract class'].includes(entry.kind);
  const whatItDoes =
    override?.summary ??
    defaultWhatItDoes(entry.symbol, entry.kind, entry.module, entry.description);
  const baseClassName = extractBaseClassName(entry.kind, apiSignature);
  const implementedInterfaces = extractImplementedInterfaces(
    entry.kind,
    apiSignature,
  );
  const extendedInterfaces = extractExtendedInterfaces(entry.kind, apiSignature);
  const moduleLabel = formatModuleLabel(entry.module);
  const sourceHref = `${STATE_MANAGER_GITHUB_BASE}/${entry.sourcePath}`;

  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: '@rs-x/state-manager API', href: '/docs/state-manager-api' },
              ...(groupEntry
                ? [{ label: groupEntry.title, href: groupEntry.href }]
                : []),
              { label: moduleLabel, href: moduleHref },
              { label: entry.symbol },
            ]}
          />
          <p className="docsApiEyebrow">API Entry</p>
          <h1 className="sectionTitle docsApiTitle">
            <span>{entry.symbol}</span>
            <span className="docsApiTypeBadge">{entry.kind}</span>
          </h1>
          <p className="sectionLead docsApiLead">
            {renderTextWithLinks(whatItDoes, entry.symbol)}
          </p>
        </div>
      </div>

      <div className="docsApiGrid">
        <article id="overview" className="card docsApiCard">
          <h2 className="cardTitle">Overview</h2>
          <p className="cardText">
            {renderTextWithLinks(moduleDetail, entry.symbol)}
          </p>
        </article>

        {showWhenToUse && (
          <article id="usage" className="card docsApiCard">
            <h2 className="cardTitle">When to use</h2>
            {usageNotes && (
              <p className="cardText">
                {renderTextWithLinks(usageNotes, entry.symbol)}
              </p>
            )}
          </article>
        )}

        {classHasDisposeMethod && (
          <article id="dispose-lifecycle" className="card docsApiCard">
            <h2 className="cardTitle">Lifecycle</h2>
            <p className="cardText">
              This class exposes <span className="codeInline">dispose()</span>.
              Always call <span className="codeInline">dispose()</span> when you
              are finished with an instance, to release subscriptions/resources
              and prevent memory leaks.
            </p>
          </article>
        )}

        <aside
          className="qsCodeCard docsApiCode docsApiCodeTop"
          aria-label="API and usage"
        >
          <div className="docsApiSidebarSection">
            <div className="docsApiSidebarTitle">Quick facts</div>
            <dl className="docsApiFacts">
              <div className="docsApiFact">
                <dt>Kind</dt>
                <dd>{entry.kind}</dd>
              </div>
              <div className="docsApiFact">
                <dt>Module</dt>
                <dd>
                  <Link href={moduleHref}>{moduleLabel}</Link>
                </dd>
              </div>
              {baseClassName && (
                <div className="docsApiFact">
                  <dt>Base class</dt>
                  <dd>{renderTypeWithLinks(baseClassName, entry.symbol)}</dd>
                </div>
              )}
              {extendedInterfaces.length > 0 && (
                <div className="docsApiFact">
                  <dt>Extends</dt>
                  <dd>
                    {renderTypeListWithLinks(extendedInterfaces, entry.symbol)}
                  </dd>
                </div>
              )}
              {implementedInterfaces.length > 0 && (
                <div className="docsApiFact">
                  <dt>Implements</dt>
                  <dd>
                    {renderTypeListWithLinks(
                      implementedInterfaces,
                      entry.symbol,
                    )}
                  </dd>
                </div>
              )}
              {supportsMembers && memberDocs.length > 0 && (
                <div className="docsApiFact">
                  <dt>Members</dt>
                  <dd>{memberDocs.length}</dd>
                </div>
              )}
              <div className="docsApiFact">
                <dt>Package</dt>
                <dd>
                  <Link
                    href="https://www.npmjs.com/package/@rs-x/state-manager"
                    target="_blank"
                    rel="noreferrer"
                  >
                    @rs-x/state-manager
                  </Link>
                </dd>
              </div>
              <div className="docsApiFact">
                <dt>Source</dt>
                <dd>
                  <a href={sourceHref} target="_blank" rel="noreferrer">
                    {entry.sourcePath}
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          {showDeclaration && (
            <>
              <div id="declaration" className="qsCodeHeader">
                <div className="qsCodeTitle">Declaration</div>
              </div>
              <SyntaxCodeBlock code={apiSignature} />
            </>
          )}

          <div id="import" className="qsCodeHeader">
            <div className="qsCodeTitle">Import</div>
          </div>
          <SyntaxCodeBlock code={usageSnippet} />

          {showExample && (
            <>
              <div id="example" className="qsCodeHeader">
                <div className="qsCodeTitle">Example</div>
              </div>
              <SyntaxCodeBlock code={usageExample} />
            </>
          )}
        </aside>

        {showParametersCard && (
          <article id="parameters" className="card docsApiCard">
            <h2 className="cardTitle">Parameters</h2>
            <ApiParameterList
              items={parameterDocs}
              currentSymbol={entry.symbol}
            />
          </article>
        )}

        {showReturnTypeCard && (
          <article id="returns" className="card docsApiCard">
            <h2 className="cardTitle">Return type</h2>
            <p className="cardText">
              {renderTextWithLinks(returnTypeDoc, entry.symbol)}
            </p>
          </article>
        )}

        {showMembersCard && (
          <article id="members" className="card docsApiCard apiMembersCard">
            <div className="docsApiSectionTop">
              <div>
                <h2 className="cardTitle">Members</h2>
                <p className="cardText docsApiSectionNote">
                  {memberDocs.length} member{memberDocs.length === 1 ? '' : 's'}{' '}
                  in this {entry.kind}.
                </p>
              </div>
            </div>
            {memberGroups.map((group) => (
              <section
                key={group.kind}
                className="apiMemberGroup"
                id={`members-${group.kind}`}
              >
                <h3 className="coreInlineCodeTitle apiMemberGroupTitle">
                  {group.title}
                </h3>
                <div className="apiMemberList">
                  {group.members.map((member) => (
                    <LeftAccentCard
                      key={`${member.name}-${member.signature}`}
                      as="article"
                      tone={memberAccentTone(member.kind)}
                      className="apiMemberItem"
                    >
                      <div className="apiMemberHead">
                        <span className="apiMemberName codeInline">
                          {member.name}
                        </span>
                        <span className="apiMemberKind">{member.kind}</span>
                        {member.access && (
                          <span className="apiMemberMeta">{member.access}</span>
                        )}
                        {member.abstract && (
                          <span className="apiMemberMeta">abstract</span>
                        )}
                        {member.readonly && (
                          <span className="apiMemberMeta">readonly</span>
                        )}
                        {member.optional && (
                          <span className="apiMemberMeta">optional</span>
                        )}
                      </div>
                      <p className="apiMemberDescription">{member.description}</p>
                      <SyntaxCodeBlock
                        code={formatMemberSignatureForDisplay(member)}
                        className="apiMemberSignature"
                      />

                      {member.kind === 'property' && member.returnType && (
                        <div className="apiMemberSection apiMemberSectionInline">
                          <p className="apiMemberSectionTitle">Type</p>
                          <p className="apiMemberReturn">
                            {renderTypeWithLinks(
                              member.returnType,
                              entry.symbol,
                            )}
                          </p>
                        </div>
                      )}

                      {member.parameters.length > 0 && (
                        <div className="apiMemberSection">
                          <p className="apiMemberSectionTitle">Parameters</p>
                          <dl
                            className="apiMemberParamList"
                            role="table"
                            aria-label={`${member.name} parameters`}
                          >
                            <div className="apiMemberParamHeader" role="row">
                              <dt role="columnheader">Name</dt>
                              <dt role="columnheader">Type</dt>
                              <dt role="columnheader">Required</dt>
                            </div>
                            {member.parameters.map((param) => (
                              <div
                                key={`${member.name}-${param.name}`}
                                className="apiMemberParamItem"
                              >
                                <dt className="apiMemberParamName">
                                  <span className="codeInline">
                                    {param.name}
                                    {param.optional ? '?' : ''}
                                  </span>
                                </dt>
                                <dd className="apiMemberParamType">
                                  {renderTypeWithLinks(param.type, entry.symbol)}
                                </dd>
                                <dd className="apiMemberParamRequirement">
                                  {param.rest
                                    ? 'variadic'
                                    : param.optional
                                      ? 'optional'
                                      : 'required'}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      )}

                      {(member.kind === 'method' ||
                        member.kind === 'constructor' ||
                        member.kind === 'call') &&
                        member.parameters.length === 0 && (
                          <div className="apiMemberSection">
                            <p className="apiMemberSectionTitle">Parameters</p>
                            <p className="apiMemberReturn">No parameters.</p>
                          </div>
                        )}

                      {member.returnType && member.kind !== 'property' && (
                        <div className="apiMemberSection apiMemberSectionInline">
                          <p className="apiMemberSectionTitle">Returns</p>
                          <p className="apiMemberReturn">
                            {renderTypeWithLinks(
                              member.returnType,
                              entry.symbol,
                            )}
                          </p>
                        </div>
                      )}
                    </LeftAccentCard>
                  ))}
                </div>
              </section>
            ))}
          </article>
        )}
      </div>
    </DocsPageTemplate>
  );
}
