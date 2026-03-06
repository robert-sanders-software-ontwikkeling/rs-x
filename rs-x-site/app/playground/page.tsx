export const metadata = {
  title: 'Playground',
  description: 'Try rs-x concepts in an interactive sandbox.'
};

export default function PlaygroundPage() {
  return (
    <section className='section'>
      <div className='container'>
        <h1 className='sectionTitle'>Playground</h1>
        <p className='sectionLead'>
          Placeholder for an embedded editor / sandbox. When you add Monaco, keep it accessible:
          labels, keyboard nav, and reduced motion.
        </p>

        <div className='card'>
          <h2 className='cardTitle'>Coming soon</h2>
          <p className='cardText'>Add a simple example runner that demonstrates “change → propagate → render”.</p>
        </div>
      </div>
    </section>
  );
}
