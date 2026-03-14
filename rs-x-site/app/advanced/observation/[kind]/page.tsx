import { redirect } from 'next/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;

  return {
    title: `Redirecting observation/${kind}…`,
  };
}

export default async function LegacyObservationKindPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const { kind } = await params;
  redirect(`/docs/observation/${kind}`);
}
