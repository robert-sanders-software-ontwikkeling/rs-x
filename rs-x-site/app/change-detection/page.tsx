import type { Metadata } from 'next';

import {
  getSeoLandingMetadata,
  seoLandingPages,
} from '../../components/seo-landing-data';
import { SeoLanding } from '../../components/SeoLanding';

export const metadata: Metadata = getSeoLandingMetadata('change-detection');

export default function ChangeDetectionLandingPage() {
  return <SeoLanding content={seoLandingPages['change-detection']} />;
}
