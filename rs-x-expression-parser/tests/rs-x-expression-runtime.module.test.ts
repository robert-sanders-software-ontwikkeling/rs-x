const additionAst = {
  type: 'BinaryExpression',
  left: { type: 'Identifier', name: 'x', start: 0, end: 1, range: [0, 1] },
  right: { type: 'Identifier', name: 'y', start: 4, end: 5, range: [4, 5] },
  operator: '+',
  start: 0,
  end: 5,
  range: [0, 5],
} as const;

describe('RsXExpressionRuntimeModule', () => {
  it('keeps parser-only services out of the lightweight runtime module', async () => {
    jest.resetModules();

    const { InjectionContainer } = await import('@rs-x/core');
    const { RsXExpressionParserInjectionTokens } =
      await import('../lib/rs-x-expression-parser-injection-tokes');
    const { RsXExpressionRuntimeModule, unloadRsXExpressionRuntimeModule } =
      await import('../lib/rs-x-expression-runtime.module');

    await InjectionContainer.load(RsXExpressionRuntimeModule);
    try {
      expect(
        InjectionContainer.isBound(
          RsXExpressionParserInjectionTokens.IExpressionParser,
        ),
      ).toBe(false);
      expect(
        InjectionContainer.isBound(
          RsXExpressionParserInjectionTokens.IJsExpressionAstParser,
        ),
      ).toBe(false);
      expect(
        InjectionContainer.isBound(
          RsXExpressionParserInjectionTokens.ICompiledExpressionCompiler,
        ),
      ).toBe(false);
    } finally {
      await unloadRsXExpressionRuntimeModule();
    }
  });

  it('creates and initializes preparsed expressions without parser bindings', async () => {
    jest.resetModules();

    const { InjectionContainer, WaitForEvent, emptyFunction } =
      await import('@rs-x/core');
    const {
      clearLazyExpressionPreloaders,
      clearPreparsedExpressionAsts,
      registerPreparsedExpressionAst,
    } = await import('../lib/expression-cache');
    const { RsXExpressionParserInjectionTokens } =
      await import('../lib/rs-x-expression-parser-injection-tokes');
    const { RsXExpressionRuntimeModule, unloadRsXExpressionRuntimeModule } =
      await import('../lib/rs-x-expression-runtime.module');

    clearPreparsedExpressionAsts();
    clearLazyExpressionPreloaders();
    registerPreparsedExpressionAst('x + y', additionAst as any);

    await InjectionContainer.load(RsXExpressionRuntimeModule);
    try {
      const expressionFactory = InjectionContainer.get<any>(
        RsXExpressionParserInjectionTokens.IExpressionFactory,
      );
      const expression = expressionFactory.create({ x: 2, y: 3 }, 'x + y');

      try {
        if (expression.value === undefined) {
          await new WaitForEvent(expression, 'changed').wait(emptyFunction);
        }

        expect(expression.value).toBe(5);
      } finally {
        expression.dispose();
      }
    } finally {
      clearPreparsedExpressionAsts();
      clearLazyExpressionPreloaders();
      await unloadRsXExpressionRuntimeModule();
    }
  });
});
