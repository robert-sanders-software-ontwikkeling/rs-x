import type { BehaviorSubject, Observable, ReplaySubject } from 'rxjs';

import {
  type IExpression,
  type IExpressionFactory,
  rsx,
} from '@rs-x/expression-parser';

interface Model {
  count: number;
  lines: { lineTotal: number }[];
  index: number;
  key: string;
  items: number[];
  lookup: Record<string, number>;
  map: Map<string, number>;
  tasks: Set<{ id: string; done: boolean }>;
  taskId: string;
  nestedA: {
    map: Record<string, number>;
  };
  invoiceDate: Date;
  x: Observable<{
    y: {
      z: number;
    };
  }>;
  nestedObservablePath: Observable<{
    y: Observable<{
      z: number;
    }>;
  }>;
  obsNumber: Observable<number>;
  subjNumber: BehaviorSubject<number>;
  replayNumber: ReplaySubject<number>;
  a: {
    b: BehaviorSubject<{
      c: BehaviorSubject<{
        d: number;
      }>;
    }>;
  };
  user: {
    name: string;
    multiplier(value: number): {
      total: number;
    };
  };
  multiply(a: number, b: number): number;
  getNumber$(): Observable<number>;
  cart: {
    items: { qty: number }[];
    first(): { qty: number } | undefined;
  };
}

declare const model: Model;
declare const expressionFactory: IExpressionFactory;
declare const modularModel: {
  x1: IExpression<number>;
  x2: IExpression<string>;
  xObj: IExpression<{ total: number }>;
};

// valid
rsx('count * 2')(model);
rsx('(count + 2) * 3')(model);
rsx('user.name + "!"')(model);
rsx('user.multiplier(2).total')(model);
rsx('items[1]')(model);
rsx('lookup["a"]')(model);
rsx('items[index]')(model);
rsx('lookup[key]')(model);
rsx('nestedA.map[key]')(model);
rsx('map["b"]')(model);
rsx('map[key]')(model);
rsx('tasks[taskId]')(model);
rsx('invoiceDate.year')(model);
rsx('x.y.z')(model);
rsx('nestedObservablePath.y.z')(model);
rsx('obsNumber + 1')(model);
rsx('subjNumber + 1')(model);
rsx('replayNumber + 1')(model);
rsx('getNumber$() + 1')(model);
rsx('a.b.c.d')(model);
rsx('cart.first().qty')(model);
rsx('lines.reduce((sum, line) => sum + line.lineTotal, 0)')(model);
expressionFactory.create(model, 'multiply(count, 2)');
rsx('x1 * 3')(modularModel);
rsx('xObj.total * 2')(modularModel);

// invalid identifier
rsx('missing')(model);

// invalid member
rsx('user.unknown')(model);

// invalid function argument type
rsx('user.multiplier("2").total')(model);

// invalid multiplication operands
rsx('user.name * 2')(model);
rsx('count + true')(model);
rsx('+user.name')(model);
rsx('count - user.name')(model);
rsx('x2 * 3')(modularModel);

// invalid factory expression member after function
expressionFactory.create(model, 'user.multiplier(2).missingTotal');

// valid globals from GlobalIdentifierOwnerResolver
rsx('new Date()')(model);
