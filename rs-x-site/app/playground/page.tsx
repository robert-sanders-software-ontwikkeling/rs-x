import { Playground } from '@rs-x/react-components';

export const metadata = {
  title: 'Playground',
  description: 'Try rs-x concepts in an interactive sandbox.',
};

export default function PlaygroundPage() {
  return (
    <main
      id="content"
      className="main"
      style={{ display: 'flex', minHeight: 0 }}
    >
      <div style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
        <Playground />
      </div>
    </main>
  );
}
