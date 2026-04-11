import { BehaviorSubject, Subject } from 'rxjs';

import { InjectionContainer, WaitForEvent } from '@rs-x/core';

import type { ICompiledExpressionPlan } from '../../lib/compiled-expression/compiled-expression.compiler.interface';
import {
  clearPrecompiledCompiledExpressionPlans,
  registerPrecompiledCompiledExpressionPlan,
} from '../../lib/compiled-expression/precompiled-expression-plan-registry';
import type { IExpressionFactory } from '../../lib/expression-factory';
import { ExpressionType } from '../../lib/expressions/expression-parser.interface';
import {
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule,
} from '../../lib/rs-x-expression-parser.module';
import { RsXExpressionParserInjectionTokens } from '../../lib/rs-x-expression-parser-injection-tokes';
import { rsx } from '../../lib/rsx';

async function waitForValue(
  expression: { value: unknown },
  maxRounds = 200,
): Promise<void> {
  for (let i = 0; i < maxRounds; i += 1) {
    if (expression.value !== undefined) {
      return;
    }
    await Promise.resolve();
  }
}

describe('Compiled expression engine integration', () => {
  const previousMode = process.env.RSX_EXPRESSION_ENGINE_MODE;
  let expressionFactory: IExpressionFactory;

  beforeAll(async () => {
    process.env.RSX_EXPRESSION_ENGINE_MODE = 'compiled';
    await InjectionContainer.load(RsXExpressionParserModule);
    expressionFactory = InjectionContainer.get(
      RsXExpressionParserInjectionTokens.IExpressionFactory,
    ) as IExpressionFactory;
  });

  afterAll(async () => {
    if (previousMode === undefined) {
      delete process.env.RSX_EXPRESSION_ENGINE_MODE;
    } else {
      process.env.RSX_EXPRESSION_ENGINE_MODE = previousMode;
    }
    await unloadRsXExpressionParserModule();
  });

  afterEach(() => {
    clearPrecompiledCompiledExpressionPlans();
  });

  it('evaluates and updates compiled arithmetic expressions', async () => {
    const model = { a: 2, b: 3, c: 4 };
    const expression = rsx<number>('(a + b) * (a + c)')(model);
    expect(expression.type).toBe(ExpressionType.Multiplication);
    await waitForValue(expression);
    expect(expression.value).toBe(30);

    await new WaitForEvent(expression, 'changed').wait(() => {
      model.a = 10;
    });
    expect(expression.value).toBe((10 + 3) * (10 + 4));

    expression.dispose();
  });

  it('falls back to tree parser for unsupported shapes', async () => {
    const model = {
      a: { b: 5 },
      c: 3,
    };
    const expression = rsx<number>('a.b + c')(model);
    expect(expression.type).toBe(ExpressionType.Addition);
    await waitForValue(expression);
    expect(expression.value).toBe(8);
    expression.dispose();
  });

  it('uses precompiled registry plan when expression is created through rsx shortcut', async () => {
    const expressionString = 'a + b';
    const plan: ICompiledExpressionPlan = {
      expressionString,
      dependencyNames: ['a', 'b'],
      watchDependencies: [
        {
          name: 'a',
          ownerPath: [],
          isLeaf: true,
          isMemberExpressionSegment: false,
        },
        {
          name: 'b',
          ownerPath: [],
          isLeaf: true,
          isMemberExpressionSegment: false,
        },
      ],
      expressionType: ExpressionType.Addition,
      hasHiddenArgumentArray: false,
      memberChain: undefined,
      sequenceOperands: undefined,
      evaluate: (a: unknown, b: unknown) => Number(a) * 10 + Number(b),
      evaluateResolvedDependencies: (
        model: unknown,
        identifierOwnerResolver: {
          resolve: (index: unknown, context?: unknown) => unknown;
        },
        indexValueAccessor: {
          getResolvedValue: (context: unknown, index: string) => unknown;
          getValue: (context: unknown, index: string) => unknown;
        },
      ) => {
        const aOwner = identifierOwnerResolver.resolve('a', model) ?? model;
        const bOwner = identifierOwnerResolver.resolve('b', model) ?? model;
        const aResolved = indexValueAccessor.getResolvedValue(aOwner, 'a');
        const bResolved = indexValueAccessor.getResolvedValue(bOwner, 'b');
        const aRaw =
          aResolved !== undefined
            ? aResolved
            : indexValueAccessor.getValue(aOwner, 'a');
        const bRaw =
          bResolved !== undefined
            ? bResolved
            : indexValueAccessor.getValue(bOwner, 'b');
        return Number(aRaw) * 10 + Number(bRaw);
      },
    };

    registerPrecompiledCompiledExpressionPlan(expressionString, plan);
    const model = { a: 2, b: 3 };
    const expression = rsx<number>(expressionString)(model);

    await waitForValue(expression);
    expect(expression.value).toBe(23);
    await new WaitForEvent(expression, 'changed').wait(() => {
      model.a = 5;
    });
    expect(expression.value).toBe(53);
    expression.dispose();
  });

  it('uses precompiled registry plan when expression is created through expressionFactory.create', async () => {
    const expressionString = 'a + b';
    const plan: ICompiledExpressionPlan = {
      expressionString,
      dependencyNames: ['a', 'b'],
      watchDependencies: [
        {
          name: 'a',
          ownerPath: [],
          isLeaf: true,
          isMemberExpressionSegment: false,
        },
        {
          name: 'b',
          ownerPath: [],
          isLeaf: true,
          isMemberExpressionSegment: false,
        },
      ],
      expressionType: ExpressionType.Addition,
      hasHiddenArgumentArray: false,
      memberChain: undefined,
      sequenceOperands: undefined,
      evaluate: (a: unknown, b: unknown) => Number(a) * 10 + Number(b),
      evaluateResolvedDependencies: (
        model: unknown,
        identifierOwnerResolver: {
          resolve: (index: unknown, context?: unknown) => unknown;
        },
        indexValueAccessor: {
          getResolvedValue: (context: unknown, index: string) => unknown;
          getValue: (context: unknown, index: string) => unknown;
        },
      ) => {
        const aOwner = identifierOwnerResolver.resolve('a', model) ?? model;
        const bOwner = identifierOwnerResolver.resolve('b', model) ?? model;
        const aResolved = indexValueAccessor.getResolvedValue(aOwner, 'a');
        const bResolved = indexValueAccessor.getResolvedValue(bOwner, 'b');
        const aRaw =
          aResolved !== undefined
            ? aResolved
            : indexValueAccessor.getValue(aOwner, 'a');
        const bRaw =
          bResolved !== undefined
            ? bResolved
            : indexValueAccessor.getValue(bOwner, 'b');
        return Number(aRaw) * 10 + Number(bRaw);
      },
    };

    registerPrecompiledCompiledExpressionPlan(expressionString, plan);
    const model = { a: 1, b: 4 };
    const expression = expressionFactory.create<number>(
      model,
      expressionString,
    );

    await waitForValue(expression);
    expect(expression.value).toBe(14);
    await new WaitForEvent(expression, 'changed').wait(() => {
      model.b = 9;
    });
    expect(expression.value).toBe(19);
    expression.dispose();
  });

  describe('AOT plan without evaluateResolvedDependencies (evaluate-only path)', () => {
    // These tests cover the case where an AOT build registers a plan that only
    // has `evaluate` (no `evaluateResolvedDependencies`). This is the default
    // AOT output when includeResolvedEvaluator is false.
    function makeAotAddPlan(): ICompiledExpressionPlan {
      return {
        expressionString: 'a + b',
        dependencyNames: ['a', 'b'],
        watchDependencies: [
          {
            name: 'a',
            ownerPath: [],
            isLeaf: true,
            isMemberExpressionSegment: false,
          },
          {
            name: 'b',
            ownerPath: [],
            isLeaf: true,
            isMemberExpressionSegment: false,
          },
        ],
        expressionType: ExpressionType.Addition,
        hasHiddenArgumentArray: false,
        memberChain: undefined,
        sequenceOperands: undefined,
        evaluate: (a: unknown, b: unknown) => Number(a) + Number(b),
        // No evaluateResolvedDependencies — mirrors the default AOT output
      };
    }

    it('resolves when both dependencies are plain values', async () => {
      registerPrecompiledCompiledExpressionPlan('a + b', makeAotAddPlan());
      const model = { a: 10, b: 20 };
      const expression = rsx<number>('a + b')(model);

      await waitForValue(expression);

      expect(expression.value).toBe(30);
      expression.dispose();
    });

    it('resolves when b is a BehaviorSubject (synchronous Observable emission)', async () => {
      registerPrecompiledCompiledExpressionPlan('a + b', makeAotAddPlan());
      const model = { a: 10, b: new BehaviorSubject<number>(5) };
      const expression = rsx<number>('a + b')(model);

      await waitForValue(expression);

      expect(expression.value).toBe(15);
      expression.dispose();
    });

    it('stays pending then resolves when b is a cold Observable that emits later', async () => {
      registerPrecompiledCompiledExpressionPlan('a + b', makeAotAddPlan());
      const subject = new Subject<number>();
      const model = { a: 10, b: subject.asObservable() };
      const expression = rsx<number>('a + b')(model);

      // Wait for initial evaluation cycle (value will be PENDING while b has not emitted)
      await new WaitForEvent(expression, 'changed').wait(() => {});
      expect(typeof expression.value).not.toBe('number');

      // Now trigger the Observable emission and wait for the expression to resolve
      await new WaitForEvent(expression, 'changed', {
        ignoreInitialValue: true,
      }).wait(() => {
        subject.next(7);
      });

      expect(expression.value).toBe(17);
      expression.dispose();
    });

    it('stays pending then resolves when b is a Promise', async () => {
      registerPrecompiledCompiledExpressionPlan('a + b', makeAotAddPlan());
      let resolvePromise!: (value: number) => void;
      const promise = new Promise<number>((resolve) => {
        resolvePromise = resolve;
      });
      const model = { a: 10, b: promise };
      const expression = rsx<number>('a + b')(model);

      // Wait for initial evaluation cycle (PENDING while promise has not resolved)
      await new WaitForEvent(expression, 'changed').wait(() => {});
      expect(typeof expression.value).not.toBe('number');

      // Resolve the Promise and wait for the expression to update
      await new WaitForEvent(expression, 'changed', {
        ignoreInitialValue: true,
      }).wait(() => {
        resolvePromise(8);
      });

      expect(expression.value).toBe(18);
      expression.dispose();
    });

    it('updates when b is a BehaviorSubject and emits a new value', async () => {
      registerPrecompiledCompiledExpressionPlan('a + b', makeAotAddPlan());
      const subject = new BehaviorSubject<number>(5);
      const model = { a: 10, b: subject };
      const expression = rsx<number>('a + b')(model);

      await waitForValue(expression);
      expect(expression.value).toBe(15);

      await new WaitForEvent(expression, 'changed', {
        ignoreInitialValue: true,
      }).wait(() => {
        subject.next(20);
      });

      expect(expression.value).toBe(30);
      expression.dispose();
    });
  });
});
