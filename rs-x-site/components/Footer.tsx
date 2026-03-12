'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SiteFooter() {
  const pathname = usePathname();
  const isActivePath = (href: string): boolean => {
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        <div className="footerInner">
          <div className="footerBrand">
            <span className="footerTitle">rs-x</span>
            <p className="footerTagline">
              Reactive framework and tooling shaped in public with community
              input.
            </p>
          </div>

          <div className="footerColumns">
            <nav className="footerColumn" aria-label="Product links">
              <h3 className="footerHeading">Product</h3>
              <ul className="footerLinks">
                <li>
                  <Link
                    href="/features"
                    className={
                      isActivePath('/features') ? 'isActive' : undefined
                    }
                    aria-current={
                      isActivePath('/features') ? 'page' : undefined
                    }
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="/docs"
                    className={isActivePath('/docs') ? 'isActive' : undefined}
                    aria-current={isActivePath('/docs') ? 'page' : undefined}
                  >
                    Docs
                  </Link>
                </li>
                <li>
                  <Link
                    href="/roadmap"
                    className={
                      isActivePath('/roadmap') ? 'isActive' : undefined
                    }
                    aria-current={isActivePath('/roadmap') ? 'page' : undefined}
                  >
                    Roadmap
                  </Link>
                </li>
                <li>
                  <Link
                    href="/sponsor"
                    className={
                      isActivePath('/sponsor') ? 'isActive' : undefined
                    }
                    aria-current={isActivePath('/sponsor') ? 'page' : undefined}
                  >
                    Sponsor
                  </Link>
                </li>
                <li>
                  <Link
                    href="/playground"
                    className={
                      isActivePath('/playground') ? 'isActive' : undefined
                    }
                    aria-current={
                      isActivePath('/playground') ? 'page' : undefined
                    }
                  >
                    Playground
                  </Link>
                </li>
              </ul>
            </nav>

            <nav className="footerColumn" aria-label="Community links">
              <h3 className="footerHeading">Community</h3>
              <ul className="footerLinks">
                <li>
                  <a
                    href="https://github.com/robert-sanders-software-ontwikkeling/rs-x"
                    rel="noreferrer"
                    target="_blank"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/robert-sanders-software-ontwikkeling/rs-x/issues"
                    rel="noreferrer"
                    target="_blank"
                  >
                    Report issue
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.npmjs.com/"
                    rel="noreferrer"
                    target="_blank"
                  >
                    npm
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/in/robert-sanders-352a8726/"
                    rel="noreferrer"
                    target="_blank"
                  >
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a href="mailto:robert.sanders.software@gmail.com">Email</a>
                </li>
              </ul>
            </nav>

            <div className="footerColumn">
              <h3 className="footerHeading">Support</h3>
              <ul className="footerLinks">
                <li>
                  <Link
                    href="/sponsor"
                    className={
                      isActivePath('/sponsor') ? 'isActive' : undefined
                    }
                    aria-current={isActivePath('/sponsor') ? 'page' : undefined}
                  >
                    Become a sponsor
                  </Link>
                </li>
                <li>
                  <Link href="/roadmap">Vote on roadmap priorities</Link>
                </li>
                <li>
                  <Link
                    href="/about"
                    className={isActivePath('/about') ? 'isActive' : undefined}
                    aria-current={isActivePath('/about') ? 'page' : undefined}
                  >
                    About me
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
