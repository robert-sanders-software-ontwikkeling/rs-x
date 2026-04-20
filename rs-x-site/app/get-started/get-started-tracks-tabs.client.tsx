'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

import { type ITabItem, Tabs } from '@rs-x/react-components';

import { SyntaxCodeBlock } from '../../components/SyntaxCodeBlock';

type Track = {
  value: string;
  label: string;
  title: string;
  description: string;
  steps: React.ReactNode[];
  commands: string;
  existingTitle?: string;
  existingDescription?: string;
  existingSteps?: React.ReactNode[];
  existingCommands?: string;
  docsHref?: string;
  docsLabel?: string;
};

const existingProjectSteps: React.ReactNode[] = [
  <>
    Install the CLI globally with npm. See the{' '}
    <Link href="/docs/core-concepts/cli">CLI page</Link>.
  </>,
  'Run `rsx init` to auto-detect the framework and apply the right integration.',
  'Run build/typecheck to verify the integration.',
];

const existingProjectCommands = [
  '# 1) Install CLI (global)',
  'npm install -g @rs-x/cli',
  '',
  '# 2) Auto-detect framework and initialize integration',
  'rsx init',
  '',
  '# 3) Verify',
  'rsx typecheck --project tsconfig.json',
  'rsx build --project tsconfig.json --prod',
].join('\n');

