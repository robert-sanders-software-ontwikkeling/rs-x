'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

type NavItem = {
  label: string;
  href: string;
  external?: boolean;
};

const navItems: NavItem[] = [
  { label: 'Features', href: '/features' },
  { label: 'Docs', href: '/docs' },
  {
    label: 'GitHub',
    href: 'https://github.com/robert-sanders-software-ontwikkeling/rs-x',
    external: true,
  },
  {
    label: 'npm',
    href: 'https://www.npmjs.com/',
    external: true,
  },
  { label: 'Playground', href: '/playground' },
];

let hasWarmedPlayground = false;

async function warmPlaygroundMonacoTypes(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  const baseUrl = '/';
  const manifestUrl = `${baseUrl}monaco-dts/manifest.json`;

  const manifestRes = await fetch(manifestUrl, { cache: 'force-cache' });
  if (!manifestRes.ok) {
    return;
  }

  const manifest = (await manifestRes.json()) as { files?: string[] };
  const files = manifest.files ?? [];

  await Promise.all(
    files.map(async (f) => {
      const normalized = f.replace(/^\//, '');
      await fetch(`${baseUrl}${normalized}`, { cache: 'force-cache' });
    }),
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const router = useRouter();
  const pathname = usePathname();
  const showGetStartedCta = pathname === '/';

  const isActivePath = (href: string): boolean => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  useEffect(() => {
    if (hasWarmedPlayground) {
      return;
    }
    hasWarmedPlayground = true;

    const run = () => {
      router.prefetch('/playground');
      void warmPlaygroundMonacoTypes().catch(() => {
        // best-effort warmup only
      });
    };

    const host = globalThis as unknown as {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
      setTimeout: typeof window.setTimeout;
      clearTimeout: typeof window.clearTimeout;
    };

    if (host.requestIdleCallback) {
      const id = host.requestIdleCallback(() => {
        run();
      });

      return () => {
        host.cancelIdleCallback?.(id);
      };
    }

    const timeoutId = host.setTimeout(() => {
      run();
    }, 300);

    return () => {
      host.clearTimeout(timeoutId);
    };
  }, [router]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const onToggleTheme = () => {
    const html = document.documentElement;

    const next = html.dataset.theme === 'dark' ? 'light' : 'dark';

    html.dataset.theme = next;
  };

  return (
    <header className='header' role='banner'>
      <div className='container'>
        <div className='headerInner'>
          {/* Logo */}
          <Link className='brand' href='/' aria-label='rs-x home'>
            <img
              className='brandMark'
              src='/rsx-logo.svg'
              alt='rs-x'
              width={38}
              height={38}
            />

            <span className='brandText'>rs-x</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className='navDesktop' aria-label='Primary navigation'>
            <ul className='navList'>
              {navItems.map((item) => {
                if (item.external) {
                  return (
                    <li key={item.label}>
                      <a
                        className='navLink'
                        href={item.href}
                        target='_blank'
                        rel='noreferrer'
                      >
                        {item.label}
                      </a>
                    </li>
                  );
                }

                return (
                  <li key={item.label}>
                    <Link
                      className={`navLink ${isActivePath(item.href) ? 'isActive' : ''}`}
                      href={item.href}
                      aria-current={isActivePath(item.href) ? 'page' : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Header Actions */}
          <div className='headerActions'>
            <button
              className='btn btnGhost btnSm'
              type='button'
              onClick={onToggleTheme}
            >
              Dark mode
            </button>

            {showGetStartedCta && (
              <Link className='btn btnPrimary btnSm' href='/get-started'>
                Get started
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              className='menuButton'
              type='button'
              aria-label='Open menu'
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => {
                setMenuOpen((v) => {
                  return !v;
                });
              }}
            >
              <span className='menuIcon' aria-hidden='true' />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={`navMobile ${menuOpen ? 'isOpen' : ''}`} id={menuId}>
          <nav aria-label='Mobile navigation'>
            <ul className='navMobileList'>
              {navItems.map((item) => {
                if (item.external) {
                  return (
                    <li key={item.label}>
                      <a
                        className='navMobileLink'
                        href={item.href}
                        target='_blank'
                        rel='noreferrer'
                        onClick={() => {
                          setMenuOpen(false);
                        }}
                      >
                        {item.label}
                      </a>
                    </li>
                  );
                }

                return (
                  <li key={item.label}>
                    <Link
                      className={`navMobileLink ${isActivePath(item.href) ? 'isActive' : ''}`}
                      href={item.href}
                      aria-current={isActivePath(item.href) ? 'page' : undefined}
                      onClick={() => {
                        setMenuOpen(false);
                      }}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}
