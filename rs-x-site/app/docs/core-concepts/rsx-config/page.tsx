import dedent from 'dedent';
import type { Metadata } from 'next';

import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../_template/core-concept-page';

const fullConfigExample = dedent`
  {
    "build": {
      "tsconfig": "tsconfig.app.json",
      "outDir": "dist",
      "preparse": true,
      "preparseFile": "src/rsx-generated/rsx-aot-preparsed.generated.ts",
      "compiled": true,
      "compiledFile": "src/rsx-generated/rsx-aot-compiled.generated.ts",
      "registrationFile": "src/rsx-generated/rsx-aot-registration.generated.ts",
      "compiledResolvedEvaluator": false
    },
    "cli": {
      "packageManager": "pnpm",
      "installTag": "latest",
      "init": {
        "verify": true
      },
      "project": {
        "verify": true
      },
      "add": {
        "defaultDirectory": "src/expressions",
        "searchRoots": ["src", "app", "expressions"]
      }
    }
  }
`;

const minimalConfigExample = dedent`
  {
    "build": {
      "tsconfig": "tsconfig.app.json"
    }
  }
`;

const nextjsConfigExample = dedent`
  {
    "build": {
      "tsconfig": "tsconfig.json",
      "preparse": true,
      "preparseFile": "app/rsx-generated/rsx-aot-preparsed.generated.ts",
      "compiled": true,
      "compiledFile": "app/rsx-generated/rsx-aot-compiled.generated.ts",
      "registrationFile": "app/rsx-generated/rsx-aot-registration.generated.ts",
      "compiledResolvedEvaluator": false
    },
    "cli": {
      "packageManager": "npm",
      "add": {
        "defaultDirectory": "app/expressions",
        "searchRoots": ["app", "src", "expressions"]
      }
    }
  }
`;

