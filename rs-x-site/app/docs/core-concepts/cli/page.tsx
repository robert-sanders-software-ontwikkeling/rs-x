import dedent from 'dedent';
import type { Metadata } from 'next';

import { SyntaxCodeBlock } from '../../../../components/SyntaxCodeBlock';
import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../_template/core-concept-page';

const installCliCode = dedent`
  # Local (recommended in project)
  # npm
  npm install -D @rs-x/cli

  # pnpm
  pnpm add -D @rs-x/cli

  # Global (optional)
  # npm
  npm install -g @rs-x/cli

  # pnpm
  pnpm add -g @rs-x/cli

  # Prerelease (next) - global
  npm install -g @rs-x/cli@next
  pnpm add -g @rs-x/cli@next
`;

const bootstrapExistingProjectCode = dedent`
  # Auto-detect framework and wire bootstrap
  npx rsx init

  # Or force a specific entry file
  npx rsx init --entry src/main.ts
`;

const createTemplateProjectCode = dedent`
  # Full template names
  npx rsx project angular --name my-rsx-angular-app
  npx rsx project vuejs --name my-rsx-vue-app
  npx rsx project react --name my-rsx-react-app
  npx rsx project nextjs --name my-rsx-next-app
  npx rsx project nodejs --name my-rsx-node-app

  # Short aliases
  npx rsx project a --name my-rsx-angular-app
  npx rsx project v --name my-rsx-vue-app
  npx rsx project r --name my-rsx-react-app
  npx rsx project nx --name my-rsx-next-app
  npx rsx project js --name my-rsx-node-app
`;

const setupIntegrationCode = dedent`
  # Auto-detect framework and apply setup
  npx rsx setup
`;

const buildAndTypecheckCode = dedent`
  # Build with RS-X transform
  npx rsx build --project tsconfig.json

  # Production profile (AOT preparse/compiled outputs when configured)
  npx rsx build --project tsconfig.json --prod

  # TypeScript + RS-X semantic checks
  npx rsx typecheck --project tsconfig.json
`;

const buildConfigurationCode = dedent`
  {
    "rsx": {
      "build": {
        "preparse": true,
        "preparseFile": "src/rsx-generated/rsx-aot-preparsed.generated.ts",
        "compiled": true,
        "compiledFile": "src/rsx-generated/rsx-aot-compiled.generated.ts",
        "registrationFile": "src/rsx-generated/rsx-aot-registration.generated.ts",
        "compiledResolvedEvaluator": false
      }
    }
  }
`;

const cliConfigurationCode = dedent`
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
      "installTag": "next",
      "setup": {
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

const commandReferenceCode = dedent`
  rsx help [command]
  rsx doctor
  rsx add [-a]
  rsx install vscode [--force] [--local] [--dry-run]
  rsx install compiler [--pm <pnpm|npm|yarn|bun>] [--next] [--dry-run]
  rsx setup [--pm <pnpm|npm|yarn|bun>] [--next] [--verify] [--force] [--local] [--dry-run]
  rsx init [--pm <pnpm|npm|yarn|bun>] [--entry <path>] [--next] [--skip-install] [--skip-vscode] [--force] [--local] [--dry-run]
  rsx project <angular|a|vuejs|v|react|r|nextjs|nx|nodejs|js> [--name <n>] [--template <...>] [--pm <pnpm|npm|yarn|bun>] [--next] [--skip-install] [--skip-vscode] [--verify] [--dry-run]
  rsx build [--project <tsconfig>] [--out-dir <path>] [--prod] [--no-emit] [--aot-preparse <true|false>] [--aot-preparse-file <path>] [--aot-compiled <true|false>] [--aot-compiled-file <path>] [--compiled-resolved-evaluator <true|false>] [--dry-run]
  rsx typecheck [--project <tsconfig>] [--dry-run]
  rsx version | v | -v | --version
`;

const installVsCodeCode = dedent`
  # Marketplace install
  npx rsx install vscode

  # Reinstall
  npx rsx install vscode --force

  # Build/install local VSIX from repository workspace
  npx rsx install vscode --local --force
`;

const vscodeInstallRecoveryCode = dedent`
  # 1) Check VS Code CLI is available
  code --version

  # 2) Retry install through rsx
  npx rsx install vscode --force

  # 3) If needed, install VSIX manually
  code --install-extension "/absolute/path/to/rs-x-vscode-extension-<version>.vsix"

  # 4) Optional: disable postinstall auto-install in CI or restricted environments
  RSX_SKIP_VSCODE_EXTENSION_INSTALL=true
