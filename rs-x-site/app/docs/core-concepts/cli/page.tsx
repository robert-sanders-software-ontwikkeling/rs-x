import dedent from 'dedent';
import type { Metadata } from 'next';

import { SyntaxCodeBlock } from '../../../../components/SyntaxCodeBlock';
import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../_template/core-concept-page';

const installCliCode = dedent`
  # Global (required)
  # npm
  npm install -g @rs-x/cli

  # pnpm
  pnpm add -g @rs-x/cli

  # yarn
  yarn global add @rs-x/cli

  # bun
  bun add -g @rs-x/cli

  # Prerelease (next) - global
  npm install -g @rs-x/cli@next
  pnpm add -g @rs-x/cli@next
  yarn global add @rs-x/cli@next
  bun add -g @rs-x/cli@next
`;

const bootstrapExistingProjectCode = dedent`
  # Auto-detect framework and wire bootstrap
  rsx init

  # Or force a specific entry file
  rsx init --entry src/main.ts
`;

const createTemplateProjectCode = dedent`
  # Full template names
  rsx project angular --name my-rsx-angular-app
  rsx project vuejs --name my-rsx-vue-app
  rsx project react --name my-rsx-react-app
  rsx project nextjs --name my-rsx-next-app
  rsx project nodejs --name my-rsx-node-app

  # Short aliases
  rsx project a --name my-rsx-angular-app
  rsx project v --name my-rsx-vue-app
  rsx project r --name my-rsx-react-app
  rsx project nx --name my-rsx-next-app
  rsx project js --name my-rsx-node-app
`;

const initIntegrationCode = dedent`
  # Auto-detect framework and apply integration
  rsx init --verify
`;

const buildAndTypecheckCode = dedent`
  # Build with RS-X transform
  rsx build --project tsconfig.json

  # Production profile (AOT preparse/compiled outputs when configured)
  rsx build --project tsconfig.json --prod

  # TypeScript + RS-X semantic checks
  rsx typecheck --project tsconfig.json
`;

const lazyGroupUsageCode = dedent`
  import { rsx } from '@rs-x/expression-parser';

  // All Page1 expressions are bundled into one payload file.
  // That file is only downloaded when any Page1 expression is first used.
  // Setting lazyGroup implicitly sets lazy: true — no need to add it separately.
  rsx<number>('price * quantity', { lazyGroup: 'Page1' })(model);
  rsx<string>('user.firstName + " " + user.lastName', { lazyGroup: 'Page1' })(model);

  // A separate group file for Page2 expressions.
  rsx<boolean>('total > budget', { lazyGroup: 'Page2' })(model);

  // Ungrouped lazy expression — lands in the shared lazy payload file.
  rsx<number>('a + b', { lazy: true })(model);
`;

const lazyGroupOutputCode = dedent`
  # rsx build --prod emits one .mjs file per lazyGroup into public/rsx-generated/
  # plus the shared ungrouped payload and the manifest:

  public/rsx-generated/
    rsx-aot-lazy-group-Page1.generated.mjs   # Page1 group payload
    rsx-aot-lazy-group-Page2.generated.mjs   # Page2 group payload
    rsx-aot-lazy.generated.mjs               # ungrouped lazy expressions

  src/rsx-generated/
    rsx-aot-lazy-manifest.generated.ts       # registers all group loaders at startup
    rsx-aot-preparsed.generated.ts
    rsx-aot-compiled.generated.ts
    rsx-aot-registration.generated.ts        # imported in main.ts; loads all of the above
`;

