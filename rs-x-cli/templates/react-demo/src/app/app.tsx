import { type FC, useEffect, useState } from 'react';

import { VirtualTableShell } from './virtual-table/virtual-table-shell';

type ThemeMode = 'light' | 'dark';

function getInitialTheme(): ThemeMode {
  const storedTheme = window.localStorage.getItem('rsx-theme');
  if (storedTheme === 'light' || storedTheme === 'dark') {
    return storedTheme;
  }

  return 'dark';
}

export const App: FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    window.localStorage.setItem('rsx-theme', theme);
  }, [theme]);

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="container">
          <div className="heroGrid">
            <div className="heroLeft">
              <p className="app-eyebrow">RS-X React Demo</p>
              <h1 className="hTitle">Virtual Table</h1>
              <p className="hSubhead">
                Million-row scrolling with a fixed RS-X expression pool.
              </p>
              <p className="hSub">
                This demo keeps rendering bounded while streaming pages on
                demand, so scrolling stays smooth without growing expression
                memory with the dataset.
              </p>

              <div className="heroActions">
                <a
                  className="btn btnGhost"
                  href="https://www.rsxjs.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  rs-x
                </a>
                <button
                  type="button"
                  className="btn btnGhost theme-toggle"
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                  onClick={() => {
                    setTheme((currentTheme) =>
                      currentTheme === 'dark' ? 'light' : 'dark',
                    );
                  }}
                >
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
              </div>
            </div>

            <aside className="card heroNote">
              <h2 className="cardTitle">What This Shows</h2>
              <p className="cardText">
                Only a small row-model pool stays alive while pages stream in
                around the viewport. That means one million logical rows without
                one million live bindings.
              </p>
            </aside>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <section className="app-panel card">
            <VirtualTableShell />
          </section>
        </div>
      </section>
    </main>
  );
};
