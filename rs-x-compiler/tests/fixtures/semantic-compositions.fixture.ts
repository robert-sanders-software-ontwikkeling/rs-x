import { rsx } from '@rs-x/expression-parser';

interface Model {
  count: number;
  index: number;
  key: string;
  isArchived: boolean;
  items: number[];
  lookup: Record<string, number>;
  map: Map<string, number>;
  user: {
    name: string;
    multiplier(value: number): {
      total: number;
    };
  };
}

declare const model: Model;

// Valid composed expressions
rsx('`hello ${user.name}`')(model);
rsx('count > 0 ? user.multiplier(count).total : map[key]')(model);
rsx(
  'count > 0 && user.multiplier(count).total > 10 ? items[index] : lookup[key]',
)(model);
rsx('lookup[key] ?? items[index]')(model);
rsx('!isArchived || user.name == "admin"')(model);

// Invalid composed expressions
rsx('`hello ${user.unknown}`')(model);
rsx('count > 0 ? user.multiplier("x").total : map[key]')(model);
rsx('`hello ${user.name`')(model);
rsx('`hello ${message(a.b }`')(model);