const lazyGroupAngularCode = dedent`
  // In Angular: lazyGroup expressions are typically placed inside
  // lazy-loaded route components. The group payload is downloaded
  // when the component is first rendered — not at app startup.

  // page1.component.ts
  import { rsx } from '@rs-x/expression-parser';

  const page1Price = rsx<number>('price * qty', { lazyGroup: 'Page1' });

  @Component({ ... })
  export class Page1Component {
    result$ = page1Price(this.model);
  }

  // page2.component.ts
  const page2Check = rsx<boolean>('total > budget', { lazyGroup: 'Page2' });

  @Component({ ... })
  export class Page2Component {
    result$ = page2Check(this.model);
  }
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

const commandReferenceCode = dedent`
  rsx help [command]
  rsx doctor
  rsx install vscode [--force] [--local] [--dry-run]
  rsx install compiler [--pm <pnpm|npm|yarn|bun>] [--next] [--dry-run]
  rsx init [--pm <pnpm|npm|yarn|bun>] [--entry <path>] [--next] [--skip-install] [--skip-vscode] [--verify] [--force] [--local] [--dry-run]
  rsx project <angular|a|vuejs|v|react|r|nextjs|nx|nodejs|js> [--name <n>] [--template <...>] [--pm <pnpm|npm|yarn|bun>] [--next] [--skip-install] [--skip-vscode] [--verify] [--dry-run]
  rsx build [--project <tsconfig>] [--out-dir <path>] [--prod] [--no-emit] [--aot-preparse <true|false>] [--aot-preparse-file <path>] [--aot-compiled <true|false>] [--aot-compiled-file <path>] [--compiled-resolved-evaluator <true|false>] [--dry-run]
  rsx typecheck [--project <tsconfig>] [--dry-run]
  rsx version | v | -v | --version
`;

const installVsCodeCode = dedent`
  # Marketplace install
  rsx install vscode

  # Reinstall
  rsx install vscode --force

  # Build/install local VSIX from repository workspace
  rsx install vscode --local --force
`;

const vscodeInstallRecoveryCode = dedent`
  # 1) Check VS Code CLI is available
  code --version

  # 2) Retry install through rsx
  rsx install vscode --force

  # 3) If needed, install VSIX manually
  code --install-extension "/absolute/path/to/rs-x-vscode-extension-<version>.vsix"

  # 4) Optional: disable postinstall auto-install in CI or restricted environments
  RSX_SKIP_VSCODE_EXTENSION_INSTALL=true
`;

const installCompilerCode = dedent`
  rsx install compiler
  rsx install compiler --next
  rsx install compiler --pm pnpm
`;

const doctorAndAddCode = dedent`
  # Environment diagnostics
  rsx doctor

  # Install the editor UI that creates expressions
  rsx install vscode
`;

const initProjectCode = dedent`
  # init: auto-detect the framework and apply integration in the current app
  rsx init

  # project: scaffold a full RS-X starter
  rsx project react --name my-rsx-react-app
`;

const helpAndVersionCode = dedent`
  rsx help
  rsx help build
  rsx help project
  rsx v
  rsx version
  rsx --version
`;

const helpAndVersionReferenceCode = dedent`
  rsx help [command]
  rsx version
  rsx v
  rsx -v
  rsx --version
`;

const doctorReferenceCode = dedent`
  rsx doctor
`;

const expressionPanelReferenceCode = dedent`
  # VS Code
  # RS-X Expressions panel -> Add RS-X Expression
`;

const installVsCodeReferenceCode = dedent`
  rsx install vscode [--force] [--local] [--dry-run]
`;

const installCompilerReferenceCode = dedent`
  rsx install compiler [--pm <pnpm|npm|yarn|bun>] [--next] [--dry-run]
`;

const initReferenceCode = dedent`
  rsx init [--pm <pnpm|npm|yarn|bun>] [--entry <path>] [--next] [--skip-install] [--skip-vscode] [--verify] [--force] [--local] [--dry-run]
`;

const projectReferenceCode = dedent`
  rsx project [angular|vuejs|react|nextjs|nodejs] [--name <project-name>] [--pm <pnpm|npm|yarn|bun>] [--next] [--template <angular|vuejs|react|nextjs|nodejs>] [--tarballs-dir <path>] [--skip-install] [--skip-vscode] [--verify] [--dry-run]