const doc: CoreConceptDoc = {
  title: 'rsx.config.json',
  lead: 'The rsx.config.json file is the single configuration file for RS-X build settings and CLI defaults in your project.',
  whatItMeans: (
    <>
      <p>
        Place an <span className="codeInline">rsx.config.json</span> file in
        your project root to configure both the RS-X build pipeline and the RS-X
        authoring tools. The file has two top-level sections:{' '}
        <span className="codeInline">build</span> (controls what{' '}
        <span className="codeInline">rsx build</span> and{' '}
        <span className="codeInline">rsx typecheck</span> generate) and{' '}
        <span className="codeInline">cli</span> (controls defaults for{' '}
        <span className="codeInline">rsx init</span>,{' '}
        <span className="codeInline">rsx project</span>, the VS Code Expressions
        panel add flow, and package manager selection).
      </p>
      <p style={{ marginTop: 8 }}>
        The CLI validates the file at runtime and the VS Code extension
        contributes a JSON schema for it, so you get editor validation and
        completions while editing.
      </p>
    </>
  ),
  whyItMatters:
    'Having one config file per project keeps build settings and authoring defaults together and version-controlled. Every teammate and CI run uses the same tsconfig path, AOT output locations, package manager, and add defaults without command-line flags.',
  keyPoints: [
    'Place rsx.config.json in the project root alongside package.json.',
    'rsx init and rsx project generate a starter rsx.config.json automatically.',
    'The build section mirrors rsx build/typecheck flags and sets per-project defaults.',
    'The cli section sets defaults for package manager, install channel, init/project verification, and the VS Code expression add flow.',
    'The CLI validates the file on every command that reads config — bad config fails early with a clear message.',
    'The VS Code extension contributes a JSON schema so rsx.config.json gets red squiggles, completions, and hover docs.',
  ],
  deepDive: [
    {
      title: 'File location and loading',
      paragraphs: [
        'Place rsx.config.json in the project root (next to package.json). The CLI resolves it relative to the current working directory when a command runs.',
        'If no rsx.config.json exists, all fields fall back to their built-in defaults. Most commands work without any config file at all.',
        'The file must be valid JSON. Comments are not supported.',
      ],
      code: minimalConfigExample,
    },
    {
      title: 'build.tsconfig',
      paragraphs: [
        'Type: string | Default: none',
        'The default tsconfig path used by rsx build and rsx typecheck when --project is not passed on the command line.',
        'Set this to avoid repeating --project tsconfig.app.json in every build script.',
        'Overridden by the --project flag at runtime.',
      ],
    },
    {
      title: 'build.outDir',
      paragraphs: [
        'Type: string | Default: none',
        'The default output directory used by rsx build when --out-dir is not passed on the command line.',
        'Overridden by --out-dir at runtime.',
      ],
    },
    {
      title: 'build.preparse',
      paragraphs: [
        'Type: boolean | Default: false',
        'Enables generation of the preparsed AST cache module during rsx build --prod.',
        'When true, rsx build --prod writes a preparsed module to the path in build.preparseFile. The runtime loads that module to skip parsing statically-known expressions at startup.',
        'Has no effect in dev builds (without --prod).',
        'See the Compiler docs for when preparse is a good fit.',
      ],
    },
    {
      title: 'build.preparseFile',
      paragraphs: [
        'Type: string | Default: src/rsx-generated/rsx-aot-preparsed.generated.ts',
        'Path for the generated preparsed AST cache module.',
        'Only used when build.preparse is true.',
        'Use an app-specific path for Next.js projects (e.g. app/rsx-generated/...).',
      ],
    },
    {
      title: 'build.compiled',
      paragraphs: [
        'Type: boolean | Default: false',
        'Enables generation of the compiled-expression plan cache module during rsx build --prod.',
        'When true, rsx build --prod writes compiled plans to the path in build.compiledFile. The runtime uses compiled plans to avoid expression-tree evaluation for registered expression sites.',
        'Per-expression behavior is still controlled by the compiled option passed directly to rsx(..., { compiled: false }) — build.compiled only gates whether production generation runs at all.',
      ],
    },
    {
      title: 'build.compiledFile',
      paragraphs: [
        'Type: string | Default: src/rsx-generated/rsx-aot-compiled.generated.ts',
        'Path for the generated compiled-plan cache module.',
        'Only used when build.compiled is true.',
      ],
    },
    {
      title: 'build.registrationFile',
      paragraphs: [
        'Type: string | Default: src/rsx-generated/rsx-aot-registration.generated.ts',
        'Path for the generated registration module that loads AOT outputs (preparsed and compiled) into the runtime caches at startup.',
        'The entry point of your app should import this file when using AOT mode.',
      ],
    },
    {
      title: 'build.compiledResolvedEvaluator',
      paragraphs: [
        'Type: boolean | Default: false',
        'Controls whether the compiled AOT output also embeds a resolved-dependency evaluator function alongside each compiled plan.',
        'When false: runtime still uses compiled plans, but dependency resolution stays in shared runtime code. Smaller generated output, simpler artifacts.',
        'When true: more dependency-resolution work is pushed into each generated compiled evaluator. Potentially faster compiled evaluation paths at the cost of larger generated output and a more aggressive AOT build.',
        'Start with false and only enable if benchmarks show a meaningful gain for your specific expression set.',
      ],
    },
    {
      title: 'cli.packageManager',
      paragraphs: [
        'Type: "pnpm" | "npm" | "yarn" | "bun" | Default: auto-detected',
        'Default package manager used for install, rsx init, and rsx project flows.',
        'When not set, the CLI detects the package manager from the lockfile in the current project.',
        'Override per-command with --pm <manager>.',
      ],
    },
    {
      title: 'cli.installTag',
      paragraphs: [
        'Type: "latest" | "next" | Default: "latest"',
        'Default dist-tag used when the CLI installs RS-X packages.',
        '"latest" installs the current stable release. "next" installs the prerelease channel.',
        'Override per-command with --next.',
      ],
    },
    {
      title: 'cli.init.verify',
      paragraphs: [
        'Type: boolean | Default: false',
        'When true, rsx init runs a post-mutation sanity check automatically — as if --verify was always passed.',
        'Useful in team or CI environments where you want to confirm the integration output is correct on every run.',
      ],
    },
    {
      title: 'cli.project.verify',
      paragraphs: [
        'Type: boolean | Default: true',
        'When true, rsx project re-runs project verification after scaffolding automatically.',
        'rsx project already verifies by default; this flag makes the behavior explicit and configurable.',
      ],
    },
    {
      title: 'cli.add.defaultDirectory',
      paragraphs: [
        'Type: string | Default: "src/expressions"',
        'The default directory suggested by the VS Code Expressions panel when creating a new expression file.',
        'Set to "app/expressions" for Next.js projects.',
        'The user can change the directory during the interactive flow regardless of this default.',
      ],
    },
    {
      title: 'cli.add.searchRoots',
      paragraphs: [
        'Type: string[] | Default: ["src", "app", "expressions"]',
        'Preferred source roots used by expression-authoring tools when ranking existing RS-X expression files for the "update existing file" flow.',
        'Entries are plain path prefixes relative to the project root. Files under these roots are ranked above files elsewhere in the repo.',
        'Useful in monorepos or unusual directory layouts where the default src/app/expressions ranking does not match your project structure.',
      ],
    },
    {
      title: 'Full example with all fields',
      paragraphs: [
        'All fields are optional. Only set what you need — the CLI applies built-in defaults for anything omitted.',
      ],
      code: fullConfigExample,
    },
    {
      title: 'Next.js example',
      paragraphs: [
        'For Next.js projects, generated files typically live under app/ rather than src/. rsx project nextjs creates this config automatically.',
      ],
      code: nextjsConfigExample,
    },
    {
      title: 'Editor validation',
      paragraphs: [
        'The RS-X VS Code extension contributes a JSON schema for rsx.config.json.',
        'Once the extension is installed, VS Code will validate the file as you type, report unknown properties, and show completion suggestions and hover descriptions for every field.',
        'Install the extension with: rsx install vscode',
      ],
    },
  ],
  related: [
    {
      href: '/docs/core-concepts/cli',
      title: 'CLI',
      meta: 'All rsx commands, flags, and workflows',
    },
    {
      href: '/docs/core-concepts/compiler',
      title: 'Compiler',
      meta: 'How build-time preparse/compiled/lazy options affect runtime',
    },
    {
      href: '/docs/irsx-options',
      title: 'IRsxOptions',
      meta: 'Per-expression option details for preparse, lazy, and compiled',
    },
  ],
};

export const metadata: Metadata = {
  title: doc.title,
  description: doc.lead,
};

export default function Page() {
  return <CoreConceptPageLayout doc={doc} />;
}
