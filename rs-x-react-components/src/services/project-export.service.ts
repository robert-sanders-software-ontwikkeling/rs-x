import { buildZipFromTextFiles } from './zip-builder';

type ProjectSource = {
  source: string;
  usesRxjs: boolean;
};

const stripRsxBinding = (script: string): string => {
  return script.replace(
    /^\s*(const|let|var)\s+rsx\s*=\s*api\.rsx\s*;?\s*$/gm,
    '',
  );
};

const stripWaitForEventBinding = (script: string): string => {
  return script.replace(
    /^\s*(const|let|var)\s+WaitForEvent\s*=\s*api\.WaitForEvent\s*;?\s*$/gm,
    '',
  );
};

const stripIndexWatchRuleBinding = (script: string): string => {
  return script.replace(
    /^\s*(const|let|var)\s+IndexWatchRule\s*=\s*api\.IndexWatchRule\s*;?\s*$/gm,
    '',
  );
};

const stripPrintValueBinding = (script: string): string => {
  return script.replace(
    /^\s*(const|let|var)\s+printValue\s*=\s*api\.printValue\s*;?\s*$/gm,
    '',
  );
};

function buildProjectSource(script: string): ProjectSource {
  const hasRxjsAliasBinding =
    /^\s*(const|let|var)\s+\$\s*=\s*(?:api\.)?rxjs\s*;?\s*$/m.test(script);
  const usesStateManagerApi = /(?:\bapi\.)?stateManager\b/.test(script);

  let normalized = stripRsxBinding(script);
  normalized = stripWaitForEventBinding(normalized);
  normalized = stripIndexWatchRuleBinding(normalized);
  normalized = stripPrintValueBinding(normalized);

  normalized = normalized.replace(/api\.rsx\b/g, 'rsx');
  normalized = normalized.replace(/api\.WaitForEvent\b/g, 'WaitForEvent');
  normalized = normalized.replace(/api\.IndexWatchRule\b/g, 'IndexWatchRule');
  normalized = normalized.replace(/api\.printValue\b/g, 'printValue');
  normalized = normalized.replace(
    /api\.stateManager\b/g,
    'InjectionContainer.get<IStateManager>(RsXStateManagerInjectionTokens.IStateManager)',
  );
  normalized = normalized.replace(
    /(?<![\w$.])stateManager\b/g,
    'InjectionContainer.get<IStateManager>(RsXStateManagerInjectionTokens.IStateManager)',
  );
  normalized = normalized.replace(
    /api\.ExpressionChangeTransactionManager\b/g,
    'InjectionContainer.get<IExpressionChangeTransactionManager>(RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager)',
  );
  normalized = normalized.replace(
    /(?<![\w$.])ExpressionChangeTransactionManager\b/g,
    'InjectionContainer.get<IExpressionChangeTransactionManager>(RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager)',
  );

  let rxjsImportBlock = '';
  let usesRxjs = false;

  if (hasRxjsAliasBinding) {
    normalized = normalized.replace(
      /^\s*(const|let|var)\s+\$\s*=\s*(?:api\.)?rxjs\s*;?\s*$/gm,
      '',
    );
    normalized = normalized.replace(/api\.rxjs\b/g, '$');

    const usesDollarAlias = /(^|[^\w$])\$(?![\w$])/m.test(normalized);
    if (usesDollarAlias) {
      usesRxjs = true;
      rxjsImportBlock = `import * as rxjs from 'rxjs';\nconst $ = rxjs;\n`;
    }
  } else {
    const destructuredMembers = new Set<string>();

    // Strip `const { interval, map } = rxjs;` or `... = api.rxjs;` lines, collecting member names
    normalized = normalized.replace(
      /^\s*(?:const|let|var)\s+\{([^}]+)\}\s*=\s*(?:api\.)?rxjs\s*;?\s*$/gm,
      (_full, members: string) => {
        members
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean)
          .forEach((m) => destructuredMembers.add(m));
        return '';
      },
    );

    const directMembers = new Set<string>(destructuredMembers);

    normalized = normalized.replace(
      /(?:api\.)?rxjs\.([A-Za-z_$][\w$]*)/g,
      (_full, member: string) => {
        directMembers.add(member);
        return member;
      },
    );

    if (directMembers.size > 0) {
      usesRxjs = true;
      rxjsImportBlock = `import { ${Array.from(directMembers).sort().join(', ')} } from 'rxjs';\n`;
    }
  }

  const userScript = normalized.trim();
  const usesAwait = /\bawait\b/.test(userScript);
  const usesWaitForEvent = /\bWaitForEvent\b/.test(userScript);
  const usesIndexWatchRule = /\bIndexWatchRule\b/.test(userScript);
  const usesPrintValue = /\bprintValue\b/.test(userScript);
  const usesTransactionManager = /\bIExpressionChangeTransactionManager\b/.test(
    userScript,
  );

  const coreImports = ['InjectionContainer'];
  if (usesWaitForEvent) {
    coreImports.push('WaitForEvent');
  }
  if (usesPrintValue) {
    coreImports.push('printValue');
  }

  const expressionParserImports = ['rsx', 'RsXExpressionParserModule'];
  const expressionParserTypeImports = ['IExpression'];
  if (usesTransactionManager) {
    expressionParserImports.push('RsXExpressionParserInjectionTokens');
    expressionParserTypeImports.push('IExpressionChangeTransactionManager');
  }

  const expressionParserImportBlock = `import { ${[
    ...expressionParserImports,
    ...expressionParserTypeImports.map((entry) => `type ${entry}`),
  ].join(', ')} } from '@rs-x/expression-parser';`;

  const stateManagerImports: string[] = [];
  const stateManagerTypeImports: string[] = [];
  if (usesIndexWatchRule) {
    stateManagerImports.push('IndexWatchRule');
  }
  if (usesStateManagerApi) {
    stateManagerImports.push('RsXStateManagerInjectionTokens');
    stateManagerTypeImports.push('IStateManager');
  }

  const stateManagerImportBlock =
    stateManagerImports.length > 0 || stateManagerTypeImports.length > 0
      ? `import { ${[
          ...stateManagerImports,
          ...stateManagerTypeImports.map((entry) => `type ${entry}`),
        ].join(', ')} } from '@rs-x/state-manager';`
      : '';
  const createExpressionSignature = usesAwait
    ? 'async function createExpression(): Promise<IExpression<unknown>>'
    : 'function createExpression(): IExpression<unknown>';
  const createExpressionInvocation = usesAwait
    ? 'await createExpression()'
    : 'createExpression()';

  const source = `import { ${coreImports.join(', ')} } from '@rs-x/core';
${expressionParserImportBlock}
${stateManagerImportBlock ? `${stateManagerImportBlock}\n` : ''}\
${rxjsImportBlock ? `${rxjsImportBlock}` : ''}
import { initRsx } from './rsx-bootstrap.js';

${createExpressionSignature} {
${userScript
  .split('\n')
  .map((line) => `  ${line}`)
  .join('\n')}
}

async function main(): Promise<void> {
  await initRsx();
  await InjectionContainer.load(RsXExpressionParserModule);

  const expression = ${createExpressionInvocation};
  expression.changed.subscribe(() => {
    console.log('Expression changed:', expression.value);
  });
}

void main();
`;

  return {
    source,
    usesRxjs,
  };
}

