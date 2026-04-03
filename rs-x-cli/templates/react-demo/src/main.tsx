import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app/app';
import { initRsx } from './rsx-bootstrap';
import './styles.css';

async function start(): Promise<void> {
  await initRsx();

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Missing #root element');
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void start();
