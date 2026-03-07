import dedent from 'dedent';
import Link from 'next/link';

export const metadata = {
  title: 'Get started',
  description: 'Install rs-x and build your first reactive graph in minutes.'
};

const installCode = dedent`
  pnpm add @rs-x/core @rs-x/state-manager @rs-x/expression-parser rxjs
`;

const packageJsonCode = dedent`
  {
    "name": "my-rsx-app",
    "private": true,
    "type": "module",
    "dependencies": {
      "@rs-x/core": "latest",
      "@rs-x/state-manager": "latest",
      "@rs-x/expression-parser": "latest",
      "rxjs": "^7.8.2"
    }
  }
`;

const firstExampleCode = dedent`
  import { InjectionContainer } from '@rs-x/core';
  import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';
  import { interval, map } from 'rxjs';

  await InjectionContainer.load(RsXExpressionParserModule);

  const model = {
    a: 10,
    // Change trigger #1: emits a new value every 2 seconds.
    b: interval(2000).pipe(
      map(() => Math.round(100 * Math.random()))
    )
  };

  const expression = rsx<number>('a + b')(model);

  expression.changed.subscribe(() => {
    // Runs whenever a tracked dependency changes.
    console.log('value:', expression.value);
  });

  // Change trigger #2: direct model mutation.
  model.a = 20;
`;

export default function GetStartedPage() {
  return (
    <main id='content' className='main'>
      <section className='section'>
        <div className='container'>
          <h1 className='sectionTitle'>Get started</h1>
          <p className='sectionLead'>
            From install to a working reactive expression in a few minutes. The flow is:
            <strong> install → load module → bind expression → observe updates</strong>.
          </p>

          <div className='grid3'>
            <article className='card'>
              <h2 className='cardTitle'>1. Install packages</h2>
              <p className='cardText'>
                Add core DI, expression parser, and RxJS.
              </p>
              <p className='cardText'>
                <span className='codeInline'>{installCode}</span>
              </p>
              <pre className='qsCodeBlock' style={{marginTop: '1rem'}}>
                <code>{packageJsonCode}</code>
              </pre>
            </article>

            <article className='card'>
              <h2 className='cardTitle'>2. Load parser module</h2>
              <p className='cardText'>
                Before evaluating expressions, load <span className='codeInline'>RsXExpressionParserModule</span> into the{' '}
                <span className='codeInline'>InjectionContainer</span>. This wires parser + state manager services.
              </p>
            </article>

            <article className='card'>
              <h2 className='cardTitle'>3. Bind and subscribe</h2>
              <p className='cardText'>
                Bind with <span className='codeInline'>rsx(&apos;...&apos;)(model)</span>, then subscribe to{' '}
                <span className='codeInline'>expression.changed</span>.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className='quickstartSection' aria-labelledby='get-started-example-title'>
        <div className='container'>
          <div className='quickstartShell'>
            <header className='quickstartHeader'>
              <div>
                <h2 id='get-started-example-title' className='quickstartTitle'>
                  First working example
                </h2>
                <p className='quickstartLead'>
                  This is the minimum setup for reactive updates with rs-x + RxJS.
                </p>
              </div>

              <div className='quickstartHeaderActions'>
                <Link className='btn btnPrimary' href='/playground'>
                  Open Playground <span aria-hidden='true'>→</span>
                </Link>
                <Link className='btn btnGhost' href='/docs'>
                  Read Docs <span aria-hidden='true'>→</span>
                </Link>
              </div>
            </header>

            <div className='quickstartGrid'>
              <div className='qsSteps'>
                <article className='qsStepCard'>
                  <div className='qsStepTop'>
                    <span className='qsBadge' aria-hidden='true'>1</span>
                    <h3 className='qsStepTitle'>Initialize DI</h3>
                  </div>
                  <p className='qsStepText'>
                    Load parser services once during app startup.
                  </p>
                  <div className='qsInlineRow'>
                    <span className='qsChip'>boot</span>
                    <code className='qsInlineCode'>{`await InjectionContainer.load(RsXExpressionParserModule)`}</code>
                  </div>
                </article>

                <article className='qsStepCard'>
                  <div className='qsStepTop'>
                    <span className='qsBadge' aria-hidden='true'>2</span>
                    <h3 className='qsStepTitle'>Bind expression</h3>
                  </div>
                  <p className='qsStepText'>
                    Bind declarative expression text to a plain model object.
                  </p>
                  <div className='qsInlineRow'>
                    <span className='qsChip'>bind</span>
                    <code className='qsInlineCode'>{`const expression = rsx('a + b')(model)`}</code>
                  </div>
                </article>

                <article className='qsStepCard'>
                  <div className='qsStepTop'>
                    <span className='qsBadge' aria-hidden='true'>3</span>
                    <h3 className='qsStepTitle'>React to changes</h3>
                  </div>
                  <p className='qsStepText'>
                    Subscribe once and read <span className='codeInline'>expression.value</span> on updates.
                  </p>
                  <div className='qsInlineRow'>
                    <span className='qsChip'>listen</span>
                    <code className='qsInlineCode'>{`expression.changed.subscribe(() => { ... })`}</code>
                  </div>
                </article>
              </div>

              <aside className='qsCodeCard' aria-label='Get started code example'>
                <div className='qsCodeHeader'>
                  <div className='qsCodeTitle'>Complete snippet</div>
                  <div className='qsCodeSubtitle'>Copy, run, then tweak in playground</div>
                </div>
                <pre className='qsCodeBlock'>
                  <code>{firstExampleCode}</code>
                </pre>
                <div className='qsCodeFooter'>
                  <Link className='btn btnGhost qsFooterBtn' href='/playground'>
                    Try this in Playground <span aria-hidden='true'>→</span>
                  </Link>
                  <a
                    className='qsTinyLink'
                    href='https://github.com/robert-sanders-software-ontwikkeling/rs-x'
                    target='_blank'
                    rel='noreferrer'
                  >
                    View source on GitHub
                  </a>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
