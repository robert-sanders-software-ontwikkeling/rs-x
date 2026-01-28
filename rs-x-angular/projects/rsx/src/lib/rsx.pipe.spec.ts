import { ChangeDetectorRef, runInInjectionContext } from '@angular/core';
import { InjectionContainer, Type, UnsupportedException } from '@rs-x/core';
import {
  type IExpression,
  type IExpressionFactory,
  RsXExpressionParserInjectionTokens,
  RsXExpressionParserModule,
  unloadRsXExpressionParserModule
} from '@rs-x/expression-parser';
import { BehaviorSubject, type Subscription } from 'rxjs';
import { vi } from 'vitest';
import { RsxPipe } from './rsx.pipe';
import { IExpressionFactoryToken } from './rsx.providers';


describe('RsxPipe', () => {
  let pipe: RsxPipe;
  let cdr: ChangeDetectorRef;
  let expressionFactory: IExpressionFactory;

  beforeAll(async () => {
    await InjectionContainer.load(RsXExpressionParserModule);
    expressionFactory = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionFactory);

  });

  afterAll(async () => {
    await unloadRsXExpressionParserModule();
  });

  beforeEach(() => {
    cdr = Type.cast({
      markForCheck: vi.fn()
    });

    pipe = runInInjectionContext(
      {
        get: (token: unknown) => {
          if (token === ChangeDetectorRef) {
            return cdr;
          }
          if (token === IExpressionFactoryToken) {
            return expressionFactory;
          }
          throw new Error(`No provider for ${token}`);
        }
      },
      () => new RsxPipe()
    );
  });

  it('will thrown an error when not passing in null|undefined, IExpression, or string', async () => {
    expect(() => pipe.transform(Type.cast({}), {})).toThrow(new UnsupportedException(`string or IExpression expected`));
  });

  it('evaluates a simple expression string', async () => {
    const ctx = { x: 10 };
    pipe.transform('x + 2', ctx);
    // rsx expression will emit  the initial value after initialize so wait until all already-scheduled microtasks have run.
    await Promise.resolve()

    const actual = pipe.transform('x + 2', ctx);

    expect(actual).toEqual(12);
  });


  it('evaluates a simple expression', async () => {
    const expression = expressionFactory.create({ x: 10 }, 'x + 2');
    try {
      pipe.transform(expression);
      // rsx expression will emit  the initial value after initialize so wait until all already-scheduled microtasks have run.
      await Promise.resolve()

      const actual = pipe.transform(expression);

      expect(actual).toEqual(12);

    } finally {
      expression.dispose();
    }
  });

  it('reacts to observable changes', async () => {
    const value$ = new BehaviorSubject(1);
    const ctx = { value: value$ };

    pipe.transform('value + 1', ctx);
    await Promise.resolve()

    let actual = pipe.transform('value + 1', ctx);
    expect(actual).toEqual(2);

    value$.next(5);

    await Promise.resolve();

    actual = pipe.transform('value + 1', ctx);
    expect(actual).toEqual(6);
  });

  it('reacts to expresion change', async () => {
    const ctx = { x: 10 };
    pipe.transform('x + 2', ctx);
    await Promise.resolve();

    let actual = pipe.transform('x + 2', ctx);
    expect(actual).toEqual(12);

    pipe.transform('x + 3', ctx);
    await Promise.resolve();

    actual = pipe.transform('x + 3', ctx);
    expect(actual).toEqual(13);
  });

  it('creates a new expression when expression string changes', async () => {
    const ctx = { x: 10 };
    const createSpy = vi.spyOn(expressionFactory, 'create');

    try {
      pipe.transform('x + 2', ctx);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toBeCalledWith(ctx, 'x + 2');

      createSpy.mockClear();
      pipe.transform('x + 3', ctx);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toBeCalledWith(ctx, 'x + 3');
    } finally {
      createSpy.mockRestore();
    }
  });

  it('creates a new expression when context string changes', async () => {
    const ctx = { x: 10 };
    const createSpy = vi.spyOn(expressionFactory, 'create');

    try {
      pipe.transform('x + 2', ctx);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toBeCalledWith(ctx, 'x + 2');

      createSpy.mockClear();
      const newCtx = { x: 100 };

      pipe.transform('x + 2', newCtx);

      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toBeCalledWith(newCtx, 'x + 2');

    } finally {
      createSpy.mockRestore();
    }
  });

  it('dipose old expression when expression string changes', async () => {
    const ctx = { x: 10 };
    pipe.transform('x + 2', ctx);
    const disposeExpressionSpy = vi.spyOn(Type.cast<{ disposeExpression: () => void }>(pipe), 'disposeExpression');
    try {

      pipe.transform('x + 2', ctx);

      expect(disposeExpressionSpy).not.toHaveBeenCalled();

      pipe.transform('x + 3', ctx);

      expect(disposeExpressionSpy).toHaveBeenCalledTimes(1);
    } finally {
      disposeExpressionSpy.mockRestore();
    }
  });

  it('dipose old expression when context changes', async () => {
    const ctx = { x: 10 };
    pipe.transform('x + 2', ctx);
    const disposeExpressionSpy = vi.spyOn(Type.cast<{ disposeExpression: () => void }>(pipe), 'disposeExpression');
    try {

      pipe.transform('x + 2', ctx);

      expect(disposeExpressionSpy).not.toHaveBeenCalled();

      pipe.transform('x + 2', { x: 100 });

      expect(disposeExpressionSpy).toHaveBeenCalledTimes(1);
    } finally {
      disposeExpressionSpy.mockRestore();
    }
  });

  it('disposeExpression will dispose expression if it owns it', () => {
    pipe.transform('x + 2', { x: 1 });
    const pipeWithExpression = Type.cast<{ _expression: IExpression, _changedSubscription?: Subscription }>(pipe);
    const disposeSpy = vi.spyOn(pipeWithExpression._expression, 'dispose');

    pipe.transform(Type.cast(null));

    expect(disposeSpy).toHaveBeenCalledTimes(1);

  });

  it('disposeExpression will not dispose expression if doesn not own it', () => {
    const expression = expressionFactory.create({ x: 1 }, 'x + 2')
    try {
      pipe.transform(expression);
      const disposeSpy = vi.spyOn(expression, 'dispose');

      pipe.transform(Type.cast(null));

      expect(disposeSpy).not.toHaveBeenCalled()
    } finally {
      expression.dispose();
    }
  });

  it('disposeExpression will will unsubscribe to changed event', () => {
    pipe.transform('x + 2', { x: 1 });
    const pipeWithExpression = Type.cast<{ _expression: IExpression, _changedSubscription?: Subscription }>(pipe);

    const unsubscribeExpression = vi.spyOn(pipeWithExpression._changedSubscription as Subscription, 'unsubscribe');

    pipe.transform('x + 2', { x: 2 });
    expect(unsubscribeExpression).toHaveBeenCalledTimes(1);

  });

  it('cleans up expressions on destroy', () => {
    const disposeSpy = vi.spyOn(Type.cast<{ disposeExpression: () => void }>(pipe), 'disposeExpression');

    pipe.ngOnDestroy();

    expect(disposeSpy).toHaveBeenCalled();
  });
});