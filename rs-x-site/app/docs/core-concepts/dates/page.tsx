import dedent from 'dedent';
import Link from 'next/link';

import { ItemLinkCardContent } from '@rs-x/react-components';

import { DocsBreadcrumbs } from '../../../../components/DocsBreadcrumbs';
import { DocsPageTemplate } from '../../../../components/DocsPageTemplate';

import {
  DatePropertiesTable,
  type DatePropertyTableRow,
} from './date-properties-table.client';
import {
  DatePropertyExamplesTabs,
  type DatePropertyExampleTab,
} from './date-property-examples-tabs.client';

const toPlaygroundHref = (script: string): string =>
  `/playground?data=${encodeURIComponent(`plain:${encodeURIComponent(script)}`)}`;

const datePropertyRows: DatePropertyTableRow[] = [
  {
    property: 'year',
    scope: 'Local',
    getter: 'getFullYear',
    setter: 'setFullYear',
    readExample: 'invoiceDate.year',
    writeExample: 'model.invoiceDate.setFullYear(2027)',
    intervalExample:
      'setInterval(() => { model.invoiceDate.setFullYear(randomInt(2025, 2028)); }, 900)',
    notes: 'Four-digit local year.',
  },
  {
    property: 'utcYear',
    scope: 'UTC',
    getter: 'getUTCFullYear',
    setter: 'setUTCFullYear',
    readExample: 'invoiceDate.utcYear',
    writeExample: 'model.invoiceDate.setUTCFullYear(2027)',
    intervalExample:
      'setInterval(() => { model.invoiceDate.setUTCFullYear(randomInt(2025, 2028)); }, 900)',
    notes: 'Four-digit UTC year.',
  },
  {
    property: 'month',
    scope: 'Local',
    getter: 'getMonth',
    setter: 'setMonth',
    readExample: 'invoiceDate.month',
    writeExample: 'model.invoiceDate.setMonth(6)',
    intervalExample:
      'setInterval(() => { model.invoiceDate.setMonth(randomInt(0, 11)); }, 900)',
    notes: 'Zero-based month (0 = January, 11 = December).',
  },
  {
    property: 'utcMonth',
    scope: 'UTC',
    getter: 'getUTCMonth',
    setter: 'setUTCMonth',
    readExample: 'invoiceDate.utcMonth',
    writeExample: 'model.invoiceDate.setUTCMonth(6)',
    intervalExample:
      'setInterval(() => { model.invoiceDate.setUTCMonth(randomInt(0, 11)); }, 900)',
    notes: 'Zero-based UTC month.',
  },
  {
    property: 'date',
    scope: 'Local',
    getter: 'getDate',
    setter: 'setDate',
    readExample: 'invoiceDate.date',
    writeExample: 'model.invoiceDate.setDate(15)',
    intervalExample:
      'setInterval(() => { model.invoiceDate.setDate(randomInt(1, 28)); }, 900)',
    notes: 'Day of month (1-31) in local time.',
  },
  {
    property: 'utcDate',
    scope: 'UTC',
    getter: 'getUTCDate',
    setter: 'setUTCDate',
    readExample: 'invoiceDate.utcDate',
    writeExample: 'model.invoiceDate.setUTCDate(15)',
    intervalExample:
      'setInterval(() => { model.invoiceDate.setUTCDate(randomInt(1, 28)); }, 900)',
    notes: 'Day of month (1-31) in UTC.',
  },
  {
    property: 'hours',
    scope: 'Local',
    getter: 'getHours',
    setter: 'setHours',
    readExample: 'invoiceDate.hours',
    writeExample: 'model.invoiceDate.setHours(9)',
    intervalExample:
      'setInterval(() => { model.invoiceDate.setHours(randomInt(0, 23)); }, 900)',
    notes: 'Hours in local time (0-23).',
  },
  {
    property: 'utcHours',
    scope: 'UTC',
    getter: 'getUTCHours',
    setter: 'setUTCHours',
    readExample: 'invoiceDate.utcHours',
    writeExample: 'model.invoiceDate.setUTCHours(9)',
    intervalExample:
      'setInterval(() => { model.invoiceDate.setUTCHours(randomInt(0, 23)); }, 900)',
    notes: 'Hours in UTC (0-23).',
  },
  {
    property: 'minutes',
    scope: 'Local',
    getter: 'getMinutes',
    setter: 'setMinutes',
    readExample: 'invoiceDate.minutes',
    writeExample: 'model.invoiceDate.setMinutes(30)',
    intervalExample:
      'setInterval(() => { model.invoiceDate.setMinutes(randomInt(0, 59)); }, 900)',
    notes: 'Minutes in local time (0-59).',
  },
  {
    property: 'utcMinutes',
    scope: 'UTC',
    getter: 'getUTCMinutes',
    setter: 'setUTCMinutes',
    readExample: 'invoiceDate.utcMinutes',
    writeExample: 'model.invoiceDate.setUTCMinutes(30)',
    intervalExample:
      'setInterval(() => { model.invoiceDate.setUTCMinutes(randomInt(0, 59)); }, 900)',
    notes: 'Minutes in UTC (0-59).',
  },
  {
    property: 'seconds',
    scope: 'Local',
    getter: 'getSeconds',
    setter: 'setSeconds',
    readExample: 'invoiceDate.seconds',
    writeExample: 'model.invoiceDate.setSeconds(45)',
    intervalExample:
      'setInterval(() => { model.invoiceDate.setSeconds(randomInt(0, 59)); }, 900)',
    notes: 'Seconds in local time (0-59).',
  },
  {
    property: 'utcSeconds',
    scope: 'UTC',
    getter: 'getUTCSeconds',
    setter: 'setUTCSeconds',
    readExample: 'invoiceDate.utcSeconds',
    writeExample: 'model.invoiceDate.setUTCSeconds(45)',
    intervalExample:
      'setInterval(() => { model.invoiceDate.setUTCSeconds(randomInt(0, 59)); }, 900)',
    notes: 'Seconds in UTC (0-59).',
  },
  {
    property: 'milliseconds',
    scope: 'Local',
    getter: 'getMilliseconds',
    setter: 'setMilliseconds',
    readExample: 'invoiceDate.milliseconds',
    writeExample: 'model.invoiceDate.setMilliseconds(125)',
    intervalExample:
      'setInterval(() => { model.invoiceDate.setMilliseconds(randomInt(0, 999)); }, 900)',
    notes: 'Milliseconds in local time (0-999).',
  },
  {
    property: 'utcMilliseconds',
    scope: 'UTC',
    getter: 'getUTCMilliseconds',
    setter: 'setUTCMilliseconds',
    readExample: 'invoiceDate.utcMilliseconds',
    writeExample: 'model.invoiceDate.setUTCMilliseconds(125)',
    intervalExample:
      'setInterval(() => { model.invoiceDate.setUTCMilliseconds(randomInt(0, 999)); }, 900)',
    notes: 'Milliseconds in UTC (0-999).',
  },
  {
    property: 'time',
    scope: 'Epoch',
    getter: 'getTime',
    setter: 'setTime',
    readExample: 'invoiceDate.time',
    writeExample: 'model.invoiceDate.setTime(Date.now())',
    intervalExample:
      'setInterval(() => { model.invoiceDate.setTime(Date.now() + randomInt(-60000, 60000)); }, 900)',
    notes: 'Unix epoch milliseconds.',
  },
];

