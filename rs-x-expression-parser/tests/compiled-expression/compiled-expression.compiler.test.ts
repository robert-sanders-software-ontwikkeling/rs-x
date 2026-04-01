import { CompiledExpressionCompiler } from '../../lib/compiled-expression/compiled-expression.compiler';
import { JsExpressionAstParser } from '../../lib/js-expression-ast-parser';
import { ExpressionType } from '../../lib/expressions/expression-parser.interface';

describe('CompiledExpressionCompiler', () => {
  it('should bypass AST parser for simple identifier expressions and cache them', () => {
    const parser = new JsExpressionAstParser();
    const parseSpy = jest.spyOn(parser, 'parse');
    const compiler = new CompiledExpressionCompiler(parser);

    const plan = compiler.tryCompile('foo');
    expect(plan).toBeDefined();
    expect(plan?.expressionType).toBe(ExpressionType.Identifier);
    expect(parseSpy).not.toHaveBeenCalled();

    const plan2 = compiler.tryCompile('foo');
    expect(plan2).toBe(plan);
    expect(parseSpy).not.toHaveBeenCalled();

    const plan3 = compiler.tryCompile('foo + bar');
    expect(plan3).toBeDefined();
    expect(plan3?.expressionType).toBe(ExpressionType.Addition);
    expect(parseSpy).toHaveBeenCalled();
  });

  it('should not fast-path reserved words and should use parser', () => {
    const parser = new JsExpressionAstParser();
    const parseSpy = jest.spyOn(parser, 'parse');
    const compiler = new CompiledExpressionCompiler(parser);

    const truePlan = compiler.tryCompile('true');
    expect(truePlan).toBeDefined();
    expect(truePlan?.expressionType).toBe(ExpressionType.Boolean);

    const nullPlan = compiler.tryCompile('null');
    expect(nullPlan).toBeDefined();
    expect(nullPlan?.expressionType).toBe(ExpressionType.Null);

    const forPlan = compiler.tryCompile('for');
    expect(forPlan).toBeUndefined();

    const ifPlan = compiler.tryCompile('if');
    expect(ifPlan).toBeUndefined();

    expect(parseSpy).toHaveBeenCalled();
  });

  it('should handle unicode identifiers via parser fallback', () => {
    const parser = new JsExpressionAstParser();
    const parseSpy = jest.spyOn(parser, 'parse');
    const compiler = new CompiledExpressionCompiler(parser);

    const plan = compiler.tryCompile('fooΩ');
    expect(plan).toBeDefined();
    expect(plan?.expressionType).toBe(ExpressionType.Identifier);
    expect(parseSpy).toHaveBeenCalled();
  });

  it('should bypass AST parser for static member chain expressions and construct member chain plan', () => {
    const parser = new JsExpressionAstParser();
    const parseSpy = jest.spyOn(parser, 'parse');
    const compiler = new CompiledExpressionCompiler(parser);

    const plan = compiler.tryCompile('a.b.c');
    expect(plan).toBeDefined();
    expect(plan?.expressionType).toBe(ExpressionType.Member);
    expect(plan?.dependencyNames).toEqual(['a']);
    expect(plan?.memberChain).toEqual({
      rootIdentifier: 'a',
      segments: [
        { kind: 'static', key: 'b' },
        { kind: 'static', key: 'c' },
      ],
    });
    expect(plan?.watchDependencies).toEqual([
      { name: 'a', ownerPath: [], isLeaf: false, isMemberExpressionSegment: true },
      { name: 'b', ownerPath: ['a'], isLeaf: false, isMemberExpressionSegment: true },
      { name: 'c', ownerPath: ['a', 'b'], isLeaf: true, isMemberExpressionSegment: true },
    ]);
    expect(parseSpy).not.toHaveBeenCalled();
  });

  it('should return undefined for invalid expressions', () => {
    const parser = new JsExpressionAstParser();
    const compiler = new CompiledExpressionCompiler(parser);

    expect(compiler.tryCompile('1foo')).toBeUndefined();
    expect(compiler.tryCompile('foo bar')).toBeUndefined();
  });
});
