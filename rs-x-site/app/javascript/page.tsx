import type { Metadata } from 'next';

import {
  getSeoLandingMetadata,
  seoLandingPages,
} from '../../components/seo-landing-data';
import { SeoLanding } from '../../components/SeoLanding';

export const metadata: Metadata = getSeoLandingMetadata('javascript');

export default function JavaScriptLandingPage() {
  return <SeoLanding content={seoLandingPages.javascript} />;
}
