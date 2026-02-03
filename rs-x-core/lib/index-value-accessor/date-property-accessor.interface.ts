import { type IIndexValueAccessor } from './index-value-accessor.interface';

export type DateProperty =
  | 'year'
  | 'utcYear'
  | 'month'
  | 'utcMonth'
  | 'date'
  | 'utcDate'
  | 'hours'
  | 'utcHours'
  | 'minutes'
  | 'utcMinutes'
  | 'seconds'
  | 'utcSeconds'
  | 'milliseconds'
  | 'utcMilliseconds'
  | 'time';

export const dataProperties: readonly DateProperty[] = [
  'year',
  'utcYear',
  'month',
  'utcMonth',
  'date',
  'utcDate',
  'hours',
  'utcHours',
  'minutes',
  'utcMinutes',
  'seconds',
  'utcSeconds',
  'milliseconds',
  'utcMilliseconds',
  'time',
];

export type IDatePropertyAccessor = IIndexValueAccessor<Date, DateProperty>;
