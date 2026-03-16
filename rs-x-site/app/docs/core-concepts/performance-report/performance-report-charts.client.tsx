'use client';

type ChartSeries = {
  key: string;
  label: string;
  barClassName?: string;
};

type ChartRow = {
  label: string;
  values: Record<string, number>;
};

type PerformanceBarChartProps = {
  ariaLabel: string;
  rows: ChartRow[];
  series: ChartSeries[];
  valueUnit?: 'us' | 'ms' | 'mb' | '';
  decimals?: number;
  xAxisLabel?: string;
  yAxisLabel?: string;
};

const SVG_WIDTH = 920;
const SVG_HEIGHT = 390;
const MARGIN_TOP = 20;
const MARGIN_RIGHT = 72;
const MARGIN_BOTTOM = 138;
const MARGIN_LEFT = 108;
const Y_TICK_COUNT = 5;

function formatValue(
  value: number,
  unit: PerformanceBarChartProps['valueUnit'],
  decimals: number,
): string {
  const formatted =
    Number.isInteger(value) && decimals === 0
      ? String(value)
      : value.toFixed(decimals);

  if (!unit) {
    return formatted;
  }

  if (unit === 'mb') {
    return `${formatted} MB`;
  }

  if (unit === 'ms') {
    return `${formatted} ms`;
  }

  return `${formatted} us`;
}

function buildLinePath(
  rows: ChartRow[],
  key: string,
  xAt: (index: number) => number,
  yAt: (value: number) => number,
): string {
  return rows
    .map((row, index) => {
      const x = xAt(index);
      const y = yAt(row.values[key] ?? 0);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function PerformanceBarChart({
  ariaLabel,
  rows,
  series,
  valueUnit = '',
  decimals = 3,
  xAxisLabel = 'Scenario',
  yAxisLabel = 'Value',
}: PerformanceBarChartProps) {
  const plotWidth = SVG_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  const plotHeight = SVG_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;
  const rawMax = Math.max(
    0.000001,
    ...rows.flatMap((row) =>
      series.map((entry) => {
        const value = row.values[entry.key];
        return isFiniteNumber(value) ? value : 0;
      }),
    ),
  );
  const yMax = rawMax * 1.1;

  const xAt = (index: number): number => {
    if (rows.length <= 1) {
      return MARGIN_LEFT + plotWidth / 2;
    }
    const ratio = index / (rows.length - 1);
    return MARGIN_LEFT + ratio * plotWidth;
  };

  const yAt = (value: number): number => {
    const ratio = Math.max(0, Math.min(1, value / yMax));
    return MARGIN_TOP + plotHeight - ratio * plotHeight;
  };

  const yTicks = Array.from({ length: Y_TICK_COUNT }, (_, index) => {
    const ratio = index / (Y_TICK_COUNT - 1);
    const value = yMax * ratio;
    return {
      value,
      y: yAt(value),
    };
  }).reverse();

  const maxLabelLength = rows.reduce((max, row) => {
    return Math.max(max, row.label.length);
  }, 0);
  const labelFootprint = Math.max(64, Math.min(220, maxLabelLength * 7));
  const xLabelStep = Math.max(
    1,
    Math.ceil((rows.length * labelFootprint) / Math.max(1, plotWidth)),
  );
  const legendSeries = series;
  const showLegend = legendSeries.length > 1;

  return (
    <figure className="docsPerfChart" role="img" aria-label={ariaLabel}>
      <svg
        className="docsPerfChartSvg"
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {yTicks.map((tick) => (
          <g key={`y-${tick.value.toFixed(6)}`}>
            <line
              className="docsPerfGridLine"
              x1={MARGIN_LEFT}
              y1={tick.y}
              x2={MARGIN_LEFT + plotWidth}
              y2={tick.y}
            />
            <text
              className="docsPerfTickLabel"
              x={MARGIN_LEFT - 10}
              y={tick.y + 4}
            >
              {formatValue(tick.value, valueUnit, decimals)}
            </text>
          </g>
        ))}

        <line
          className="docsPerfAxisLine"
          x1={MARGIN_LEFT}
          y1={MARGIN_TOP + plotHeight}
          x2={MARGIN_LEFT + plotWidth}
          y2={MARGIN_TOP + plotHeight}
        />
        <line
          className="docsPerfAxisLine"
          x1={MARGIN_LEFT}
          y1={MARGIN_TOP}
          x2={MARGIN_LEFT}
          y2={MARGIN_TOP + plotHeight}
        />

        {rows.map((row, index) => {
          if (index % xLabelStep !== 0 && index !== rows.length - 1) {
            return null;
          }

          const x = xAt(index);
          const isEdge = index === 0 || index === rows.length - 1;
          const labelX =
            index === 0 ? x + 4 : index === rows.length - 1 ? x - 4 : x;
          const textAnchor =
            index === 0 ? 'start' : index === rows.length - 1 ? 'end' : 'end';
          const labelY = MARGIN_TOP + plotHeight + 24;

          return (
            <g key={`x-${row.label}`}>
              <line
                className="docsPerfAxisTick"
                x1={x}
                y1={MARGIN_TOP + plotHeight}
                x2={x}
                y2={MARGIN_TOP + plotHeight + 5}
              />
              <text
                className="docsPerfTickLabel docsPerfTickLabelX"
                x={labelX}
                y={labelY}
                transform={
                  isEdge ? undefined : `rotate(-32 ${labelX} ${labelY})`
                }
                textAnchor={textAnchor}
              >
                {row.label}
              </text>
            </g>
          );
        })}

        {series.map((entry) => {
          const className = `docsPerfSeriesLine ${entry.barClassName ?? 'isPrimary'}`;
          const pathData = buildLinePath(rows, entry.key, xAt, yAt);
          return <path key={entry.key} className={className} d={pathData} />;
        })}

        {series.map((entry) =>
          rows.map((row, index) => {
            const x = xAt(index);
            const value = row.values[entry.key] ?? 0;
            const y = yAt(value);
            return (
              <circle
                key={`${entry.key}-${row.label}`}
                className={`docsPerfSeriesPoint ${entry.barClassName ?? 'isPrimary'}`}
                cx={x}
                cy={y}
                r={2.8}
              />
            );
          }),
        )}

        <text
          className="docsPerfAxisLabel"
          x={MARGIN_LEFT + plotWidth / 2}
          y={SVG_HEIGHT - 12}
          textAnchor="middle"
        >
          {xAxisLabel}
        </text>

        <text
          className="docsPerfAxisLabel"
          x={18}
          y={MARGIN_TOP + plotHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90 18 ${MARGIN_TOP + plotHeight / 2})`}
        >
          {yAxisLabel}
        </text>
      </svg>

      {showLegend ? (
        <figcaption className="docsPerfLegend" aria-label="Chart legend">
          {legendSeries.map((entry) => (
            <span className="docsPerfLegendItem" key={entry.key}>
              <span
                className={`docsPerfLegendSwatch ${entry.barClassName ?? 'isPrimary'}`}
              />
              <span className="docsPerfLegendText">{entry.label}</span>
            </span>
          ))}
        </figcaption>
      ) : null}
    </figure>
  );
}
