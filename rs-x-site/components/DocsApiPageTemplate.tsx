import React from 'react';

import { ApiDocHeader } from '../app/docs/components/api-doc-header';
import {
  type ApiItem,
  type ApiMember,
  createQuickFacts,
  plainMemberName
} from '../app/docs/components/api-member';
import { Card } from '../app/docs/components/card';
import { DisposeCard } from '../app/docs/components/dispose-card';
import { MembersCard } from '../app/docs/components/members-card';
import { QuickFacts } from '../app/docs/components/quick-facts';
import { WhenToUse } from '../app/docs/components/when-to-user';
import {
  renderTextWithCoreLinks
} from '../lib/type-doc-links';

import { type ApiParameterItem, ApiParameterList } from './ApiParameterList';
import { type DocsBreadcrumbItem } from './DocsBreadcrumbs';
import { DocsPageTemplate } from './DocsPageTemplate';
import { SyntaxCodeBlock } from './SyntaxCodeBlock';

type SymbolDocumentation = {
  summary?: string;
  parameters?: ApiParameterItem[];
  returns?: string;
  notes?: string;
  exampleCode?: string;
  constructorInjectionExampleCode?: string;
  fullSignature?: string;
  hideModuleDetail?: boolean;
};

type DocsPageTemplateProps = {
  gitBasePath: string;
  entry: ApiItem;
  memberDocs: ApiMember[];
  symbolDocs: Record<string, SymbolDocumentation>;
  related: { href: string; label: string }[];
  moduleDetail: string;
  packageName: string;
  fullTypeSignature: string | null;
  defaultExample: (symbol: string, kind: string) => string;
  defaultConstructorInjectionExample: (symbol: string, kind: string) => string;
};

function slugify(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
}

function formatModuleLabel(moduleName: string): string {
  return moduleName.replace(/\.ts$/i, '').replace(/\./g, '-');
}

function isCallableTypeSignature(signature: string): boolean {
  return /^export type\s+\w+\s*=/.test(signature) && signature.includes('=>');
}

function defaultParameters(
  kind: string,
  signature: string,
): ApiParameterItem[] {
  if (kind === 'function' || isCallableTypeSignature(signature)) {
    return [
      {
        name: 'See declaration',
        type: 'Signature-defined',
        description:
          'Parameter names and types are defined in the API declaration block below.',
      },
    ];
  }
  return [];
}

function defaultReturnType(kind: string, signature: string): string {
  if (kind === 'function') {
    const match = signature.match(/\)\s*:\s*([^;{]+)/);
    return match?.[1]?.trim() ?? 'See declaration';
  }
  if (isCallableTypeSignature(signature)) {
    const match = signature.match(/=>\s*([^;]+)/);
    return match?.[1]?.trim() ?? 'See declaration';
  }
  if (kind === 'const') {
    return '';
  }
  if (kind.includes('class')) {
    return 'Class instance when constructed.';
  }
  if (kind === 'interface' || kind === 'type' || kind === 'enum') {
    return 'Type-level contract (no direct runtime return value).';
  }
  return 'See declaration';
}

function groupMembers(
  members: ApiMember[],
): Array<{ kind: ApiMember['kind']; members: ApiMember[] }> {
  const order: ApiMember['kind'][] = [
    'constructor',
    'property',
    'method',
    'index',
    'call',
  ];
  return order
    .map((kind) => ({
      kind,
      members: members.filter((member) => member.kind === kind),
    }))
    .filter((group) => group.members.length > 0);
}

