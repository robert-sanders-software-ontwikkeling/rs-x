import Link from 'next/link';

export function SiteFooter() {
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
                <Link href='/docs'>Docs</Link>
              </li>
              <li>
                <Link href='/get-started'>Get started</Link>
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