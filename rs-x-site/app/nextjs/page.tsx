import type { Metadata } from 'next';

import {
  getSeoLandingMetadata,
  seoLandingPages,
} from '../../components/seo-landing-data';
import { SeoLanding } from '../../components/SeoLanding';

export const metadata: Metadata = getSeoLandingMetadata('nextjs');

export default function NextjsLandingPage() {
  return <SeoLanding content={seoLandingPages.nextjs} />;
}
