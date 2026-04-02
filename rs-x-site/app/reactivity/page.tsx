import type { Metadata } from 'next';

import {
  getSeoLandingMetadata,
  seoLandingPages,
} from '../../components/seo-landing-data';
import { SeoLanding } from '../../components/SeoLanding';

export const metadata: Metadata = getSeoLandingMetadata('reactivity');

export default function ReactivityLandingPage() {
  return <SeoLanding content={seoLandingPages.reactivity} />;
}
