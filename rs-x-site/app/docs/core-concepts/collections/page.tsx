import type { Metadata } from 'next';
import Link from 'next/link';

import {
  type CoreConceptDoc,
  CoreConceptPageLayout,
} from '../_template/core-concept-page';

const doc: CoreConceptDoc = {
  title: 'Collections',
  lead: 'Array, Map, and Set are reactive in rs-x expressions.',
  whatItMeans:
    'Collection reads and writes are observed so dependent expressions can react when items change.',
  whyItMatters:
    'Collection-heavy models are common. Consistent collection tracking keeps computed values in sync with minimal manual code.',
  keyPoints: [
    'Array/Map/Set mutations can trigger reactive updates.',
    'Track collection item access and membership changes.',
    'Prefer explicit collection operations for predictable updates.',
  ],
  related: [
    {
      href: '/docs/collections',
      title: 'Collections guide',
      meta: 'Non-technical walkthrough with Array/Map/Set examples',
    },
    {
      href: '/docs/observation',
      title: 'Observation strategy',
      meta: 'Collection observer behavior',
    },
    {
      href: '/docs/core-api/module/index-value-accessor',
      title: 'index-value-accessor',
      meta: 'Collection accessors',
    },
  ],
};

export const metadata: Metadata = {
  title: doc.title,
  description: doc.lead,
};

export default function Page() {
  return (
    <CoreConceptPageLayout
      doc={doc}
      headerNote={
        <p className="cardText">
          For practical examples (including specific-item monitoring), see the{' '}
          <Link href="/docs/collections">collections guide</Link>.
        </p>
      }
    />
  );
}
