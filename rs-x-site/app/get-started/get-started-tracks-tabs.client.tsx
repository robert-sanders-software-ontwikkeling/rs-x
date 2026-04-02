'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { type ITabItem, Tabs } from '@rs-x/react-components';

import { SyntaxCodeBlock } from '../../components/SyntaxCodeBlock';

type Track = {
  value: string;
  label: string;
  title: string;
  description: string;
  steps: React.ReactNode[];
  commands: string;
  docsHref?: string;
  docsLabel?: string;
};

const tracks: readonly Track[] = [
  {
    value: 'existing',
    label: 'Existing project',
    title: 'Add rs-x to an existing project',
    description:
      'Best if you already have an app and want rs-x setup with minimal changes.',
    steps: [
      <>
        Install the CLI in your project. See the{' '}
        <Link href="/docs/core-concepts/cli">CLI page</Link>.
      </>,
      'Run `rsx setup` to auto-detect the framework and apply the right integration.',
      'Run build/typecheck to verify setup.',
    ],
    commands: [
      '# 1) Install CLI (local)',
      'npm install -D @rs-x/cli',
      '',
      '# 2) Auto-detect framework and setup',
      'npx rsx setup',
      '',
      '# 3) Verify',
      'npx rsx typecheck --project tsconfig.json',
      'npx rsx build --project tsconfig.json --prod',
    ].join('\n'),
  },
  {
    value: 'react',
    label: 'React',
    title: 'Create a new React project',
    description:
      'Creates a Vite + React + TypeScript starter and applies rs-x React integration.',
    steps: [
      'Install the CLI in your project or use npx.',
      'Generate the project from the React template.',
      'Start the dev server.',
      <>
        Open the <Link href="/docs/frameworks/react">React framework docs</Link>{' '}
        for integration patterns, including `useRsxExpression` and
        `useRsxModel`.
      </>,
    ],
    commands: [
      '# 1) Install CLI (optional when using npx)',
      'npm install -D @rs-x/cli',
      '',
      '# 2) Generate project',
      'npx rsx project react --name my-rsx-react-app',
      '',
      '# 3) Enter project directory',
      'cd my-rsx-react-app',
      '',
      '# 4) Start dev server',
      'npm run dev',
      '# Verify: app loads without errors in terminal/browser.',
    ].join('\n'),
    docsHref: '/docs/frameworks/react',
    docsLabel: 'Open React framework docs',
  },
  {
    value: 'angular',
    label: 'Angular',
    title: 'Create a new Angular project',
    description:
      'Generates an Angular starter and includes rs-x Angular setup and dependencies.',
    steps: [
      'Install the CLI in your project or use npx.',
      'Generate the project from the Angular template.',
      'Start the Angular dev server.',
      'Create your first template binding with the `rsx` pipe.',
      <>
        Open the{' '}
        <Link href="/docs/frameworks/angular">Angular framework docs</Link> for
        integration details.
      </>,
    ],
    commands: [
      '# 1) Install CLI (optional when using npx)',
      'npm install -D @rs-x/cli',
      '',
      '# 2) Generate project',
      'npx rsx project angular --name my-rsx-angular-app',
      '',
      '# 3) Enter project directory',
      'cd my-rsx-angular-app',
      '',
      '# 4) Start dev server',
      'npm start',
      '# Verify: app loads without errors in terminal/browser.',
      '',
      '# 5) First Angular binding (@rs-x/angular pipe)',
      "{{ 'a + b' | rsx: model }}",
    ].join('\n'),
    docsHref: '/docs/frameworks/angular',
    docsLabel: 'Open Angular framework docs',
  },
  {
    value: 'vue',
    label: 'Vue',
    title: 'Create a new Vue project',
    description:
      'Creates a Vue + TypeScript starter and wires rs-x setup with an `@rs-x/vue` example.',
    steps: [
      'Install the CLI in your project or use npx.',
      'Generate the project from the Vue template.',
      'Start the dev server.',
      'Review the generated @rs-x/vue example in the starter app.',
    ],
    commands: [
      '# 1) Install CLI (optional when using npx)',
      'npm install -D @rs-x/cli',
      '',
      '# 2) Generate project',
      'npx rsx project vuejs --name my-rsx-vue-app',
      '',
      '# 3) Enter project directory',
      'cd my-rsx-vue-app',
      '',
      '# 4) Start dev server',
      'npm run dev',
      '# Verify: app loads without errors in terminal/browser.',
      '',
      '# 5) Review generated example (uses @rs-x/vue)',
      '# src/App.vue',
    ].join('\n'),
  },
  {
    value: 'next',
    label: 'Next.js',
    title: 'Create a new Next.js project',
    description:
      'Generates a Next.js starter with rs-x setup and webpack integration.',
    steps: [
      'Install the CLI in your project or use npx.',
      'Generate the project from the Next.js template.',
      'Start the dev server.',
      'Use the generated app-router integration as your baseline pattern.',
    ],
    commands: [
      '# 1) Install CLI (optional when using npx)',
      'npm install -D @rs-x/cli',
      '',
      '# 2) Generate project',
      'npx rsx project nextjs --name my-rsx-next-app',
      '',
      '# 3) Enter project directory',
      'cd my-rsx-next-app',
      '',
      '# 4) Start dev server',
      'npm run dev',
      '# Verify: app loads without errors in terminal/browser.',
      '',
      '# 5) Review generated integration',
      '# app/layout.tsx',
    ].join('\n'),
  },
  {
    value: 'node',
    label: 'Node.js',
    title: 'Create a new Node.js project',
    description:
      'Creates a framework-agnostic TypeScript starter for backend/services usage.',
    steps: [
      'Install the CLI in your project or use npx.',
      'Generate the Node.js template project.',
      'Build once.',
      'Run the app.',
    ],
    commands: [
      '# 1) Install CLI (optional when using npx)',
      'npm install -D @rs-x/cli',
      '',
      '# 2) Generate project',
      'npx rsx project nodejs --name my-rsx-node-app',
      '',
      '# 3) Enter project directory',
      'cd my-rsx-node-app',
      '',
      '# 4) Build and run',
      'npm run build',
      'npm run start',
    ].join('\n'),
  },
];

