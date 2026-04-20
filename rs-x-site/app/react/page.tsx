import type { Metadata } from 'next';

import {
  getSeoLandingMetadata,
  seoLandingPages,
} from '../../components/seo-landing-data';
import { SeoLanding } from '../../components/SeoLanding';

export const metadata: Metadata = getSeoLandingMetadata('react');

export default function ReactLandingPage() {
  return <SeoLanding content={seoLandingPages.react} />;
}
