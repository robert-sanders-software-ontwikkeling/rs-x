'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { CodeViewer, type ITabItem, Tabs } from '@rs-x/react-components';

export type MemberExpressionExampleTab = {
  value: string;
  label: string;
  description: string;
  code: string;
  playgroundHref?: string;
};

export interface IMemberExpressionExamplesTabsProps {
  tabs: readonly MemberExpressionExampleTab[];
  defaultValue?: string;
}

export const MemberExpressionExamplesTabs: React.FC<
  IMemberExpressionExamplesTabsProps
> = ({ tabs, defaultValue }) => {
  const pathname = usePathname();
  const tabsHostRef = useRef<HTMLDivElement | null>(null);
  const tabsListRef = useRef<HTMLElement | null>(null);
  const firstTabValue = tabs[0]?.value ?? '';
  const initialValue =
    defaultValue && tabs.some((tab) => tab.value === defaultValue)
      ? defaultValue
      : firstTabValue;

  const [activeTabValue, setActiveTabValue] = useState<string>(initialValue);
  const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
  const [canScrollRight, setCanScrollRight] = useState<boolean>(false);

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

  useEffect(() => {
    const host = tabsHostRef.current;
    if (!host) {
      return;
    }

    const list = host.querySelector<HTMLElement>('.docsMemberExamplesTabsList');
    if (!list) {
      return;
    }
    tabsListRef.current = list;

    const updateScrollState = () => {
      const maxScrollLeft = list.scrollWidth - list.clientWidth;
      setCanScrollLeft(list.scrollLeft > 1);
      setCanScrollRight(list.scrollLeft < maxScrollLeft - 1);
    };

    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) {
        return;
      }
      if (list.scrollWidth <= list.clientWidth + 1) {
        return;
      }
      list.scrollLeft += event.deltaY;
      event.preventDefault();
    };

    updateScrollState();
    list.addEventListener('scroll', updateScrollState, { passive: true });
    list.addEventListener('wheel', onWheel, { passive: false });

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(list);

    return () => {
      resizeObserver.disconnect();
      list.removeEventListener('scroll', updateScrollState);
      list.removeEventListener('wheel', onWheel);
    };
  }, [tabs, activeTabValue]);

  if (!activeTab) {
    return null;
  }

  const scrollTabsBy = (delta: number) => {
    const list = tabsListRef.current;
    if (!list) {
      return;
    }
    list.scrollBy({
      left: delta,
      behavior: 'smooth',
    });
  };

  return (
    <div className="docsApiTabbedShell docsCollectionTabbedShell">
      <div className="docsMemberExamplesTabsRail">
        <button
          type="button"
          className="docsMemberExamplesTabsNav"
          onClick={() => {
            scrollTabsBy(-220);
          }}
          disabled={!canScrollLeft}
          aria-label="Scroll tabs left"
        >
          ‹
        </button>

        <div
          ref={tabsHostRef}
          className={`docsMemberExamplesTabsHost ${canScrollLeft ? 'canScrollLeft' : ''} ${canScrollRight ? 'canScrollRight' : ''}`}
        >
          <Tabs
            unstyled
            ariaLabel="Member expression examples tabs"
            persistKey={`${pathname}.member-expression-examples`}
            items={tabItems}
            value={activeTabValue}
            onValueChange={setActiveTabValue}
            className="docsMemberExamplesTabsRoot"
            listClassName="docsApiPackageTabs docsMemberExamplesTabsList"
            tabClassName="docsApiPackageTab docsMemberExamplesTab"
            activeTabClassName="isActive"
            labelClassName="docsApiPackageTabLabel"
          />
        </div>

        <button
          type="button"
          className="docsMemberExamplesTabsNav"
          onClick={() => {
            scrollTabsBy(220);
          }}
          disabled={!canScrollRight}
          aria-label="Scroll tabs right"
        >
          ›
        </button>
      </div>

      <div
        key={activeTabValue}
        className="docsApiTabBody docsCollectionTabBody docsMemberExampleBody"
      >
        <div className="docsMemberExampleSummary">
          <h2 className="cardTitle">{activeTab.label} example</h2>
          <p className="cardText">{activeTab.description}</p>
        </div>

        {activeTab.playgroundHref ? (
          <div className="cardLinks docsMemberExampleActions">
            <Link
              className="cardLink docsMemberExampleLink"
              href={activeTab.playgroundHref}
            >
              Try in playground <span aria-hidden="true">→</span>
            </Link>
          </div>
        ) : null}

        <CodeViewer
          code={activeTab.code}
          className="qsCodeBlock docsMemberExampleCode"
          containerClassName="docsMemberExampleCodeBlock"
          actionsClassName="docsMemberExampleCodeActions"
          toggleButtonClassName="btn btnGhost btnSm"
        />
      </div>
    </div>
  );
};
