export const metadata = {
  title: 'Get started',
  description: 'Install rs-x and build your first reactive graph in minutes.'
};

export default function GetStartedPage() {
  return (
    <section className='section'>
      <div className='container'>
        <h1 className='sectionTitle'>Get started</h1>
        <p className='sectionLead'>
          This page is a starter scaffold. Replace the snippets with your real rs-x API.
        </p>

        <div className='grid3'>
          <article className='card'>
            <h2 className='cardTitle'>Install</h2>
            <p className='cardText'>
              Use <span className='codeInline'>npm</span> (or pnpm/yarn).
            </p>
            <p className='cardText'>
              <span className='codeInline'>npm install rs-x</span>
            </p>
          </article>

          <article className='card'>
            <h2 className='cardTitle'>Create state</h2>
            <p className='cardText'>Create a signal and update it.</p>
            <p className='cardText'>
              <span className='codeInline'>const count = signal(0)</span>
            </p>
          </article>

          <article className='card'>
            <h2 className='cardTitle'>Derive + effect</h2>
            <p className='cardText'>Compute derived state and bind updates.</p>
            <p className='cardText'>
              <span className='codeInline'>const doubled = derived(() =&gt; count() * 2)</span>
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
