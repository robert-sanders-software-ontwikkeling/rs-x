import dedent from 'dedent';
import Link from 'next/link';

import { SyntaxCodeBlock } from '../../components/SyntaxCodeBlock';

type RoadmapItem = {
  title: string;
  status: 'done' | 'planned' | 'in-progress' | 'mostly-done';
  statusLabel: string;
  aim: string;
  goal: string;
  objective: string;
  impact: string[];
  exampleTitle?: string;
  exampleCode?: string;
  notes?: string[];
};

const tsTransformerExample = dedent`
  import { BehaviorSubject } from 'rxjs';
  import { rsx } from 'rs-x-transformer-planned';

  const model = {
    x: 10,
    observable: new BehaviorSubject(20),
  };

  // Correct expression: compiles and subscribes to changes
  const expression1 = rsx('x + observable')(model);
  expression1.change.subscribe(() => console.log(expression1.value));

  // Incorrect expression: fails at compile time
  // const expression2 = rsx('x + y')(model);
  // Error: 'y' does not exist on model

  // Syntax error: fails at compile time
  // const expression3 = rsx('x + ')();
  // Error: incomplete expression
`;

const presentationLayerExample = dedent`
  <label click.on="showMessage(message)">
    <input
      type="checkbox"
      name="checkbox"
      checked.twoway="show"
    />
    [[show ? 'Hide' : 'Show']]
  </label>

  <p>
    <div if.struct="show" tooltip.attach="message">
      [[message]]
    </div>
  </p>
`;

const contentProjectionExample = dedent`
  <my-layout>
    <h1 slot="header">[[header]]</h1>
    <div slot="body">message</div>
  </my-layout>
`;

const roadmapItems: RoadmapItem[] = [
  {
    title: 'TS Transformer / Plugin',
    status: 'planned',
    statusLabel: 'Planned',
    aim: 'Provide compile-time parsing and syntax validation for RS-X expressions.',
    goal: 'Offer IntelliSense/autocomplete for context properties, fail fast on invalid identifiers/expressions at compile time, and optimize runtime by removing expression parsing from execution paths.',
    objective:
      'Parse tagged template expressions at compile time and replace them with a complete RS-X AST (expression tree).',
    impact: [
      'Adds full TypeScript safety for reactive expressions.',
      'Prevents a class of runtime parsing/identifier errors.',
      'Removes runtime parsing overhead for better performance in larger models.',
    ],
    exampleTitle: 'Example usage',
    exampleCode: tsTransformerExample,
  },
  {
    title: 'HTML Transformer / Plugin',
    status: 'planned',
    statusLabel: 'Planned',
    aim: 'Enable RS-X expressions directly in HTML templates.',
    goal: 'Extract expressions from HTML, generate RS-X expression trees in TypeScript, and connect templates to generated trees.',
    objective:
      'Validate inline HTML expressions at compile time so invalid references/syntax fail before runtime.',
    impact: [
      'Provides compile-time safety for HTML-bound expressions.',
      'Reduces runtime parsing work.',
      'Keeps templates reactive and aligned with model state.',
      'Reduces boilerplate between templates and expression trees.',
    ],
  },
  {
    title: 'Developer Chrome Plugin',
    status: 'planned',
    statusLabel: 'Planned',
    aim: 'Provide browser tooling to inspect and debug RS-X expressions and state.',
    goal: 'Track expression evaluation and model updates to make reactive flow analysis easier.',
    objective:
      'Support expression breakpoints and live state observation during runtime.',
    impact: [
      'Simplifies debugging of reactive expressions and state.',
      'Improves visibility into RS-X internals without app code changes.',
      'Increases developer productivity during issue diagnosis.',
    ],
  },
  {
    title: 'RS-X Presentation Layer',
    status: 'planned',
    statusLabel: 'Planned',
    aim: 'Provide a truly reactive SPA framework with clear separation between presentation and logic.',
    goal: 'Support internally-defined Custom Elements while keeping templates readable and close to HTML standards.',
    objective:
      'Enable local, efficient UI updates so only affected parts of the interface re-render, while templates stay expressive and maintainable.',
    impact: [
      'Simplifies component development through clear UI/logic boundaries.',
      'Improves template readability and long-term maintainability.',
      'Provides a standardized way to build reusable reactive components.',
    ],
    exampleTitle: 'Template example',
    exampleCode: presentationLayerExample,
    notes: [
      'Binding suffixes: `.oneway`, `.twoway`, `.onetime`.',
      'Text bindings: `[[ ... ]]`.',
      'Event bindings: `.on` suffix on event attributes.',
      'Structural directives: `.struct` for DOM-shaping directives.',
      'Behavioral directives: `.attach` for behavior attachment without structural DOM changes.',
    ],
  },
  {
    title: 'Content Projection',
    status: 'planned',
    statusLabel: 'Planned',
    aim: 'Provide flexible dynamic content injection into RS-X components via slots.',
    goal: 'Support multiple named slots for reusable customizable component layouts.',
    objective:
      'Keep component templates clean while enabling dynamic content composition for sections like header/body.',
    impact: [
      'Supports reusable, flexible layouts.',
      'Improves modularity via dynamic content injection.',
      'Improves readability/maintainability of complex component composition.',
    ],
    exampleTitle: 'Slot example',
    exampleCode: contentProjectionExample,
  },
  {
    title: 'Theming Support',
    status: 'planned',
    statusLabel: 'Planned',
    aim: 'Enable flexible theming for RS-X components.',
    goal: 'Allow easy theme switching through a simple theme property/config.',
    objective:
      'Use CSS variables to apply theme styles consistently across components and branding contexts.',
    impact: [
      'Simplifies visual customization and branding.',
      'Creates a maintainable styling model.',
      'Enables dynamic theme changes without component logic rewrites.',
    ],
  },
  {
    title: 'Component Library',
    status: 'planned',
    statusLabel: 'Planned',
    aim: 'Build a versatile set of reusable UI components for RS-X applications.',
    goal: 'Prioritize component development through community voting.',
    objective:
      'Deliver high-value reusable components including flexible popups, virtualized data display, and pattern-based text editors.',
    impact: [
      'Builds a community-driven reusable ecosystem.',
      'Improves development speed by focusing on highest-priority components.',
      'Improves consistency and reuse across RS-X applications.',
    ],
  },
];