export const DocsApiPageTemplate: React.FC<DocsPageTemplateProps> = async ({
  memberDocs,
  gitBasePath,
  entry,
  symbolDocs,
  moduleDetail,
  related,
  packageName,
  fullTypeSignature,
  defaultExample,
  defaultConstructorInjectionExample,
}) => {
  const moduleLabel = formatModuleLabel(entry.module);
  const moduleHref = `/docs/core-api/module/${slugify(entry.module)}`;
  const breadcrumb: DocsBreadcrumbItem[] = [
    {
      label: 'Docs',
      href: '/docs',
    },
    {
      label: moduleLabel,
      href: moduleHref,
    },
  ];

  const override = symbolDocs[entry.symbol];
  const usageNotes = override?.notes;
  const whatItDoes = override?.summary ?? entry.description;

  const apiSignature =
    override?.fullSignature ?? fullTypeSignature ?? entry.signature;
  const normalizedModuleDetail = moduleDetail.trim();
  const normalizedWhatItDoes = whatItDoes.trim();
  const showModuleDetail = !override?.hideModuleDetail;
  const hasDistinctModuleDetail =
    normalizedModuleDetail.length > 0 &&
    normalizedModuleDetail !== normalizedWhatItDoes;
  const showDescriptionCard = showModuleDetail && hasDistinctModuleDetail;
  const showWhenToUse =
    !['interface', 'type'].includes(entry.kind) && Boolean(usageNotes);
  const classHasDisposeMethod =
    ['class', 'abstract class'].includes(entry.kind) &&
    memberDocs.some((member) => plainMemberName(member.name) === 'dispose');
  const showDeclaration = !['class', 'abstract class'].includes(entry.kind);
  const usageSnippet =
    entry.kind === 'type' || entry.kind === 'interface'
      ? `import type { ${entry.symbol} } from '${packageName}';`
      : `import { ${entry.symbol} } from '${packageName}';`;

  const usageExample =
    override?.exampleCode ?? defaultExample(entry.symbol, entry.kind);

  const showExample =
    !['interface', 'type'].includes(entry.kind) &&
    usageExample.trim().length > 0;

  const constructorInjectionExample =
    override?.constructorInjectionExampleCode ??
    defaultConstructorInjectionExample(entry.symbol, entry.kind);
  const showConstructorInjectionExample =
    !['interface', 'type'].includes(entry.kind) &&
    constructorInjectionExample.trim().length > 0;

  const isTypeLike = ['interface', 'type', 'enum'].includes(entry.kind);
  const showStandardDetailCards = !isTypeLike;
  const showMembersCard =
    memberDocs.length > 0 &&
    ['interface', 'class', 'abstract class'].includes(entry.kind);
  const showDetailCards = !showMembersCard && showStandardDetailCards;
  const parameterDocs =
    override?.parameters ?? defaultParameters(entry.kind, entry.signature);
  const showParametersCard = showDetailCards && parameterDocs.length > 0;

  override?.parameters ?? defaultParameters(entry.kind, entry.signature);
  const returnTypeDoc =
    override?.returns ?? defaultReturnType(entry.kind, entry.signature);
  const showReturnTypeCard =
    showDetailCards &&
    !['class', 'abstract class'].includes(entry.kind) &&
    Boolean(returnTypeDoc?.trim());
  const memberGroups = groupMembers(memberDocs);

  return (
    <DocsPageTemplate>
      <ApiDocHeader
        name={entry.symbol}
        type={entry.kind}
        eyebrow="API Reference"
        breadcrumb={breadcrumb}
        whatItDoes={renderTextWithCoreLinks(whatItDoes, entry.symbol)}
      />

      <div className="docsApiGrid">
        {showDescriptionCard && (
          <Card id="Overview" header="Overview">
            {renderTextWithCoreLinks(moduleDetail, entry.symbol)}
          </Card>
        )}

        {showWhenToUse && (
          <WhenToUse
            description={renderTextWithCoreLinks(
              usageNotes as string,
              entry.symbol,
            )}
            related={related}
          />
        )}

        {classHasDisposeMethod && <DisposeCard />}

        <QuickFacts
          items={createQuickFacts(
            entry,
            memberDocs,
            apiSignature,
            moduleHref,
            moduleLabel,
            gitBasePath,
          )}
        />

        {showDeclaration && (
          <Card id="declaration" header="Declaration">
            <SyntaxCodeBlock code={apiSignature} />
          </Card>
        )}

        <Card id="import" header="Import">
          <SyntaxCodeBlock code={usageSnippet} />
        </Card>

        {showExample && (
          <Card id="example" header="Example">
            <SyntaxCodeBlock code={usageExample} />
          </Card>
        )}

        {showConstructorInjectionExample && (
          <Card
            id="constructor-injection-example"
            header="Constructor injection example"
          >
            <SyntaxCodeBlock code={constructorInjectionExample} />
          </Card>
        )}

        {showParametersCard && (
          <article id="parameters" className="card docsApiCard">
            <h2 className="cardTitle">Parameters</h2>
            <ApiParameterList
              items={parameterDocs}
              currentSymbol={entry.symbol}
            />
          </article>
        )}

        {showReturnTypeCard && (
          <article id="returns" className="card docsApiCard">
            <h2 className="cardTitle">Return type</h2>
            <p className="cardText">
              {renderTextWithCoreLinks(returnTypeDoc, entry.symbol)}
            </p>
          </article>
        )}

        {showMembersCard && (
          <MembersCard
            memberCount={memberDocs.length}
            members={memberGroups}
            ownerName={entry.symbol}
            type={entry.kind}
          />
        )}
      </div>
    </DocsPageTemplate>
  );
};