function createDatePropertyExample(
  property: string,
  setterMethod: string,
  randomValueExpression: string,
  description: string,
): DatePropertyExampleTab {
  const playgroundScript = dedent`
    const rsx = api.rsx;
    const WaitForEvent = api.WaitForEvent;
    const emptyFunction = () => {};

    const model = {
      invoiceDate: new Date('2026-03-13T08:15:20.250Z'),
    };

    // Read with Date property keys, mutate with Date setter methods.
    const expression = rsx('invoiceDate.${property}')(model);
    await new WaitForEvent(expression, 'changed').wait(emptyFunction);
    expression.changed.subscribe(() => {
      console.log('${property} ->', expression.value);
    });

    const randomInt = (min, max) =>
      Math.floor(Math.random() * (max - min + 1)) + min;

    setInterval(() => {
      model.invoiceDate.${setterMethod}(${randomValueExpression});
    }, 900);

    return expression;
  `;

  return {
    value: property,
    label: property,
    description,
    code: dedent`
      import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
      import { rsx, RsXExpressionParserModule } from '@rs-x/expression-parser';

      await InjectionContainer.load(RsXExpressionParserModule);

      const model = {
        invoiceDate: new Date('2026-03-13T08:15:20.250Z'),
      };

      // Read with Date property keys, mutate with Date setter methods.
      const expression = rsx<number>('invoiceDate.${property}')(model);
      await new WaitForEvent(expression, 'changed').wait(emptyFunction);
      expression.changed.subscribe(() => {
        console.log('${property} ->', expression.value);
      });

      const randomInt = (min: number, max: number): number =>
        Math.floor(Math.random() * (max - min + 1)) + min;

      setInterval(() => {
        model.invoiceDate.${setterMethod}(${randomValueExpression});
      }, 900);

      export const run = expression;
    `,
    playgroundHref: toPlaygroundHref(playgroundScript),
  };
}

