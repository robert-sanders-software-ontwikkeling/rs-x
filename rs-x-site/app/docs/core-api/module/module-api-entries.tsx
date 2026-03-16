import Link from 'next/link';

import { ItemLinkCardContent } from '@rs-x/react-components';

import { Card } from '../../components/card';

type ApiItem = {
  symbol: string;
  kind: string;
  description: string;
};

type ModuleApiEntriesProps = {
  items: ApiItem[];
};

export function ModuleApiEntries({ items }: ModuleApiEntriesProps) {
  return (
    <Card header="Module API entries">
      <ul className="docsApiLinkGrid">
        {items.map((item) => (
          <li key={item.symbol}>
            <Link
              className="docsApiLinkItem"
              href={`/docs/core-api/${encodeURIComponent(item.symbol)}`}
            >
              <ItemLinkCardContent
                title={item.symbol}
                meta={item.kind}
                description={item.description}
                descriptionClassName="cardText docsApiLinkDescription"
              />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
