import type { Metadata } from 'next';

export type SeoLandingKey =
  | 'react'
  | 'nextjs'
  | 'vue'
  | 'angular'
  | 'rxjs'
  | 'nodejs'
  | 'typescript'
  | 'javascript'
  | 'reactivity'
  | 'change-detection'
  | 'spa-frameworks';

type SeoLandingCta = {
  label: string;
  href: string;
};

type SeoLandingLink = {
  label: string;
  href: string;
};

export type SeoLandingContent = {
  slug: SeoLandingKey;
  title: string;
  lead: string;
  overview: string;
  highlights: string[];
  useCases: string[];
  primaryCta: SeoLandingCta;
  secondaryCta?: SeoLandingCta;
  relatedLinks: SeoLandingLink[];
  keywords: string[];
  metaTitle: string;
  metaDescription: string;
};

export const seoLandingPages: Record<SeoLandingKey, SeoLandingContent> = {
  react: {
    slug: 'react',
    title: 'rs-x for React',
    lead: 'Reactive expressions for React apps that need precise, typed change detection.',
    overview:
      'Bind reactive expressions directly to your model and let rs-x trigger React updates only when the identifiers you used actually change.',
    highlights: [
      'Use hooks to keep UI and expressions in sync without extra boilerplate.',
      'Fine-grained dependency tracking avoids component-wide re-renders.',
      'Works with existing state libraries and data-fetching layers.',
    ],
    useCases: [
      'Complex dashboards with frequent updates.',
      'Performance-sensitive tables and visualizations.',
      'Reactive forms and computed values across many fields.',
    ],
    primaryCta: { label: 'React integration', href: '/docs/frameworks/react' },
    secondaryCta: { label: 'Get started', href: '/get-started?track=react' },
    relatedLinks: [
      {
        label: 'Expressions 101',
        href: '/docs/core-concepts/first-expression',
      },
      { label: 'Performance guide', href: '/docs/core-concepts/performance' },
    ],
    keywords: [
      'react',
      'reactive react',
      'react reactive expressions',
      'react reactivity',
      'react change detection',
      'react state management',
      'react reactive state',
      'fine-grained reactivity',
      'typescript',
    ],
    metaTitle: 'Reactive expressions for React | rs-x',
    metaDescription:
      'Use rs-x with React for reactive expressions, fine-grained change detection, and typed reactive state.',
  },
  nextjs: {
    slug: 'nextjs',
    title: 'rs-x for Next.js',
    lead: 'Reactive expressions for Next.js apps, where the UI changes only when the relevant data changes.',
    overview:
      'Use rs-x in Next.js client components to bind reactive expressions to your model state. Keep the expression stable by creating it at module scope or with useMemo. rs-x tracks fine-grained dependencies and updates only the parts of the UI that depend on what changed.',
    highlights: [
      'Works with Next.js app router and server components — bootstrap runs client-side.',
      'useRsxExpression should receive a stable pre-built expression, not a freshly bound expression created during render.',
      'Webpack plugin integration via rsx init for seamless build support.',
      'Full TypeScript support with the rs-x VS Code extension and compiler.',
    ],
    useCases: [
      'Reactive client components with precise update control.',
      'Shared expression models across multiple components.',
      'Data-heavy pages where reducing re-renders matters.',
    ],
    primaryCta: { label: 'Next.js integration', href: '/docs/frameworks/nextjs' },
    secondaryCta: { label: 'Get started', href: '/get-started?track=next' },
    relatedLinks: [
      {
        label: 'Expressions 101',
        href: '/docs/core-concepts/first-expression',
      },
      { label: 'Compiler guide', href: '/docs/core-concepts/compiler' },
      { label: 'rsx.config.json', href: '/docs/core-concepts/rsx-config' },
    ],
    keywords: [
      'next.js',
      'nextjs reactive',
      'nextjs reactive expressions',
      'nextjs reactivity',
      'nextjs change detection',
      'nextjs state management',
      'nextjs reactive state',
      'fine-grained reactivity',
      'typescript',
      'react',
    ],
    metaTitle: 'Reactive expressions for Next.js | rs-x',
    metaDescription:
      'Use rs-x with Next.js for reactive expressions, fine-grained change detection, and typed reactive state in client components.',
  },
  vue: {
    slug: 'vue',
    title: 'rs-x for Vue',
    lead: 'Reactive expressions for Vue without extra boilerplate.',
    overview:
      'Use the rs-x Vue composable to bind reactive expressions to model state and trigger updates when dependencies change.',
    highlights: [
      'Composition API friendly with a minimal API surface.',
      'Fine-grained dependencies keep updates fast and predictable.',
      'Works alongside Vue reactivity and existing stores.',
    ],
    useCases: [
      'Computed data pipelines in Vue apps.',
      'Reactive forms and calculated fields.',
      'Large lists and dashboards that need precision updates.',
    ],
    primaryCta: { label: 'Vue integration', href: '/docs/frameworks/vue' },
    secondaryCta: { label: 'Get started', href: '/get-started' },
    relatedLinks: [
      {
        label: 'Expression types',
        href: '/docs/core-concepts/expression-types',
      },
      { label: 'Collections guide', href: '/docs/collections' },
    ],
    keywords: [
      'vue',
      'reactive vue',
      'vue reactive expressions',
      'vue reactivity',
      'vue change detection',
      'vue composition api',
      'vue reactive state',
      'fine-grained reactivity',
      'typescript',
    ],
    metaTitle: 'Reactive expressions for Vue | rs-x',
    metaDescription:
      'Bind rs-x reactive expressions to Vue state for fine-grained updates, typed reactivity, and reactive state.',
  },
  angular: {
    slug: 'angular',
    title: 'rs-x for Angular',
    lead: 'Reactive expressions for Angular templates and services with predictable, fine-grained change detection.',
    overview:
      'Use rs-x in Angular to bind reactive expressions to model state and update views only when identifiers change.',
    highlights: [
      'Drop-in integration with Angular templates and services.',
      'Avoid full-component checks with identifier-level tracking.',
      'Typed expressions for safer refactors.',
    ],
    useCases: [
      'Complex Angular forms with computed fields.',
      'Enterprise dashboards with frequent updates.',
      'High-performance data grids.',
    ],
    primaryCta: {
      label: 'Angular integration',
      href: '/docs/frameworks/angular',
    },
    secondaryCta: { label: 'Get started', href: '/get-started' },
    relatedLinks: [
      { label: 'Compiler overview', href: '/docs/core-concepts/compiler' },
      {
        label: 'Batching updates',
        href: '/docs/core-concepts/batching-transactions',
      },
    ],
    keywords: [
      'angular',
      'reactive angular',
      'angular reactive expressions',
      'angular change detection',
      'angular reactivity',
      'angular reactive state',
      'fine-grained change detection',
      'typescript',
    ],
    metaTitle: 'Reactive expressions for Angular | rs-x',
    metaDescription:
      'Use rs-x with Angular for reactive expressions, fine-grained change detection, and typed reactive state.',
  },
  rxjs: {
    slug: 'rxjs',
    title: 'rs-x with RxJS',
    lead: 'Combine RxJS streams with rs-x expressions for precise reactive updates.',
    overview:
      'rs-x treats Observable values as part of the reactive graph so expressions update when streams emit.',
    highlights: [
      'Use Observables inside expressions alongside plain values.',
      'Fine-grained updates keep UI and derived state fast.',
      'Works with existing RxJS operators and pipelines.',
    ],
    useCases: [
      'Streaming data dashboards.',
      'Real-time analytics and monitoring.',
      'Event-driven workflow engines.',
    ],
    primaryCta: { label: 'RxJS integration', href: '/docs/frameworks/rxjs' },
    secondaryCta: {
      label: 'Async operations',
      href: '/docs/core-concepts/async-operations',
    },
    relatedLinks: [
      { label: 'Expression evaluation', href: '/docs/expression-creation' },
      { label: 'Performance guide', href: '/docs/core-concepts/performance' },
    ],
    keywords: [
      'rxjs',
      'rxjs reactivity',
      'rxjs expressions',
      'observable change detection',
      'fine-grained reactivity',
      'typescript',
    ],
    metaTitle: 'rs-x + RxJS — reactive expressions with streams',
    metaDescription:
      'Combine RxJS streams with rs-x expressions for fine-grained reactive updates.',
  },
  nodejs: {
    slug: 'nodejs',
    title: 'rs-x for Node.js',
    lead: 'Bring reactive expressions to Node.js services, workers, and data pipelines.',
    overview:
      'Use rs-x in Node.js for reactive computations, cache invalidation, model-driven updates, and server-side reactive data flows.',
    highlights: [
      'Fine-grained change tracking for service logic.',
      'Great for reactive pipelines and computed caching.',
      'Works with plain JavaScript and TypeScript.',
    ],
    useCases: [
      'Reactive ETL and data enrichment.',
      'Cache invalidation for derived data.',
      'Backend services that react to model changes.',
    ],
    primaryCta: { label: 'Get started', href: '/get-started?track=node' },
    secondaryCta: {
      label: 'Core concepts',
      href: '/docs/core-concepts/first-expression',
    },
    relatedLinks: [
      { label: 'Docs overview', href: '/docs' },
      {
        label: 'First expression',
        href: '/docs/core-concepts/first-expression',
      },
      { label: 'CLI', href: '/docs/core-concepts/cli' },
      { label: 'Compiler', href: '/docs/core-concepts/compiler' },
      {
        label: 'Batching transactions',
        href: '/docs/core-concepts/batching-transactions',
      },
      { label: 'Performance', href: '/docs/core-concepts/performance' },
    ],
    keywords: [
      'nodejs',
      'reactive nodejs',
      'nodejs reactive expressions',
      'node.js reactivity',
      'nodejs reactivity',
      'server side reactivity',
      'reactive node',
      'typescript',
      'javascript',
      'fine-grained change detection',
    ],
    metaTitle: 'Reactive expressions for Node.js | rs-x',
    metaDescription:
      'Use rs-x in Node.js services for reactive expressions, server-side reactivity, and predictable fine-grained updates.',
  },
  typescript: {
    slug: 'typescript',
    title: 'TypeScript reactive expressions',
    lead: 'Type-safe reactivity that keeps expressions aligned with your model.',
    overview:
      'rs-x is built for TypeScript. Expressions are strongly typed, and tooling catches invalid identifiers early.',
    highlights: [
      'Typed expressions keep refactors safe and predictable.',
      'Compiler integration surfaces errors at build time.',
      'Works with React, Vue, Angular, RxJS, and Node.js.',
    ],
    useCases: [
      'Large TypeScript codebases with complex state.',
      'Typed data pipelines and computed values.',
      'Apps that need safe, predictable reactivity.',
    ],
    primaryCta: { label: 'Get started', href: '/get-started' },
    secondaryCta: {
      label: 'Compiler guide',
      href: '/docs/core-concepts/compiler',
    },
    relatedLinks: [
      {
        label: 'Expression types',
        href: '/docs/core-concepts/expression-types',
      },
      { label: 'Performance guide', href: '/docs/core-concepts/performance' },
    ],
    keywords: [
      'typescript',
      'typescript reactivity',
      'typed expressions',
      'change detection',
      'fine-grained reactivity',
    ],
    metaTitle: 'TypeScript reactivity with rs-x',
    metaDescription:
      'rs-x delivers typed reactive expressions and fine-grained change detection for TypeScript apps.',
  },
  javascript: {
    slug: 'javascript',
    title: 'JavaScript reactivity with rs-x',
    lead: 'Fine-grained reactive expressions for modern JavaScript apps.',
    overview:
      'Use rs-x in plain JavaScript to bind expressions to a model and propagate updates automatically.',
    highlights: [
      'No build step required to get reactivity.',
      'Fine-grained dependency tracking for fast updates.',
      'Works in browsers and Node.js.',
    ],
    useCases: [
      'SPA apps that need precise updates.',
      'Reactive data processing scripts.',
      'Performance-sensitive UI updates.',
    ],
    primaryCta: { label: 'Get started', href: '/get-started' },
    secondaryCta: {
      label: 'First expression',
      href: '/docs/core-concepts/first-expression',
    },
    relatedLinks: [
      { label: 'Performance guide', href: '/docs/core-concepts/performance' },
      { label: 'Change detection', href: '/change-detection' },
    ],
    keywords: [
      'javascript',
      'javascript reactivity',
      'reactive expressions',
      'change detection',
      'fine-grained reactivity',
    ],
    metaTitle: 'JavaScript reactivity with rs-x',
    metaDescription:
      'Use rs-x in JavaScript for fine-grained reactive expressions and predictable updates.',
  },
  reactivity: {
    slug: 'reactivity',
    title: 'Reactivity with rs-x',
    lead: 'Fine-grained reactivity for applications that need precise updates.',
    overview:
      'rs-x builds a dependency graph at the identifier level. Expressions only re-evaluate when those identifiers change.',
    highlights: [
      'Expression-based reactivity with clear data flow.',
      'Identifier-level change tracking for performance.',
      'Works across frontend and backend stacks.',
    ],
    useCases: [
      'Reactive UI components with computed values.',
      'Backend pipelines with derived state.',
      'Complex models where only specific fields update.',
    ],
    primaryCta: {
      label: 'First expression',
      href: '/docs/core-concepts/first-expression',
    },
    secondaryCta: {
      label: 'Performance guide',
      href: '/docs/core-concepts/performance',
    },
    relatedLinks: [
      { label: 'Change detection', href: '/change-detection' },
      { label: 'SPA frameworks', href: '/spa-frameworks' },
    ],
    keywords: [
      'reactivity',
      'fine-grained reactivity',
      'reactive expressions',
      'change detection',
      'typescript',
      'javascript',
    ],
    metaTitle: 'Fine-grained reactivity with rs-x',
    metaDescription:
      'rs-x provides fine-grained reactivity with expression-based dependency tracking.',
  },
  'change-detection': {
    slug: 'change-detection',
    title: 'Change detection with rs-x',
    lead: 'Detect exactly what changed and update only what needs to move.',
    overview:
      'rs-x observes identifiers rather than whole objects, enabling precise change detection for UI and data pipelines.',
    highlights: [
      'Identifier-level dependency tracking.',
      'Predictable updates without deep diffing.',
      'Designed for both UI and backend workflows.',
    ],
    useCases: [
      'High-frequency dashboards.',
      'Forms with many computed fields.',
      'Reactive data services.',
    ],
    primaryCta: {
      label: 'Performance guide',
      href: '/docs/core-concepts/performance',
    },
    secondaryCta: {
      label: 'Expressions 101',
      href: '/docs/core-concepts/first-expression',
    },
    relatedLinks: [
      { label: 'Reactivity guide', href: '/reactivity' },
      { label: 'SPA frameworks', href: '/spa-frameworks' },
    ],
    keywords: [
      'change detection',
      'fine-grained change detection',
      'reactive expressions',
      'reactivity',
      'typescript',
      'javascript',
    ],
    metaTitle: 'Change detection with rs-x',
    metaDescription:
      'Use rs-x for fine-grained change detection and precise reactive updates.',
  },
  'spa-frameworks': {
    slug: 'spa-frameworks',
    title: 'SPA frameworks and rs-x',
    lead: 'Fine-grained reactivity for modern SPA frameworks like React, Vue, and Angular.',
    overview:
      'rs-x integrates with major SPA frameworks while keeping reactive logic in a shared expression layer.',
    highlights: [
      'React, Vue, and Angular integration guides.',
      'Shared reactive model across frameworks.',
      'Predictable updates for complex UIs.',
    ],
    useCases: [
      'Cross-framework teams sharing business logic.',
      'Performance-sensitive SPA dashboards.',
      'Reactive forms and data-heavy screens.',
    ],
    primaryCta: { label: 'React integration', href: '/docs/frameworks/react' },
    secondaryCta: { label: 'Vue integration', href: '/docs/frameworks/vue' },
    relatedLinks: [
      { label: 'Angular integration', href: '/docs/frameworks/angular' },
      { label: 'RxJS integration', href: '/docs/frameworks/rxjs' },
    ],
    keywords: [
      'spa framework',
      'react',
      'vue',
      'angular',
      'change detection',
      'reactivity',
    ],
    metaTitle: 'SPA frameworks and fine-grained reactivity',
    metaDescription:
      'Use rs-x with React, Vue, and Angular to get fine-grained reactive updates.',
  },
};

export function getSeoLandingMetadata(slug: SeoLandingKey): Metadata {
  const entry = seoLandingPages[slug];
  return {
    title: entry.metaTitle,
    description: entry.metaDescription,
    keywords: entry.keywords,
    alternates: {
      canonical: `/${entry.slug}`,
    },
  };
}
