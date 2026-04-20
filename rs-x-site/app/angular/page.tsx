import type { Metadata } from 'next';

import {
  getSeoLandingMetadata,
  seoLandingPages,
} from '../../components/seo-landing-data';
import { SeoLanding } from '../../components/SeoLanding';

export const metadata: Metadata = getSeoLandingMetadata('angular');

export default function AngularLandingPage() {
  return <SeoLanding content={seoLandingPages.angular} />;
}
