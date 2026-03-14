'use client';

import { usePathname } from 'next/navigation';
import React, { useMemo, useState } from 'react';

import { type ITabItem, Tabs } from '@rs-x/react-components';

type CollectionExamplesTab = {
  value: string;
  label: string;
  description: string;
};

export interface ICollectionExamplesTabsProps {
  tabs: readonly CollectionExamplesTab[];
  defaultValue?: string;
  children: React.ReactNode;
}

export const CollectionExamplesTabs: React.FC<ICollectionExamplesTabsProps> = ({
  tabs,
  defaultValue,
  children,
}) => {
  const pathname = usePathname();
  const panels = useMemo<React.ReactNode[]>(() => {
    return Array.isArray(children) ? children : [children];
  }, [children]);
  const firstTabValue = tabs[0]?.value ?? '';
  const initialValue =
    defaultValue && tabs.some((tab) => tab.value === defaultValue)
      ? defaultValue
      : firstTabValue;

  const [activeTabValue, setActiveTabValue] = useState<string>(initialValue);

  const activeIndex = Math.max(
    0,
    tabs.findIndex((tab) => tab.value === activeTabValue),
  );
  const activeTab = tabs[activeIndex];
  const tabItems = useMemo<ITabItem<string>[]>(() => {
    return tabs.map((tab) => ({
      value: tab.value,
      label: tab.label,
    }));
  }, [tabs]);

  return (
    <div className="docsApiTabbedShell docsCollectionTabbedShell">
      <Tabs
        unstyled
        ariaLabel="Collection examples tabs"
        persistKey={`${pathname}.collection-examples`}
        items={tabItems}
        value={activeTabValue}
        onValueChange={setActiveTabValue}
        listClassName="docsApiPackageTabs docsCollectionExampleTabs"
        tabClassName="docsApiPackageTab"
        activeTabClassName="isActive"
        labelClassName="docsApiPackageTabLabel"
      />

      <div key={activeTabValue} className="docsApiTabBody docsCollectionTabBody">
        <h2 className="cardTitle">Examples</h2>
        {activeTab?.description ? (
          <p className="cardText">{activeTab.description}</p>
        ) : null}
        {panels[activeIndex] ?? null}
      </div>
    </div>
  );
};