`;

const installCompilerCode = dedent`
  npx rsx install compiler
  npx rsx install compiler --next
  npx rsx install compiler --pm pnpm
`;

const doctorAndAddCode = dedent`
  # Environment diagnostics
  npx rsx doctor

  # Interactive expression creator
  npx rsx add
`;

const initSetupProjectCode = dedent`
  # init: wire bootstrap in the current app
  npx rsx init

  # setup: detect framework and apply framework-specific integration
  npx rsx setup --verify

  # project: scaffold a full RS-X starter
  npx rsx project react --name my-rsx-react-app --verify
`;

const helpAndVersionCode = dedent`
  npx rsx help
  npx rsx help build
  npx rsx help project
  npx rsx v
  npx rsx version
  npx rsx --version
`;

const doc: CoreConceptDoc = {
  title: 'CLI',
  lead: 'Use the RS-X CLI to diagnose environments, create projects, wire framework bootstrap, install tooling, and run rs-x-aware build/typecheck workflows.',
  whatItMeans:
    'The RS-X CLI is the main way to set up and operate RS-X in an application. Instead of manually wiring bootstrap files, transforms, and scripts, you run clear commands (`init`, `setup`, `project`, `build`, `typecheck`) that apply the same integration steps every time.',
  whyItMatters:
    'Using the CLI simplifies setup and speeds up initial development and keeps configuration consistent. Teams get the same project structure, bootstrap wiring, build flags, and diagnostics flow across Angular, Vue, React, Next.js, and Node.js projects.',
  keyPoints: [
    'Every primary CLI command is covered here (`doctor`, `add`, `install`, `setup`, `init`, `project`, `build`, `typecheck`, `version`).',
    'Install once (`@rs-x/cli`) and use `rsx` commands in package scripts or `npx rsx ...`.',
    'Use `rsx init` for existing projects when you want automatic bootstrap wiring.',
    'Use `rsx setup` to auto-detect the framework and apply the correct integration.',
    'Use `rsx project <template>` to create a full starter with RS-X already integrated.',
    'Use `rsx build` and `rsx typecheck` in CI to enforce RS-X compile and expression semantics.',
  ],
  deepDive: [
    {
      title: '1) Install the CLI',
      paragraphs: [
        'Install `@rs-x/cli` as a dev dependency in your workspace (recommended). This provides the `rsx` command from local project scripts and keeps team environments version-aligned.',
        'Global install is optional. It is convenient for running `rsx` directly in any terminal, but local project install is usually better for reproducible CI/dev behavior.',
        'If you install the prerelease (`@rs-x/cli@next`), use a global install to make `rsx` available on PATH.',
      ],
    },
    {
      title: '2) Initialize or setup an existing app',
      paragraphs: [
        '`rsx init` focuses on package installation and bootstrap wiring based on detected context.',
        '`rsx setup` auto-detects framework context and applies the matching integration flow.',
        'That now includes writing `rsx.config.json` plus `build:rsx` / `typecheck:rsx` scripts consistently for the framework setup, not only bootstrap patching.',
        '`rsx init`, `rsx setup`, and `rsx project` also create an `rsx.config.json` file with default build and CLI settings that you can override later.',
        'Use `--verify` with `rsx setup` when you want an explicit post-mutation sanity check of the resulting files and scripts.',
        '`rsx project` goes further: it creates a new app and verifies the generated starter structure before reporting success. `--verify` can be passed when you want that verification step to be explicit in the command you run.',
      ],
    },
    {
      title: '3) What the CLI installs',
      paragraphs: [
        'Installing `@rs-x/cli` adds the `rsx` command. During package postinstall, the CLI also attempts to install the bundled rs-x VS Code extension automatically when `code` is available on PATH.',
        '`rsx init` installs runtime packages (`@rs-x/core`, `@rs-x/state-manager`, `@rs-x/expression-parser`) and compiler tooling (`@rs-x/compiler`, `@rs-x/typescript-plugin`), then wires bootstrap.',
        'Template/setup flows install framework-specific packages when needed (for example `@rs-x/angular` for Angular, `@rs-x/react` for React/Next.js, and `@rs-x/vue` for Vue).',
        '`rsx init`, `rsx setup`, and `rsx project` do not automatically install the VS Code extension. Use `rsx install vscode` when you want to apply the bundled VSIX manually.',
        'Add `--next` to install prerelease versions (dist-tag `next`) when testing upcoming releases.',
      ],
    },
    {
      title: '4) Create new template projects',
      paragraphs: [
        '`rsx project` supports `angular`, `vuejs`, `react`, `nextjs`, and `nodejs` templates.',
        'You can choose by full name, short alias, `--template`, or interactive prompt.',
        'Template-specific extras are included (for example Angular installs `@rs-x/angular`, React/Next install `@rs-x/react`, Vue installs `@rs-x/vue`).',
      ],
    },
    {
      title: '5) VS Code extension features and fallback',
      paragraphs: [
        'The rs-x VS Code extension enables RS-X expression IntelliSense and diagnostics in TypeScript/JavaScript files. It also wires the `@rs-x/typescript-plugin` so expression errors show inside the editor.',
        'If automatic VSIX installation fails, verify the `code` CLI command is available, rerun `rsx install vscode --force`, or install the VSIX manually with `code --install-extension`.',
        '`rsx doctor` is also a good first step when linked/local package setups behave strangely, because it now warns when multiple installed `@rs-x/*` versions are detected inside the current project.',
      ],
    },
    {
      title: '6) Build and validate with rs-x tooling',
      paragraphs: [
        '`rsx build` runs the RS-X transform-aware compilation pipeline.',
        'Use `--prod` with the `build` section in `rsx.config.json` for generated AOT artifacts (preparse/compiled/registration).',
        'Compiled generation is controlled per expression by `rsx(expression, { compiled: true | false })` (default `true`).',
        '`rsx typecheck` adds RS-X semantic validation on top of TypeScript checks for safer CI gates.',
      ],
    },
    {
      title: '7) Add expressions interactively',
      paragraphs: [
        '`rsx add` walks you through creating or updating expression files without hand-writing the initial boilerplate.',
        'The first prompt is now an explicit mode choice: create a new one-file expression, create a new expression with a separate model, or update an existing expression file.',
        'The default flow keeps the model and expression in the same file, which is usually the simplest starting point.',
        "It also asks for the initial expression string up front, defaulting to `'a'`, so the generated file is closer to what you actually want to evaluate.",
        'When the expression contains simple top-level identifiers such as `price * quantity`, the generated model is seeded with those keys to reduce follow-up editing.',
        'If you choose to update an existing file, the CLI shows matching RS-X expression files from the selected directory first, then falls back to the wider project only when needed.',
        'That wider-project fallback prefers likely source roots such as `src/`, `app/`, and `expressions/` before showing less relevant matches elsewhere in the repository.',
        'You can configure those defaults in `rsx.config.json` under `cli.add`.',
        'You can still opt into a separate model file or reuse an existing model file when that better matches the structure of your app.',
      ],
    },
    {
      title: '8) Build configuration',
      paragraphs: [
        'You can configure the build pipeline in `rsx.config.json` under `build`.',
        'Starter flows now generate `rsx.config.json` so CLI-specific settings and build settings live in one place.',
        <SyntaxCodeBlock
          key="build-config-code"
          code={buildConfigurationCode}
        />,
        <div key="build-config-table" className="tableWrap">
          <table
            className="docsTable"
            style={{ tableLayout: 'fixed', width: '100%' }}
          >
            <thead>
              <tr>
                <th>Option</th>
                <th>What it does</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="codeInline">preparse</span>
                </td>
                <td>
                  Enables generation of the preparsed AST cache during{' '}
                  <span className="codeInline">rsx build --prod</span>.
                </td>
              </tr>
              <tr>
                <td>
                  <span className="codeInline">preparseFile</span>
                </td>
                <td>Path for the generated preparsed AST cache module.</td>
              </tr>
              <tr>
                <td>
                  <span className="codeInline">compiled</span>
                </td>
                <td>
                  Enables generation of the compiled-expression plan cache.
                </td>
              </tr>
              <tr>
                <td>
                  <span className="codeInline">compiledFile</span>
                </td>
                <td>Path for the generated compiled-plan cache module.</td>
              </tr>
              <tr>
                <td>
                  <span className="codeInline">registrationFile</span>
                </td>
                <td>
                  Path for the generated registration module that loads the AOT
                  outputs into the runtime cache.
                </td>
              </tr>
              <tr>
                <td>
                  <span className="codeInline">compiledResolvedEvaluator</span>
                </td>
                <td>
                  Controls whether the compiled AOT output also embeds the
                  resolved-dependency evaluator function. When{' '}
                  <span className="codeInline">false</span>, runtime still uses
                  compiled plans, but more dependency resolution stays in the
                  shared runtime path. When{' '}
                  <span className="codeInline">true</span>, more of that work is
                  pushed into the generated compiled evaluator.
                  <br />
                  <br />
                  Tradeoff:
                  <br />- <span className="codeInline">true</span>: less runtime
                  indirection and potentially faster compiled evaluation paths,
                  but larger generated output and a more aggressive AOT build.
                  <br />- <span className="codeInline">false</span>: smaller
                  generated output and simpler build artifacts, but more of the
                  dependency-resolution work stays in shared runtime code.
                </td>
              </tr>
            </tbody>
          </table>
        </div>,
      ],
    },
    {
      title: '9) Full command reference',
      paragraphs: [
        'Use `rsx help` or `rsx help <command>` to print command-specific usage at any time.',
        'The command matrix below is the complete current surface of the CLI.',
      ],
    },
    {
      title: '10) CLI configuration (rsx.config.json)',
      paragraphs: [
        'The CLI reads `rsx.config.json` from the project root for build and interactive workflow defaults.',
        'Both the `build` section (tsconfig path, AOT output paths, preparse/compiled flags) and the `cli` section (package manager, install tag, add defaults) live in the same file.',
        '`rsx init`, `rsx setup`, and `rsx project` generate a starter `rsx.config.json` automatically.',
        'The CLI validates the file at runtime. The VS Code extension contributes a JSON schema for editor validation and completions.',
        <span key="config-link">
          See the{' '}
          <a className="cardLink" href="/docs/core-concepts/rsx-config">
            rsx.config.json reference
          </a>{' '}
          for a description of every field, its type, default, and when to use
          it.
        </span>,
      ],
      code: cliConfigurationCode,
      codeLanguage: 'json',
    },
  ],
  examples: [
    {
      title: 'Init vs Setup vs Project',
      description:
        'Choose the right command depending on whether you are wiring an existing app or scaffolding a new starter.',
      code: initSetupProjectCode,
    },
    {
      title: 'Command Reference',
      description:
        'Complete command surface including framework variants and build/typecheck flags.',
      code: commandReferenceCode,
    },
    {
      title: 'Install CLI',
      description:
        'Install the CLI locally so `rsx` commands are available in your project scripts.',
      code: installCliCode,
    },
    {
      title: 'Bootstrap Existing Project',
      description:
        'Use `init` when you already have an app and want rs-x package/bootstrap setup.',
      code: bootstrapExistingProjectCode,
    },
    {
      title: 'Create Template Project',
      description:
        'Generate a new RS-X-ready app directly from CLI templates (full names or short aliases).',
      code: createTemplateProjectCode,
    },
    {
      title: 'Framework Setup',
      description:
        'Apply framework-specific integration in an existing app repository.',
      code: setupIntegrationCode,
    },
    {
      title: 'Install VS Code Extension',
      description:
        'Install or reinstall the RS-X VS Code extension from marketplace or local VSIX.',
      code: installVsCodeCode,
    },
    {
      title: 'VSIX Failure Recovery',
      description:
        'If postinstall or install command cannot apply the VSIX, use this fallback flow.',
      code: vscodeInstallRecoveryCode,
    },
    {
      title: 'Install Compiler Tooling',
      description: 'Install RS-X compiler packages into your current project.',
      code: installCompilerCode,
    },
    {
      title: 'Doctor and Add',
      description:
        'Run diagnostics and use the improved add flow, which defaults to one-file expressions and can update existing RS-X files.',
      code: doctorAndAddCode,
    },
    {
      title: 'Build and Typecheck',
      description: 'Run rs-x build and semantic checks locally or in CI.',
      code: buildAndTypecheckCode,
    },
    {
      title: 'Help and Version',
      description: 'Inspect command help and print the current CLI version.',
      code: helpAndVersionCode,
    },
  ],
  related: [
    {
      href: '/docs/core-concepts/rsx-config',
      title: 'rsx.config.json',
      meta: 'Full reference for every build and CLI config field',
    },
    {
      href: '/docs/core-concepts/compiler',
      title: 'Compiler',
      meta: 'How rsx build preparse/compiled/lazy options affect runtime',
    },
    {
      href: '/docs/core-concepts/dependency-injection',
      title: 'Dependency injection',
      meta: 'How runtime services are composed and overridden',
    },
    {
      href: '/docs/frameworks/react',
      title: 'React integration',
      meta: 'UseRsx hooks and React integration details',
    },
    {
      href: '/docs/frameworks/angular',
      title: 'Angular integration',
      meta: 'Pipes/providers and Angular usage patterns',
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
