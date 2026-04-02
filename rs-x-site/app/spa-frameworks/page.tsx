import type { Metadata } from 'next';

import {
  getSeoLandingMetadata,
  seoLandingPages,
} from '../../components/seo-landing-data';
import { SeoLanding } from '../../components/SeoLanding';

export const metadata: Metadata = getSeoLandingMetadata('spa-frameworks');

export default function SpaFrameworksLandingPage() {
  return <SeoLanding content={seoLandingPages['spa-frameworks']} />;
}