export function GetStartedTracksTabs(): React.ReactElement {
  const [activeTrack, setActiveTrack] = useState<string>(
    tracks[0]?.value ?? '',
  );
  const tabItems = useMemo<ITabItem<string>[]>(() => {
    return tracks.map((track) => ({ value: track.value, label: track.label }));
  }, []);

  const active =
    tracks.find((track) => track.value === activeTrack) ?? tracks[0];

  return (
    <article className="card docsApiCard">
      <h2 className="cardTitle">Choose your setup path</h2>
      <p className="cardText">
        Pick your framework (or existing project) and follow the exact steps.
      </p>

      <div className="docsApiTabbedShell">
        <Tabs
          unstyled
          ariaLabel="Get started framework tabs"
          persistKey="get-started.track"
          items={tabItems}
          value={activeTrack}
          onValueChange={setActiveTrack}
          listClassName="docsApiPackageTabs"
          tabClassName="docsApiPackageTab"
          activeTabClassName="isActive"
          labelClassName="docsApiPackageTabLabel"
        />

        <div className="docsApiTabBody">
          <h3 className="docsApiTabHeading">{active.title}</h3>
          <p className="cardText">{active.description}</p>
          <ol className="advancedTopicList">
            {active.steps.map((step, index) => (
              <li key={`${active.value}-step-${index}`}>{step}</li>
            ))}
          </ol>
          <SyntaxCodeBlock code={active.commands} />
          {active.docsHref ? (
            <p className="cardText">
              <Link href={active.docsHref}>
                {active.docsLabel ?? 'Open framework docs'}
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
