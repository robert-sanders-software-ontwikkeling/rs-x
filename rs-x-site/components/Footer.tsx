'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SiteFooter() {
  const pathname = usePathname();
  const isActivePath = (href: string): boolean => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <footer className='footer' role='contentinfo'>
      <div className='container'>
        <div className='footerInner'>
          <div className='footerBrand'>
            <span className='footerTitle'>rs-x</span>
          </div>

          <nav aria-label='Footer links'>
            <ul className='footerLinks'>
              <li>
                <Link
                  href='/features'
                  className={isActivePath('/features') ? 'isActive' : undefined}
                  aria-current={isActivePath('/features') ? 'page' : undefined}
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href='/docs'
                  className={isActivePath('/docs') ? 'isActive' : undefined}
                  aria-current={isActivePath('/docs') ? 'page' : undefined}
                >
                  Docs
                </Link>
              </li>
              <li>
                <Link
                  href='/get-started'
                  className={isActivePath('/get-started') ? 'isActive' : undefined}
                  aria-current={isActivePath('/get-started') ? 'page' : undefined}
                >
                  Get started
                </Link>
              </li>
              <li>
                <Link
                  href='/playground'
                  className={isActivePath('/playground') ? 'isActive' : undefined}
                  aria-current={isActivePath('/playground') ? 'page' : undefined}
                >
                  Playground
                </Link>
              </li>
              <li>
                <a href='https://github.com/robert-sanders-software-ontwikkeling/rs-x' rel='noreferrer' target='_blank'>
                  GitHub
                </a>
              </li>
              <li>
                <a href='https://www.npmjs.com/' rel='noreferrer' target='_blank'>
                  npm
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