`;

const buildReferenceCode = dedent`
  rsx build [--project <path-to-tsconfig>] [--out-dir <path>] [--prod] [--no-emit] [--aot-preparse <true|false>] [--aot-preparse-file <path>] [--aot-compiled <true|false>] [--aot-compiled-file <path>] [--compiled-resolved-evaluator <true|false>] [--dry-run]
`;

const typecheckReferenceCode = dedent`
  rsx typecheck [--project <path-to-tsconfig>] [--dry-run]
`;

const doc: CoreConceptDoc = {
  title: 'CLI',
  lead: 'Use the RS-X CLI to diagnose environments, create projects, wire framework bootstrap, install tooling, and run rs-x-aware build/typecheck workflows.',
  whatItMeans:
    'The RS-X CLI is the main way to set up and operate RS-X in an application. Instead of manually wiring bootstrap files, transforms, and scripts, you run clear commands (`init`, `project`, `build`, `typecheck`) that apply the same integration steps every time.',
  whyItMatters:
    'Using the CLI simplifies setup and speeds up initial development and keeps configuration consistent. Teams get the same project structure, bootstrap wiring, build flags, and diagnostics flow across Angular, Vue, React, Next.js, and Node.js projects.',
  keyPoints: [
    'Every primary CLI command is covered here (`doctor`, `add`, `install`, `init`, `project`, `build`, `typecheck`, `version`).',
    'Install once (`@rs-x/cli`) and use `rsx` commands directly in your terminal or package scripts.',
    'Use `rsx init` for existing projects when you want automatic framework detection, bootstrap wiring, and integration.',
    'Use `rsx project <template>` to create a full starter with RS-X already integrated.',
    'Use `rsx build` and `rsx typecheck` in CI to enforce RS-X compile and expression semantics.',
    'Use `lazyGroup` on `rsx()` calls to split expressions into on-demand payload files — setting `lazyGroup` implicitly enables `lazy: true`.',
  ],
  deepDive: [
    {
      title: '1) Install the CLI',
      paragraphs: [
        'Install `@rs-x/cli` globally so the `rsx` command is available on PATH in your terminal.',
      ],
      code: installCliCode,
    },
    {
      title: '2) Initialize an existing app',
      paragraphs: [
        '`rsx init` auto-detects framework context and applies the matching integration flow.',
        'That includes package installation, bootstrap wiring, writing `rsx.config.json`, and adding `build:rsx` / `typecheck:rsx` scripts where the framework integration needs them.',
        '`rsx init` and `rsx project` both create an `rsx.config.json` file with default build and CLI settings that you can override later.',
        'Use `--verify` with `rsx init` when you want an explicit post-mutation sanity check of the resulting files and scripts.',
        '`rsx project` goes further: it creates a new app and verifies the generated starter structure before reporting success. `--verify` can be passed when you want that verification step to be explicit in the command you run.',
      ],
    },
    {
      title: '3) What the CLI installs',
      paragraphs: [
        'Installing `@rs-x/cli` adds the `rsx` command. During package postinstall, the CLI also attempts to install the bundled rs-x VS Code extension automatically when `code` is available on PATH.',
        '`rsx init` installs runtime packages (`@rs-x/core`, `@rs-x/state-manager`, `@rs-x/expression-parser`) and compiler tooling (`@rs-x/compiler`, `@rs-x/typescript-plugin`), then applies framework-specific integration for Angular, React, Next.js, and Vue when detected.',
        'Framework integration installs framework-specific packages when needed (for example `@rs-x/angular` for Angular, `@rs-x/react` for React/Next.js, and `@rs-x/vue` for Vue).',
        '`rsx init` and `rsx project` do not automatically install the VS Code extension. Use `rsx install vscode` when you want to apply the bundled VSIX manually.',
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
        'Create or append expressions from the RS-X Expressions panel in VS Code instead of using a CLI scaffolder.',
        'Use the Add RS-X Expression action in the panel title bar to choose whether to create a new `.rsx` file or append to an existing one.',
        "The flow prompts for the expression export name and the initial expression body, defaulting to `'a'`.",
        'When the expression contains simple top-level identifiers such as `price * quantity`, the generated model header is seeded with those fields to reduce follow-up editing.',
        'New files default to `src/expressions`, or the `cli.add.defaultDirectory` value from `rsx.config.json` when configured.',
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
                  <div style={{ marginTop: 12 }}>Tradeoff:</div>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                    <li>
                      <span className="codeInline">true</span>: less runtime
                      indirection and potentially faster compiled evaluation
                      paths, but larger generated output and a more aggressive
                      AOT build.
                    </li>
                    <li>
                      <span className="codeInline">false</span>: smaller
                      generated output and simpler build artifacts, but more of
                      the dependency-resolution work stays in shared runtime
                      code.
                    </li>
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
        </div>,
      ],
    },
    {
      title: '9) Lazy group code splitting',
      paragraphs: [
        'Passing `lazyGroup` to an `rsx()` call assigns that expression to a named code-split group. All expressions sharing the same group name are bundled into a single `.mjs` payload file that the browser only downloads when an expression from that group is first used.',
        'Setting `lazyGroup` implicitly enables `lazy: true`. You do not need to set both.',
        <SyntaxCodeBlock key="lazy-group-usage" code={lazyGroupUsageCode} />,
        'During `rsx build --prod`, the CLI emits one `.mjs` file per group into `public/rsx-generated/`, plus a shared payload for ungrouped lazy expressions and a manifest file that registers all group loaders at app startup:',
        <SyntaxCodeBlock key="lazy-group-output" code={lazyGroupOutputCode} />,
        <div key="lazy-group-table" className="tableWrap">
          <table
            className="docsTable"
            style={{ tableLayout: 'fixed', width: '100%' }}
          >
            <thead>
              <tr>
                <th>File</th>
                <th>What it contains</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <span className="codeInline">
                    rsx-aot-lazy-group-{'{'}GroupName{'}'}.generated.mjs
                  </span>
                </td>
                <td>
                  All preparsed ASTs and compiled evaluators for that group. One
                  file per unique <span className="codeInline">lazyGroup</span>{' '}
                  value. Served as a static asset from{' '}
                  <span className="codeInline">public/</span>.
                </td>
              </tr>
              <tr>
                <td>
                  <span className="codeInline">rsx-aot-lazy.generated.mjs</span>
                </td>
                <td>
                  All expressions marked{' '}
                  <span className="codeInline">{'{ lazy: true }'}</span> without
                  a <span className="codeInline">lazyGroup</span>. Downloaded
                  when any ungrouped lazy expression is first used.
                </td>
              </tr>
              <tr>
                <td>
                  <span className="codeInline">
                    rsx-aot-lazy-manifest.generated.ts
                  </span>
                </td>
                <td>
                  Registers a dynamic-import loader for every group and for the
                  shared lazy payload. Imported by the registration file so all
                  loaders are ready before the first expression is evaluated.
                </td>
              </tr>
            </tbody>
          </table>
        </div>,
        'Group names are sanitized for the file system: non-alphanumeric characters are replaced with `-`. Expressions from different source files can share the same group name — they will all land in the same payload file.',
        'The payload files are plain JavaScript (`.mjs`) with no bare npm specifiers. Registration functions are injected by the manifest at runtime, so the files can be fetched and executed directly by the browser without a bundler or import map.',
        "When an expression from a group is first evaluated, the runtime calls `startLazyGroupPreload`, which fires the dynamic import for that group's `.mjs` file and resolves the preparsed ASTs and compiled plans into the expression cache. Subsequent evaluations in the same group reuse the in-flight or already-resolved result.",
        'The recommended pattern for Angular is to place `lazyGroup` expressions inside lazy-loaded route components. The group payload is only fetched when the route is first activated:',
        <SyntaxCodeBlock
          key="lazy-group-angular"
          code={lazyGroupAngularCode}
        />,
      ],
    },
    {
      title: '10) Full command reference',
      paragraphs: [
        'Use `rsx help` or `rsx help <command>` to print command-specific usage at any time.',
        'The command matrix below is the complete current surface of the CLI.',
      ],
    },
    {
      title: '11) CLI configuration (rsx.config.json)',
      paragraphs: [
        'The CLI reads `rsx.config.json` from the project root for build and interactive workflow defaults.',
        'Both the `build` section (tsconfig path, AOT output paths, preparse/compiled flags) and the `cli` section (package manager, install tag, add defaults) live in the same file.',
        '`rsx init` and `rsx project` generate a starter `rsx.config.json` automatically.',
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
    {
      title: '12) Help and version',
      paragraphs: [
        'Use `rsx help` to print the main command list, or `rsx help <command>` to print command-specific usage and flags.',
        'Use `rsx version`, `rsx v`, `rsx -v`, or `rsx --version` to print the current CLI version.',
        'This is the quickest way to confirm which command surface is available in the installed CLI before following docs or examples.',
      ],
      code: helpAndVersionReferenceCode,
    },
    {
      title: '13) doctor',
      paragraphs: [
        '`rsx doctor` runs environment checks before you mutate a project.',
        'It validates Node.js >= 20, the VS Code CLI (`code`), and the presence of a supported package manager (`pnpm`, `npm`, `yarn`, or `bun`).',
        'Use it first when installs, editor integration, or local linking behave unexpectedly.',
      ],
      code: doctorReferenceCode,
    },
    {
      title: '14) expression panel add flow',
      paragraphs: [
        'Expression creation now lives in the VS Code RS-X Expressions panel.',
        'The Add RS-X Expression action creates module-style `.rsx` expression blocks and can append to an existing `.rsx` file.',
        'It respects `rsx.config.json` under `cli.add.defaultDirectory` for the default new-file location.',
      ],
      code: expressionPanelReferenceCode,
    },
    {
      title: '15) install vscode',
      paragraphs: [
        'Use `rsx install vscode` to install the bundled RS-X VS Code extension manually.',
        '`--force` reinstalls the extension even if it is already present.',
        '`--local` builds or installs the VSIX from the local repository workspace instead of using the normal packaged path. This is mainly useful while developing RS-X locally.',
        '`--dry-run` prints the install actions without executing them.',
      ],
      code: installVsCodeReferenceCode,
    },
    {
      title: '16) install compiler',
      paragraphs: [
        'Use `rsx install compiler` when you only want to install the RS-X compiler tooling into the current project.',
        '`--pm` forces the package manager instead of letting the CLI infer it from the project.',
        '`--next` installs prerelease builds from the `next` dist-tag.',
        '`--dry-run` prints the package install plan without mutating the project.',
      ],
      code: installCompilerReferenceCode,
    },
    {
      title: '17) init',
      paragraphs: [
        '`rsx init` is the main command for integrating RS-X into an existing app.',
        'It auto-detects the framework context, installs runtime and compiler packages, wires bootstrap, writes `rsx.config.json`, and applies framework-specific integration for Angular, React, Next.js, and Vue when detected.',
        '`--pm` forces the package manager. `--entry` forces the application entry file when automatic detection is wrong or ambiguous.',
        '`--next` installs prerelease package versions. `--skip-install` skips package installation when you only want to apply file mutations. `--skip-vscode` is accepted for compatibility but does not change current behavior because VS Code is not auto-installed.',
        '`--verify` runs a post-mutation sanity check. `--dry-run` prints the plan without writing files. `--force` and `--local` are accepted compatibility flags alongside the shared CLI option surface.',
      ],
      code: initReferenceCode,
    },
    {
      title: '18) project',
      paragraphs: [
        '`rsx project` scaffolds a brand-new starter project instead of mutating an existing one.',
        'It supports `angular`, `vuejs`, `react`, `nextjs`, and `nodejs`, plus their short aliases shown in the examples on this page.',
        '`--name` sets the target folder and package name. `--template` selects the template explicitly when you do not want to rely on the positional framework name or interactive prompt.',
        '`--pm`, `--next`, `--skip-install`, and `--skip-vscode` behave the same way they do in the rest of the CLI.',
        '`--tarballs-dir` points the scaffold at a directory of local `*.tgz` RS-X packages, which is useful while testing unpublished builds. `--verify` re-runs starter checks explicitly after generation. `--dry-run` prints the actions without creating files.',
      ],
      code: projectReferenceCode,
    },
    {
      title: '19) build',
      paragraphs: [
        '`rsx build` runs the RS-X-aware compilation pipeline for a TypeScript project.',
        '`--project` selects the tsconfig file. `--out-dir` overrides the output directory for the build.',
        '`--prod` enables the production profile and the configured AOT outputs. `--no-emit` performs the analysis without writing JavaScript output.',
        '`--aot-preparse` and `--aot-preparse-file` control generation of the preparse cache module. `--aot-compiled` and `--aot-compiled-file` control generation of the compiled-expression cache module.',
        '`--compiled-resolved-evaluator` controls whether the compiled AOT output also embeds the resolved-dependency evaluator function. `--dry-run` prints the build plan without emitting files.',
        'When `preparse` is enabled and any expression uses `lazyGroup`, `rsx build --prod` also emits one `.mjs` payload file per group and an updated lazy manifest. No extra flags are needed — lazy group files are generated automatically.',
      ],
      code: buildReferenceCode,
    },
    {
      title: '20) typecheck',
      paragraphs: [
        '`rsx typecheck` validates both TypeScript correctness and RS-X expression semantics without emitting build output.',
        '`--project` selects the tsconfig file to analyze.',
        '`--dry-run` prints the typecheck plan without executing the full run.',
        'Use this command in CI when you want semantic RS-X failures to block merges even if you are not producing JavaScript output in the same step.',
      ],
      code: typecheckReferenceCode,
    },
  ],
  examples: [
    {
      title: 'Init vs Project',
      description:
        'Choose the right command depending on whether you are wiring an existing app or scaffolding a new starter.',
      code: initProjectCode,
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
        'Install the CLI globally so `rsx` commands are available on PATH.',
      code: installCliCode,
    },
    {
      title: 'Bootstrap Existing Project',
      description:
        'Use `init` when you already have an app and want rs-x packages, bootstrap wiring, and framework integration.',
      code: bootstrapExistingProjectCode,
    },
    {
      title: 'Create Template Project',
      description:
        'Generate a new RS-X-ready app directly from CLI templates (full names or short aliases).',
      code: createTemplateProjectCode,
    },
    {
      title: 'Framework Integration',
      description:
        'Apply framework-specific integration in an existing app repository.',
      code: initIntegrationCode,
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
      title: 'Lazy Group — Expression Usage',
      description:
        'Assign expressions to named groups with lazyGroup. Setting lazyGroup implicitly enables lazy: true.',
      code: lazyGroupUsageCode,
    },
    {
      title: 'Lazy Group — Build Output',
      description:
        'rsx build --prod emits one .mjs payload per group into public/rsx-generated/. Each file is downloaded on demand the first time an expression from that group is evaluated.',
      code: lazyGroupOutputCode,
    },
    {
      title: 'Lazy Group — Angular Route Components',
      description:
        'Place lazyGroup expressions inside lazy-loaded Angular route components so each group payload is fetched only when that route activates.',
      code: lazyGroupAngularCode,
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