const tracks: readonly Track[] = [
  {
    value: 'react',
    label: 'React',
    title: 'Create a new React project',
    description:
      'Creates a Vite + React + TypeScript starter and applies rs-x React integration.',
    steps: [
      'Install the CLI globally with npm.',
      'Generate the project from the React template.',
      'Start the dev server.',
      <>
        Open the <Link href="/docs/frameworks/react">React framework docs</Link>{' '}
        for integration patterns, including `useRsxExpression` and
        `useRsxModel`. Keep expressions stable: create them at module scope or
        create them with `useMemo`.
      </>,
    ],
    commands: [
      '# 1) Install CLI (global)',
      'npm install -g @rs-x/cli',
      '',
      '# 2) Generate project',
      'rsx project react --name my-rsx-react-app',
      '',
      '# 3) Enter project directory',
      'cd my-rsx-react-app',
      '',
      '# 4) Start dev server',
      'npm run dev',
      '# Verify: app loads without errors in terminal/browser.',
    ].join('\n'),
    existingTitle: 'Initialize existing project',
    existingDescription:
      'Use this path when you already have a React app and want rs-x added with minimal changes.',
    existingSteps: existingProjectSteps,
    existingCommands: existingProjectCommands,
    docsHref: '/docs/frameworks/react',
    docsLabel: 'React docs',
  },
  {
    value: 'angular',
    label: 'Angular',
    title: 'Create a new Angular project',
    description:
      'Generates an Angular starter and includes rs-x Angular integration and dependencies.',
    steps: [
      'Install the CLI globally with npm.',
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
      '# 1) Install CLI (global)',
      'npm install -g @rs-x/cli',
      '',
      '# 2) Generate project',
      'rsx project angular --name my-rsx-angular-app',
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
    existingTitle: 'Initialize existing project',
    existingDescription:
      'Use this path when you already have an Angular app and want rs-x added with minimal changes.',
    existingSteps: existingProjectSteps,
    existingCommands: existingProjectCommands,
    docsHref: '/docs/frameworks/angular',
    docsLabel: 'Angular docs',
  },
  {
    value: 'vue',
    label: 'Vue',
    title: 'Create a new Vue project',
    description:
      'Creates a Vue + TypeScript starter and wires rs-x integration with an `@rs-x/vue` example.',
    steps: [
      'Install the CLI globally with npm.',
      'Generate the project from the Vue template.',
      'Start the dev server.',
      'Review the generated @rs-x/vue example in the starter app.',
    ],
    commands: [
      '# 1) Install CLI (global)',
      'npm install -g @rs-x/cli',
      '',
      '# 2) Generate project',
      'rsx project vuejs --name my-rsx-vue-app',
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
    existingTitle: 'Initialize existing project',
    existingDescription:
      'Use this path when you already have a Vue app and want rs-x added with minimal changes.',
    existingSteps: existingProjectSteps,
    existingCommands: existingProjectCommands,
    docsHref: '/docs/frameworks/vue',
    docsLabel: 'Vue docs',
  },
  {
    value: 'next',
    label: 'Next.js',
    title: 'Create a new Next.js project',
    description:
      'Generates a Next.js starter with rs-x integration and app-router-friendly setup.',
    steps: [
      'Install the CLI globally with npm.',
      'Generate the project from the Next.js template.',
      'Start the dev server.',
      'Use the generated app-router integration as your baseline pattern, and keep useRsxExpression inputs stable by creating expressions at module scope or creating them with useMemo.',
    ],
    commands: [
      '# 1) Install CLI (global)',
      'npm install -g @rs-x/cli',
      '',
      '# 2) Generate project',
      'rsx project nextjs --name my-rsx-next-app',
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
    existingTitle: 'Initialize existing project',
    existingDescription:
      'Use this path when you already have a Next.js app and want rs-x added with minimal changes.',
    existingSteps: existingProjectSteps,
    existingCommands: existingProjectCommands,
    docsHref: '/docs/frameworks/nextjs',
    docsLabel: 'Next.js integration',
  },
  {
    value: 'node',
    label: 'Node.js',
    title: 'Create a new Node.js project',
    description:
      'Creates a framework-agnostic TypeScript starter for backend/services usage.',
    steps: [
      'Install the CLI globally with npm.',
      'Generate the Node.js template project.',
      'Build once.',
      'Run the app.',
    ],
    commands: [
      '# 1) Install CLI (global)',
      'npm install -g @rs-x/cli',
      '',
      '# 2) Generate project',
      'rsx project nodejs --name my-rsx-node-app',
      '',
      '# 3) Enter project directory',
      'cd my-rsx-node-app',
      '',
      '# 4) Build and run',
      'npm run build',
      'npm run start',
    ].join('\n'),
    existingTitle: 'Initialize existing project',
    existingDescription:
      'Use this path when you already have a Node.js project and want rs-x added with minimal changes.',
    existingSteps: existingProjectSteps,
    existingCommands: existingProjectCommands,
    docsHref: '/docs/core-concepts/first-expression',
    docsLabel: 'First expression guide',
  },
];

function GetStartedTracksTabsInner(): React.ReactElement {
  const searchParams = useSearchParams();
  const trackParam = searchParams.get('track');
  const resolvedTrack =
    (trackParam && tracks.find((t) => t.value === trackParam)?.value) ??
    tracks[0]?.value ??
    '';
  const [activeTrack, setActiveTrack] = useState<string>(resolvedTrack);

  useEffect(() => {
    if (resolvedTrack) setActiveTrack(resolvedTrack);
  }, [resolvedTrack]);
  const tabItems = useMemo<ITabItem<string>[]>(() => {
    return tracks.map((track) => ({ value: track.value, label: track.label }));
  }, []);

  const active =
    tracks.find((track) => track.value === activeTrack) ?? tracks[0];

  return (
    <article className="card docsApiCard">
      <h2 className="cardTitle">Choose your setup path</h2>
      <p className="cardText">
        Pick your framework and follow the exact steps.
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
          {active.existingTitle ? (
            <>
              <h3 className="docsApiTabHeading" style={{ marginTop: '2rem' }}>
                {active.existingTitle}
              </h3>
              {active.existingDescription ? (
                <p className="cardText">{active.existingDescription}</p>
              ) : null}
              {active.existingSteps ? (
                <ol className="advancedTopicList">
                  {active.existingSteps.map((step, index) => (
                    <li key={`${active.value}-existing-step-${index}`}>
                      {step}
                    </li>
                  ))}
                </ol>
              ) : null}
              {active.existingCommands ? (
                <SyntaxCodeBlock code={active.existingCommands} />
              ) : null}
            </>
          ) : null}
          {active.docsHref ? (
            <p className="cardText">
              <Link href={active.docsHref}>{active.docsLabel ?? 'Docs'}</Link>
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function GetStartedTracksTabs(): React.ReactElement {
  return (
    <Suspense fallback={null}>
      <GetStartedTracksTabsInner />
    </Suspense>
  );
}