const datePropertyExamples: DatePropertyExampleTab[] = [
  createDatePropertyExample(
    'year',
    'setFullYear',
    'randomInt(2025, 2028)',
    '',
  ),
  createDatePropertyExample(
    'utcYear',
    'setUTCFullYear',
    'randomInt(2025, 2028)',
    'Track and randomly update the UTC calendar year.',
  ),
  createDatePropertyExample(
    'month',
    'setMonth',
    'randomInt(0, 11)',
    'Track and randomly update the local month (0-11).',
  ),
  createDatePropertyExample(
    'utcMonth',
    'setUTCMonth',
    'randomInt(0, 11)',
    'Track and randomly update the UTC month (0-11).',
  ),
  createDatePropertyExample(
    'date',
    'setDate',
    'randomInt(1, 28)',
    'Track and randomly update the local day of month.',
  ),
  createDatePropertyExample(
    'utcDate',
    'setUTCDate',
    'randomInt(1, 28)',
    'Track and randomly update the UTC day of month.',
  ),
  createDatePropertyExample(
    'hours',
    'setHours',
    'randomInt(0, 23)',
    'Track and randomly update local hours.',
  ),
  createDatePropertyExample(
    'utcHours',
    'setUTCHours',
    'randomInt(0, 23)',
    'Track and randomly update UTC hours.',
  ),
  createDatePropertyExample(
    'minutes',
    'setMinutes',
    'randomInt(0, 59)',
    'Track and randomly update local minutes.',
  ),
  createDatePropertyExample(
    'utcMinutes',
    'setUTCMinutes',
    'randomInt(0, 59)',
    'Track and randomly update UTC minutes.',
  ),
  createDatePropertyExample(
    'seconds',
    'setSeconds',
    'randomInt(0, 59)',
    'Track and randomly update local seconds.',
  ),
  createDatePropertyExample(
    'utcSeconds',
    'setUTCSeconds',
    'randomInt(0, 59)',
    'Track and randomly update UTC seconds.',
  ),
  createDatePropertyExample(
    'milliseconds',
    'setMilliseconds',
    'randomInt(0, 999)',
    'Track and randomly update local milliseconds.',
  ),
  createDatePropertyExample(
    'utcMilliseconds',
    'setUTCMilliseconds',
    'randomInt(0, 999)',
    'Track and randomly update UTC milliseconds.',
  ),
  createDatePropertyExample(
    'time',
    'setTime',
    'Date.now() + randomInt(-60_000, 60_000)',
    'Track and randomly update epoch time in milliseconds.',
  ),
];

export const metadata = {
  title: 'Dates',
  description:
    'How rs-x handles Date values through property keys like month/year/time.',
};

export default function DatesCoreConceptPage() {
  return (
    <DocsPageTemplate>
      <div className="docsApiHeader">
        <div>
          <DocsBreadcrumbs
            items={[
              { label: 'Docs', href: '/docs' },
              { label: 'Core concepts', href: '/docs' },
              { label: 'Dates' },
            ]}
          />
          <p className="docsApiEyebrow">Core Concepts</p>
          <h1 className="sectionTitle">Dates</h1>
          <p className="sectionLead">
            Date fields are exposed as expression-friendly properties.
          </p>
        </div>
      </div>

      <div className="docsApiGrid">
        <article className="card docsApiCard">
          <h2 className="cardTitle">What it means</h2>
          <p className="cardText">
            rs-x maps Date methods to property keys so expressions stay
            declarative. Use <span className="codeInline">month</span>,{' '}
            <span className="codeInline">year</span>,{' '}
            <span className="codeInline">time</span>, and the UTC variants
            directly in paths.
          </p>
          <p className="cardText">
            This goes through{' '}
            <Link href="/docs/core-api/DatePropertyAccessor">
              <span className="codeInline">DatePropertyAccessor</span>
            </Link>
            . The accessor maps each property key to the matching Date
            getter/setter methods, so you read via keys in expressions and
            write via Date setter methods.
          </p>
          <p className="cardText">
            Example: use <span className="codeInline">invoiceDate.month</span>
            , not <span className="codeInline">invoiceDate.getMonth</span>{' '}
            inside the expression string.
          </p>
          <p className="cardText">
            For mutations, use native setter methods such as{' '}
            <span className="codeInline">setMonth</span>, not direct
            assignment like{' '}
            <span className="codeInline">invoiceDate.month = ...</span>.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Practical value</h2>
          <p className="cardText">
            You get one consistent path style for objects, collections, async
            values, and dates. Reads and writes on date properties are tracked
            through the same reactive pipeline.
          </p>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Key points</h2>
          <ul className="advancedTopicLinks">
            <li>
              Use property keys (for example month) for expression reads.
            </li>
            <li>
              Use Date setter methods (for example setMonth) for mutations.
            </li>
            <li>Every supported key has a matching getter/setter mapping.</li>
            <li>
              Local and UTC variants are separate keys (for example{' '}
              <span className="codeInline">month</span> vs{' '}
              <span className="codeInline">utcMonth</span>).
            </li>
            <li>
              <span className="codeInline">month</span> and{' '}
              <span className="codeInline">utcMonth</span> are zero-based.
            </li>
          </ul>
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Date property reference</h2>
          <DatePropertiesTable rows={datePropertyRows} />
        </article>

        <article className="card docsApiCard">
          <DatePropertyExamplesTabs tabs={datePropertyExamples} />
        </article>

        <article className="card docsApiCard">
          <h2 className="cardTitle">Related docs</h2>
          <ul className="docsApiLinkGrid">
            <li>
              <Link className="docsApiLinkItem" href="/docs/observation/date">
                <ItemLinkCardContent
                  title="Date observation"
                  meta="How Date changes are observed in runtime"
                />
              </Link>
            </li>
          </ul>
        </article>
      </div>
    </DocsPageTemplate>
  );
}