function toPackageJson(usesRxjs: boolean): string {
  const dependencies: Record<string, string> = {
    '@rs-x/core': 'latest',
    '@rs-x/state-manager': 'latest',
    '@rs-x/expression-parser': 'latest',
  };

  if (usesRxjs) {
    dependencies.rxjs = '^7.8.2';
  }

  return JSON.stringify(
    {
      name: 'rs-x-playground-project',
      private: true,
      version: '0.1.0',
      type: 'module',
      scripts: {
        build: 'rsx build --project tsconfig.json',
        'build:prod': 'rsx build --project tsconfig.json --prod',
        'typecheck:rsx': 'rsx typecheck --project tsconfig.json',
        start: 'node dist/main.js',
      },
      dependencies,
      devDependencies: {
        '@rs-x/compiler': 'latest',
        '@rs-x/typescript-plugin': 'latest',
        typescript: '^5.9.3',
      },
    },
    null,
    2,
  );
}

function toRsxConfig(): string {
  return JSON.stringify(
    {
      build: {
        preparse: true,
        preparseFile: 'src/rsx-generated/rsx-aot-preparsed.generated.ts',
        compiled: true,
        compiledFile: 'src/rsx-generated/rsx-aot-compiled.generated.ts',
        registrationFile: 'src/rsx-generated/rsx-aot-registration.generated.ts',
        compiledResolvedEvaluator: false,
      },
      cli: {
        packageManager: 'npm',
        add: {
          defaultDirectory: 'src/expressions',
          searchRoots: ['src', 'app', 'expressions'],
        },
      },
    },
    null,
    2,
  );
}

function toTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        outDir: 'dist',
        rootDir: 'src',
        plugins: [
          {
            name: '@rs-x/typescript-plugin',
          },
        ],
      },
      include: ['src/**/*.ts'],
    },
    null,
    2,
  );
}

function toRsxBootstrap(): string {
  return `type RsxCompiledModule = {
  registerRsxAotCompiledExpressions?: () => void;
};

type RsxPreparsedModule = {
  registerRsxAotParsedExpressionCache?: () => void;
};

async function loadCompiledModule(): Promise<RsxCompiledModule> {
  try {
    return (await import(
      './rsx-generated/' + 'rsx-aot-compiled.generated.js'
    )) as RsxCompiledModule;
  } catch {
    return {};
  }
}

async function loadPreparsedModule(): Promise<RsxPreparsedModule> {
  try {
    return (await import(
      './rsx-generated/' + 'rsx-aot-preparsed.generated.js'
    )) as RsxPreparsedModule;
  } catch {
    return {};
  }
}

export async function initRsx(): Promise<void> {
  const preparsedModule = await loadPreparsedModule();
  const compiledModule = await loadCompiledModule();

  preparsedModule.registerRsxAotParsedExpressionCache?.();
  compiledModule.registerRsxAotCompiledExpressions?.();
}
`;
}

function toReadme(): string {
  return `# rs-x Playground Export

This project was exported from the [rs-x playground](https://rsxjs.com/playground).
It is a Node.js TypeScript project with full rs-x build integration.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [rs-x CLI](https://rsxjs.com/docs/core-concepts/cli) — install with \`npm install -g @rs-x/cli\`

## Getting started

**1. Install dependencies**

\`\`\`bash
npm install
\`\`\`

**2. Build**

\`\`\`bash
npm run build
\`\`\`

Runs the rs-x compiler (validates expressions, generates AOT files) and compiles TypeScript.
Any expression errors are reported and the build fails — fix them before proceeding.

**Production build (fully compiled, no runtime parsing):**

\`\`\`bash
npm run build:prod
\`\`\`

**3. Run**

\`\`\`bash
npm run start
\`\`\`

## Project structure

\`\`\`
src/
  main.ts              # Expression definition and entry point
  rsx-bootstrap.ts     # Loads AOT-compiled/preparsed expression modules
  rsx-generated/       # Generated by rsx build (do not edit manually)
package.json           # Dependencies and scripts
tsconfig.json          # TypeScript + rs-x plugin configuration
rsx.config.json        # rs-x build and CLI configuration
\`\`\`

## Learn more

- [rs-x documentation](https://rsxjs.com/docs)
- [CLI reference](https://rsxjs.com/docs/core-concepts/cli)
`;
}

export function downloadProjectZip(script: string): void {
  const project = buildProjectSource(script);

  const files: Record<string, string> = {
    'package.json': toPackageJson(project.usesRxjs),
    'tsconfig.json': toTsConfig(),
    'rsx.config.json': toRsxConfig(),
    '.gitignore': 'node_modules\ndist\n',
    'README.md': toReadme(),
    'src/rsx-bootstrap.ts': toRsxBootstrap(),
    'src/main.ts': project.source,
  };

  const blob = buildZipFromTextFiles(files);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = 'rs-x-playground-project.zip';
  anchor.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