function statusClass(status: RoadmapItem['status']): string {
  if (status === 'done') {
    return 'roadmapStatusDone';
  }
  if (status === 'in-progress') {
    return 'roadmapStatusInProgress';
  }
  if (status === 'mostly-done') {
    return 'roadmapStatusMostlyDone';
  }
  return 'roadmapStatusPlanned';
}

export const metadata = {
  title: 'Roadmap',
  description:
    'Public RS-X roadmap: completed work, active items, and planned initiatives.',
};

export default function RoadmapPage() {
  return (
    <main id="content" className="main">
      <section className="section docsApiSection">
        <div className="container docsPage">
          <div className="getStartedHero">
            <div className="getStartedHeroTitleRow">
              <div>
                <p className="docsApiEyebrow">Product direction</p>
                <h1 className="sectionTitle">RS-X Roadmap</h1>
              </div>
              <div className="docsApiActions getStartedHeroActions">
                <Link className="btn btnGhost" href="/sponsor">
                  Sponsor <span aria-hidden="true">→</span>
                </Link>
                <Link className="btn btnGhost" href="/docs">
                  Docs <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
            <p className="sectionLead">
              This roadmap is public and open for community input.
              <span className="codeInline"> rs-x</span> is evolving in public,
              and your feedback can influence what gets built next.
            </p>
            <p className="cardText">
              Use the voting page to prioritize features, guide the direction,
              and influence what the framework builds next.
            </p>
            <div className="sponsorCtaRow">
              <a
                className="btn btnPrimary"
                href="https://github.com/robert-sanders-software-ontwikkeling/rs-x/discussions/52"
                target="_blank"
                rel="noreferrer"
              >
                Vote for upcoming features <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>

          <section className="getStartedLinear">
            <div className="roadmapCards">
              {roadmapItems.map((item) => (
                <article key={item.title} className="card docsApiCard roadmapCard">
                  <div className="roadmapCardHead">
                    <h2 className="cardTitle">{item.title}</h2>
                    <span
                      className={`roadmapStatus ${statusClass(item.status)}`}
                    >
                      {item.statusLabel}
                    </span>
                  </div>

                  <p className="cardText">
                    <strong>Aim:</strong> {item.aim}
                  </p>
                  <p className="cardText">
                    <strong>Goal:</strong> {item.goal}
                  </p>
                  <p className="cardText">
                    <strong>Objective:</strong> {item.objective}
                  </p>

                  <h3 className="coreInlineCodeTitle">Impact</h3>
                  <ul className="getStartedFlowList">
                    {item.impact.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>

                  {item.exampleCode && (
                    <>
                      <h3 className="coreInlineCodeTitle">
                        {item.exampleTitle ?? 'Example'}
                      </h3>
                      <SyntaxCodeBlock code={item.exampleCode} />
                    </>
                  )}

                  {item.notes && item.notes.length > 0 && (
                    <>
                      <h3 className="coreInlineCodeTitle">Notes</h3>
                      <ul className="getStartedFlowList">
                        {item.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
