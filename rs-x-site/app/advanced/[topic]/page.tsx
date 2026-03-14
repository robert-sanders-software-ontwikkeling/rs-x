import { notFound, redirect } from 'next/navigation';

type LegacyAdvancedTopic =
  | 'expression-creation'
  | 'observation'
  | 'async-operations'
  | 'modular-expressions'
  | 'commit';

const LEGACY_ADVANCED_REDIRECTS: Record<LegacyAdvancedTopic, string> = {
  'expression-creation': '/docs/expression-creation',
  observation: '/docs/observation',
  'async-operations': '/docs/async-operations',
  'modular-expressions': '/docs/modular-expressions',
  commit: '/docs/expression-change-transaction-manager',
};

export function generateStaticParams() {
  return Object.keys(LEGACY_ADVANCED_REDIRECTS).map((topic) => ({ topic }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const destination = LEGACY_ADVANCED_REDIRECTS[topic as LegacyAdvancedTopic];

  return {
    title: destination ? 'Redirecting…' : 'Not found',
  };
}

export default async function LegacyAdvancedTopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const destination = LEGACY_ADVANCED_REDIRECTS[topic as LegacyAdvancedTopic];

  if (!destination) {
    notFound();
  }

  redirect(destination);
}
