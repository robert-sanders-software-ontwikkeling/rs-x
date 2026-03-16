'use client';

import { useState } from 'react';

import { type ITabItem, Tabs } from '@rs-x/react-components';

import { PerformanceBarChart } from './performance-report-charts.client';
import { type MemoryUsageRow, MemoryUsageTable } from './performance-report-tables.client';

type MemoryTab = {
  value: string;
  label: string;
  prefix: string;
};

const MEMORY_TABS: MemoryTab[] = [
  { value: 'parse', label: 'Parse', prefix: 'Parse' },
  { value: 'bind-unique', label: 'Bind unique', prefix: 'Bind unique' },
  { value: 'bind-same', label: 'Bind same expression', prefix: 'Bind same expression' },
  { value: 'single-update', label: 'Single update', prefix: 'Single update' },
  { value: 'bulk-update', label: 'Bulk update', prefix: 'Bulk update' },
];

const TAB_ITEMS: ITabItem<string>[] = MEMORY_TABS.map((t) => ({
  value: t.value,
  label: t.label,
}));

type MemoryUsageTabsProps = {
  rows: MemoryUsageRow[];
};

export function MemoryUsageTabs({ rows }: MemoryUsageTabsProps) {
  const [selected, setSelected] = useState(MEMORY_TABS[0].value);

  const activeTab = MEMORY_TABS.find((t) => t.value === selected) ?? MEMORY_TABS[0];
  const filteredRows = rows.filter((r) => r.scenario.startsWith(activeTab.prefix));

  const chartRows = filteredRows.map((r) => ({
    label: r.scenario.replace(`${activeTab.prefix} `, '').replace(/[()]/g, '').trim(),
    values: { peakRssMb: r.peakRssMb, medianHeapMb: r.medianHeapMb },
  }));

  return (
    <div>
      <Tabs
        unstyled
        ariaLabel="Memory usage category tabs"
        persistKey="perf-report.memory-tabs"
        items={TAB_ITEMS}
        value={selected}
        onValueChange={setSelected}
        listClassName="docsApiPackageTabs"
        tabClassName="docsApiPackageTab"
        activeTabClassName="isActive"
        labelClassName="docsApiPackageTabLabel"
      />
      <PerformanceBarChart
        ariaLabel={`Memory usage chart for ${activeTab.label}`}
        rows={chartRows}
        series={[
          { key: 'peakRssMb', label: 'Peak RSS MB', barClassName: 'isSecondary' },
          { key: 'medianHeapMb', label: 'Median heap MB', barClassName: 'isPrimary' },
        ]}
        valueUnit="mb"
        decimals={1}
        xAxisLabel={activeTab.value === 'parse' ? 'Expression size (node count)' : 'Active bindings'}
        yAxisLabel="Memory (MB)"
      />
      <MemoryUsageTable rows={filteredRows} />
    </div>
  );
}
