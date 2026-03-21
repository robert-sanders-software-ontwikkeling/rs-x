import { parseExpressionDiagnostic } from '../lib/diagnostics/expression-diagnostics';

describe('expression diagnostics', () => {
  it('returns clear missing-right-operand diagnostic for addition', () => {
    expect(parseExpressionDiagnostic('a +')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a +'.",
    });
  });

  it('classifies unsupported expressions separately', () => {
    expect(parseExpressionDiagnostic('a = 1')).toEqual({
      category: 'unsupported',
      message: 'Assignment expressions are not supported',
    });
  });

  it('returns syntax diagnostic for and', () => {
    expect(parseExpressionDiagnostic('a &&')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a &&'.",
    });
  });

  it('returns syntax diagnostic for array', () => {
    expect(parseExpressionDiagnostic('[a,')).toEqual({
      category: 'syntax',
      message: "Unclosed token in '[a,'.",
    });
  });

  it('returns syntax diagnostic for big int', () => {
    expect(parseExpressionDiagnostic('1n.')).toEqual({
      category: 'syntax',
      message: "Syntax error in expression '1n.'.",
    });
  });

  it('returns syntax diagnostic for bitwise and', () => {
    expect(parseExpressionDiagnostic('a &')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a &'.",
    });
  });

  it('returns syntax diagnostic for bitwise left shift', () => {
    expect(parseExpressionDiagnostic('a <<')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a <<'.",
    });
  });

  it('returns syntax diagnostic for bitwise not', () => {
    expect(parseExpressionDiagnostic('~')).toEqual({
      category: 'syntax',
      message: "Missing operand for '~'.",
    });
  });

  it('returns syntax diagnostic for bitwise or', () => {
    expect(parseExpressionDiagnostic('a |')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a |'.",
    });
  });

  it('returns syntax diagnostic for bitwise right shift', () => {
    expect(parseExpressionDiagnostic('a >>')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a >>'.",
    });
  });

  it('returns syntax diagnostic for bitwise unsigned right shift', () => {
    expect(parseExpressionDiagnostic('a >>>')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a >>>'.",
    });
  });

  it('returns syntax diagnostic for bitwise xor', () => {
    expect(parseExpressionDiagnostic('a ^')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a ^'.",
    });
  });

  it('returns syntax diagnostic for boolean', () => {
    expect(parseExpressionDiagnostic('true &&')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'true &&'.",
    });
  });

  it('returns syntax diagnostic for conditional', () => {
    expect(parseExpressionDiagnostic('a ? b :')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a ? b :'.",
    });
  });

  it('returns syntax diagnostic for division', () => {
    expect(parseExpressionDiagnostic('a /')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a /'.",
    });
  });

  it('returns syntax diagnostic for equality', () => {
    expect(parseExpressionDiagnostic('a ==')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a =='.",
    });
  });

  it('returns syntax diagnostic for exponentiation', () => {
    expect(parseExpressionDiagnostic('a **')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a **'.",
    });
  });

  it('returns syntax diagnostic for function', () => {
    expect(parseExpressionDiagnostic('sum(')).toEqual({
      category: 'syntax',
      message: "Unclosed token in 'sum('.",
    });
  });

  it('returns syntax diagnostic for greater than', () => {
    expect(parseExpressionDiagnostic('a >')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a >'.",
    });
  });

  it('returns syntax diagnostic for greater than or equal', () => {
    expect(parseExpressionDiagnostic('a >=')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a >='.",
    });
  });

  it('returns syntax diagnostic for identifier', () => {
    expect(parseExpressionDiagnostic('a.')).toEqual({
      category: 'syntax',
      message: "Syntax error in expression 'a.'.",
    });
  });

  it('returns syntax diagnostic for in', () => {
    expect(parseExpressionDiagnostic('"x" in')).toEqual({
      category: 'syntax',
      message: "Missing right operand for '" + '"x" in' + "'.",
    });
  });

  it('returns syntax diagnostic for index', () => {
    expect(parseExpressionDiagnostic('arr[')).toEqual({
      category: 'syntax',
      message: "Unclosed token in 'arr['.",
    });
  });

  it('returns syntax diagnostic for inequality', () => {
    expect(parseExpressionDiagnostic('a !=')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a !='.",
    });
  });

  it('returns syntax diagnostic for instanceof', () => {
    expect(parseExpressionDiagnostic('a instanceof')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a instanceof'.",
    });
  });

  it('returns syntax diagnostic for less than', () => {
    expect(parseExpressionDiagnostic('a <')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a <'.",
    });
  });

  it('returns syntax diagnostic for less than or equal', () => {
    expect(parseExpressionDiagnostic('a <=')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a <='.",
    });
  });

  it('returns syntax diagnostic for member', () => {
    expect(parseExpressionDiagnostic('obj.')).toEqual({
      category: 'syntax',
      message: "Syntax error in expression 'obj.'.",
    });
  });

  it('returns syntax diagnostic for multiplication', () => {
    expect(parseExpressionDiagnostic('a *')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a *'.",
    });
  });

  it('returns syntax diagnostic for new', () => {
    expect(parseExpressionDiagnostic('new')).toEqual({
      category: 'syntax',
      message: "Missing operand for 'new'.",
    });
  });

  it('returns syntax diagnostic for not', () => {
    expect(parseExpressionDiagnostic('!')).toEqual({
      category: 'syntax',
      message: "Missing operand for '!'.",
    });
  });

  it('returns syntax diagnostic for null', () => {
    expect(parseExpressionDiagnostic('null &&')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'null &&'.",
    });
  });

  it('returns syntax diagnostic for nullish coalescing', () => {
    expect(parseExpressionDiagnostic('a ??')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a ??'.",
    });
  });

  it('returns syntax diagnostic for number', () => {
    expect(parseExpressionDiagnostic('1e+')).toEqual({
      category: 'syntax',
      message: "Syntax error in expression '1e+'.",
    });
  });

  it('returns syntax diagnostic for object', () => {
    expect(parseExpressionDiagnostic('({ a: })')).toEqual({
      category: 'syntax',
      message: "Syntax error in expression '({ a: })'.",
    });
  });

  it('returns syntax diagnostic for or', () => {
    expect(parseExpressionDiagnostic('a ||')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a ||'.",
    });
  });

  it('returns syntax diagnostic for property', () => {
    expect(parseExpressionDiagnostic('({ : a })')).toEqual({
      category: 'syntax',
      message: "Syntax error in expression '({ : a })'.",
    });
  });

  it('returns syntax diagnostic for regular expression', () => {
    expect(parseExpressionDiagnostic('/[a-z')).toEqual({
      category: 'syntax',
      message: "Unterminated regular expression literal in '/[a-z'.",
    });
  });

  it('returns syntax diagnostic for remain', () => {
    expect(parseExpressionDiagnostic('a %')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a %'.",
    });
  });

  it('returns syntax diagnostic for sequence', () => {
    expect(parseExpressionDiagnostic('(a,)')).toEqual({
      category: 'syntax',
      message: "Syntax error in expression '(a,)'.",
    });
  });

  it('returns syntax diagnostic for spread', () => {
    expect(parseExpressionDiagnostic('[... ]')).toEqual({
      category: 'syntax',
      message: "Syntax error in expression '[... ]'.",
    });
  });

  it('returns syntax diagnostic for strict equality', () => {
    expect(parseExpressionDiagnostic('a ===')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a ==='.",
    });
  });

  it('returns syntax diagnostic for strict inequality', () => {
    expect(parseExpressionDiagnostic('a !==')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a !=='.",
    });
  });

  it('returns syntax diagnostic for string', () => {
    expect(parseExpressionDiagnostic('"unterminated')).toEqual({
      category: 'syntax',
      message: "Unterminated string literal in '" + '"unterminated' + "'.",
    });
  });

  it('returns syntax diagnostic for subtraction', () => {
    expect(parseExpressionDiagnostic('a -')).toEqual({
      category: 'syntax',
      message: "Missing right operand for 'a -'.",
    });
  });

  it('returns syntax diagnostic for template literal', () => {
    expect(parseExpressionDiagnostic('`hello ${')).toEqual({
      category: 'syntax',
      message: "Unterminated template literal in '`hello ${'.",
    });
  });

  it('returns syntax diagnostic for typeof', () => {
    expect(parseExpressionDiagnostic('typeof')).toEqual({
      category: 'syntax',
      message: "Missing operand for 'typeof'.",
    });
  });

  it('returns syntax diagnostic for unary negation', () => {
    expect(parseExpressionDiagnostic('-')).toEqual({
      category: 'syntax',
      message: "Missing operand for '-'.",
    });
  });

  it('returns syntax diagnostic for unary plus', () => {
    expect(parseExpressionDiagnostic('+')).toEqual({
      category: 'syntax',
      message: "Missing operand for '+'.",
    });
  });
});
