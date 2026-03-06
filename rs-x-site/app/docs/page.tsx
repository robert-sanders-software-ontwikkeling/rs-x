export const metadata = {
  title: 'Docs',
  description: 'Documentation and concepts for rs-x declarative reactivity.'
};

export default function DocsPage() {
  return (
    <section className='section'>
      <div className='container'>
        <h1 className='sectionTitle'>Documentation</h1>
        <p className='sectionLead'>
          Keep the docs structured around the mental model: <strong>Signals → Derived → Effects</strong>.
        </p>

        <div className='grid3'>
          <article className='card'>
            <h2 className='cardTitle'>Core concepts</h2>
            <p className='cardText'>The dependency graph and how updates propagate.</p>
            <a className='cardLink' href='/get-started'>
              Start here <span aria-hidden='true'>→</span>
            </a>
          </article>

          <article className='card'>
            <h2 className='cardTitle'>API reference</h2>
            <p className='cardText'>Document each function with examples and edge cases.</p>
            <span className='cardLink' aria-hidden='true'>
              Add /docs/api →
            </span>
          </article>

          <article className='card'>
            <h2 className='cardTitle'>Recipes</h2>
            <p className='cardText'>Patterns: async, batching, derived trees, performance.</p>
            <span className='cardLink' aria-hidden='true'>
              Add /docs/recipes →
            </span>
          </article>
        </div>
      </div>
    </section>
  );
}
