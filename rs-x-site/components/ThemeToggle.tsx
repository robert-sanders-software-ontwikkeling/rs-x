'use client';

import * as React from 'react';

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<'light' | 'dark'>('light');

  React.useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'dark' || current === 'light') {
      setTheme(current);
    }
  }, []);

  const onToggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('rsx-theme', next);
    } catch {}
  };

  return (
    <button
      type="button"
      className="btn btnGhost"
      onClick={() => {
        onToggle();
      }}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title="Toggle theme"
    >
      {theme === 'light' ? 'Dark' : 'Light'} mode
    </button>
  );
}
