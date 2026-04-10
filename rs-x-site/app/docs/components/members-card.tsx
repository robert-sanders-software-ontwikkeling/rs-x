import React from 'react';

import { LeftAccentCard } from '@rs-x/react-components';

import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';

import { renderTypeWithLinks } from './render-type-with-links';
import { splitTopLevelCommaList } from './split-top-level-comma-list';

import './members-card.css';

type ApiMemberParameter = {
  name: string;
  type: string;
  optional: boolean;
  rest: boolean;
};

export type LeftAccentCardTone =
  | 'brand'
  | 'active'
  | 'done'
  | 'mostly'
  | 'planned';

type ApiMember = {
  name: string;
  kind: 'method' | 'property' | 'constructor' | 'index' | 'call';
  signature: string;
  parameters: ApiMemberParameter[];
  returnType?: string;
  optional: boolean;
  readonly: boolean;
  abstract: boolean;
  access?: 'public' | 'protected';
  description: string;
};

interface IMember {
  kind: ApiMember['kind'];
  title?: string;
  members: ApiMember[];
}

interface MemberItemProps {
  member: ApiMember;
  ownerName: string;
}

export interface IMembersCardProps {
  memberCount: number;
  members: IMember[];
  ownerName: string;
  type: string;
}

function memberAccentTone(kind: ApiMember['kind']): LeftAccentCardTone {
  if (kind === 'constructor') {
    return 'done';
  }

  if (kind === 'method') {
    return 'active';
  }

  if (kind === 'property') {
    return 'mostly';
  }

  return 'brand';
}

function formatMemberSignatureForDisplay(member: ApiMember): string {
  const signature = member.signature.trim();

  if (!['method', 'constructor', 'call'].includes(member.kind)) {
    return signature;
  }

  const openParen = signature.indexOf('(');
  if (openParen < 0) {
    return signature;
  }

  let closeParen = -1;
  let depth = 0;

  for (let i = openParen; i < signature.length; i += 1) {
    const char = signature[i];

    if (char === '(') {
      depth += 1;
    } else if (char === ')') {
      depth -= 1;

      if (depth === 0) {
        closeParen = i;
        break;
      }
    }
  }

  if (closeParen < 0) {
    return signature;
  }

  const before = signature.slice(0, openParen).trimEnd();
  const rawParams = signature.slice(openParen + 1, closeParen).trim();
  const after = signature.slice(closeParen + 1).trim();
  const parameters =
    rawParams.length > 0 ? splitTopLevelCommaList(rawParams) : [];
  const shouldMultiline = parameters.length > 1 || signature.length > 110;

  if (!shouldMultiline) {
    return signature;
  }

  if (parameters.length === 0) {
    return `${before}()${after.length > 0 ? `${after.startsWith(':') ? '' : ' '}${after}` : ''}`;
  }

  const formattedParams = parameters
    .map((parameter, index) => {
      const suffix = index < parameters.length - 1 ? ',' : '';
      return `  ${parameter}${suffix}`;
    })
    .join('\n');

  return `${before}(\n${formattedParams}\n)${after.length > 0 ? `${after.startsWith(':') ? '' : ' '}${after}` : ''}`;
}

function MemberItem({ member, ownerName }: MemberItemProps) {
  return (
    <LeftAccentCard
      as="article"
      tone={memberAccentTone(member.kind)}
      className="apiMemberItem"
    >
      <div className="apiMemberHead">
        <div className="apiMemberHeadMain">
          <span className="apiMemberName codeInline">{member.name}</span>

          <div className="apiMemberBadges">
            <span className="apiMemberKind">{member.kind}</span>

            {member.access && (
              <span className="apiMemberMeta">{member.access}</span>
            )}

            {member.abstract && <span className="apiMemberMeta">abstract</span>}

            {member.readonly && <span className="apiMemberMeta">readonly</span>}

            {member.optional && <span className="apiMemberMeta">optional</span>}
          </div>
        </div>
      </div>

      <SyntaxCodeBlock
        code={formatMemberSignatureForDisplay(member)}
        className="apiMemberSignature"
      />

      {member.kind === 'property' && member.returnType && (
        <div className="apiMemberMetaGrid">
          <div className="apiMemberMetaBlock">
            <p className="apiMemberSectionTitle">Type</p>
            <p className="apiMemberReturn">
              {renderTypeWithLinks(member.returnType, ownerName)}
            </p>
          </div>
        </div>
      )}

      {member.parameters.length > 0 && (
        <div className="apiMemberMetaGrid">
          <div className="apiMemberMetaBlock">
            <p className="apiMemberSectionTitle">Parameters</p>

            <table
              className="apiMemberParamList"
              aria-label={`${member.name} parameters`}
            >
              <thead>
                <tr className="apiMemberParamHeader">
                  <th scope="col">Name</th>
                  <th scope="col">Type</th>
                  <th scope="col">Required</th>
                </tr>
              </thead>
              <tbody>
                {member.parameters.map((param) => (
                  <tr
                    key={`${member.name}-${param.name}`}
                    className="apiMemberParamItem"
                  >
                    <th scope="row" className="apiMemberParamName">
                      <span className="codeInline">
                        {param.name}
                        {param.optional ? '?' : ''}
                      </span>
                    </th>

                    <td className="apiMemberParamType">
                      {renderTypeWithLinks(param.type, ownerName)}
                    </td>

                    <td className="apiMemberParamRequirement">
                      {param.rest
                        ? 'variadic'
                        : param.optional
                          ? 'optional'
                          : 'required'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(member.kind === 'method' ||
        member.kind === 'constructor' ||
        member.kind === 'call') &&
        member.parameters.length === 0 && (
          <div className="apiMemberMetaGrid">
            <div className="apiMemberMetaBlock">
              <p className="apiMemberSectionTitle">Parameters</p>
              <p className="apiMemberReturn">No parameters.</p>
            </div>
          </div>
        )}

      {member.returnType && member.kind !== 'property' && (
        <div className="apiMemberMetaGrid">
          <div className="apiMemberMetaBlock apiMemberReturnBlock">
            <p className="apiMemberSectionTitle">Returns</p>
            <p className="apiMemberReturn">
              {renderTypeWithLinks(member.returnType, ownerName)}
            </p>
          </div>
        </div>
      )}
    </LeftAccentCard>
  );
}

export const MembersCard: React.FC<IMembersCardProps> = ({
  members,
  memberCount,
  type,
  ownerName,
}) => {
  return (
    <article id="members" className="card docsApiCard apiMembersCard">
      <div className="docsApiSectionTop">
        <div>
          <h2 className="cardTitle">Members</h2>
          <p className="cardText docsApiSectionNote">
            {memberCount} member{memberCount === 1 ? '' : 's'} in this {type}.
          </p>
        </div>
      </div>

      {members.map((group) => (
        <section
          key={group.kind}
          className="apiMemberGroup"
          id={`members-${group.kind}`}
        >
          {group.title && (
            <h3 className="coreInlineCodeTitle apiMemberGroupTitle">
              {group.title}
            </h3>
          )}

          <div className="apiMemberList">
            {group.members.map((member) => (
              <MemberItem
                key={`${member.name}-${member.signature}`}
                member={member}
                ownerName={ownerName}
              />
            ))}
          </div>
        </section>
      ))}
    </article>
  );
};
