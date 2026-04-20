import type { Metadata } from 'next';

import {
  getSeoLandingMetadata,
  seoLandingPages,
} from '../../components/seo-landing-data';
import { SeoLanding } from '../../components/SeoLanding';

export const metadata: Metadata = getSeoLandingMetadata('rxjs');

export default function RxjsLandingPage() {
  return <SeoLanding content={seoLandingPages.rxjs} />;
}
