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

function buildProjectSource(script: string): ProjectSource {
  const hasRxjsAliasBinding = /^\s*(const|let|var)\s+\$\s*=\s*api\.rxjs\s*;?\s*$/m.test(
    script,
  );

  let normalized = stripRsxBinding(script);
  normalized = normalized.replace(/api\.rsx\b/g, 'rsx');

  let rxjsImportBlock = '';
  let usesRxjs = false;

  if (hasRxjsAliasBinding) {
    normalized = normalized.replace(
      /^\s*(const|let|var)\s+\$\s*=\s*api\.rxjs\s*;?\s*$/gm,
      '',
    );
    normalized = normalized.replace(/api\.rxjs\b/g, '$');

    const usesDollarAlias = /(^|[^\w$])\$(?![\w$])/m.test(normalized);
    if (usesDollarAlias) {
      usesRxjs = true;
      rxjsImportBlock = `import * as rxjs from 'rxjs';\nconst $ = rxjs;\n`;
    }
  } else {
    const directMembers = new Set<string>();

    normalized = normalized.replace(
      /api\.rxjs\.([A-Za-z_$][\w$]*)/g,
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

  const source = `import { InjectionContainer } from '@rs-x/core';
import { rsx, type IExpression, RsXExpressionParserModule } from '@rs-x/expression-parser';
${rxjsImportBlock ? `${rxjsImportBlock}` : ''}

function createExpression(): IExpression<unknown> {
${userScript
  .split('\n')
  .map((line) => `  ${line}`)
  .join('\n')}
}

async function main(): Promise<void> {
  await InjectionContainer.load(RsXExpressionParserModule);

  const expression = createExpression();
  expression.changed.subscribe(() => {
    console.log('Expression changed:', expression.value);
  });

  console.log('Initial value:', expression.value);
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
        build: 'tsc -p tsconfig.json',
        start: 'node dist/main.js',
      },
      dependencies,
      devDependencies: {
        typescript: '^5.9.0',
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
        outDir: 'dist',
        skipLibCheck: true,
      },
      include: ['src/**/*.ts'],
    },
    null,
    2,
  );
}

function toReadme(): string {
  return `# rs-x Playground Export

Generated from the rs-x playground.

## Run

\`\`\`bash
pnpm install
pnpm build
pnpm start
\`\`\`
`;
}

export function downloadProjectZip(script: string): void {
  const project = buildProjectSource(script);

  const files: Record<string, string> = {
    'package.json': toPackageJson(project.usesRxjs),
    'tsconfig.json': toTsConfig(),
    'README.md': toReadme(),
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
