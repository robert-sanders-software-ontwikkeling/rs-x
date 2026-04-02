import type { Metadata } from 'next';

import {
  getSeoLandingMetadata,
  seoLandingPages,
} from '../../components/seo-landing-data';
import { SeoLanding } from '../../components/SeoLanding';

export const metadata: Metadata = getSeoLandingMetadata('typescript');

export default function TypescriptLandingPage() {
  return <SeoLanding content={seoLandingPages.typescript} />;
}
