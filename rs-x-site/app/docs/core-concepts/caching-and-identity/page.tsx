import type { Metadata } from 'next';

import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../_template/core-concept-page';

const doc: CoreConceptDoc = {
  title: 'Caching and identity',
  lead: 'Use stable ids and cache entries to reuse runtime state safely.',
  whatItMeans:
    'Factory and id services assign and track ids so repeated access can reuse existing entries instead of recreating them.',
  whyItMatters:
    'Stable identity reduces duplication, improves performance, and prevents memory churn.',
  keyPoints: [
    'Reuse cached entries when id and context match.',
    'Manage lifecycle with reference counting/dispose where required.',
    'Keep id generation stable for equivalent inputs.',
  ],
  related: [
    {
      href: '/docs/core-api/KeyedInstanceFactory',
      title: 'KeyedInstanceFactory',
      meta: 'Id-keyed instance lifecycle base',
    },
    {
      href: '/docs/core-api/module/sequence-id',
      title: 'sequence-id',
      meta: 'Stable id generation services',
    },
  ],
};

export const metadata: Metadata = {
  title: doc.title,
  description: doc.lead,
};

export default function Page() {
  return <CoreConceptPageLayout doc={doc} />;
}
