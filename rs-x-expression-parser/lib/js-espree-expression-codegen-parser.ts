import { Injectable } from '@rs-x/core';

import { AbstractJsEspreeExpressionParser } from './abstract-js-espree-expression-parser';

@Injectable()
export class JsEspreeExpressionCodegenParser extends AbstractJsEspreeExpressionParser<string> {
  protected override createConstantStringExpression(value: string): string {
    return this.buildConstructor('ConstantStringExpression', [value]);
  }

  protected override createConstantNumberExpression(value: number): string {
    return this.buildConstructor('ConstantNumberExpression', [value]);
  }

  protected override createConstantBooleanExpression(value: boolean): string {
    return this.buildConstructor('ConstantBooleanExpression', [value]);
  }

  protected override createConstantBigIntExpression(value: bigint): string {
    return this.buildConstructor('ConstantBigIntExpression', [
      `BigInt(${JSON.stringify(value.toString())})`,
    ]);
  }

  protected override createConstantNullExpression(): string {
    return this.buildConstructor('ConstantNullExpression', []);
  }

  protected override createConstantRegExpExpression(
    source: string,
    value: RegExp,
  ): string {
    return this.buildConstructor('ConstantRegExpExpression', [
      source,
      `new RegExp(${JSON.stringify(value.source)}, ${JSON.stringify(value.flags)})`,
    ]);
  }

  protected override createConditionalNode(
    source: string,
    testExpression: string,
    consequentExpression: string,
    alternateExpression: string,
  ): string {
    return this.buildConstructor('ConditionalExpression', [
      source,
      testExpression,
      consequentExpression,
      alternateExpression,
    ]);
  }

  protected override createMemberNode(
    source: string,
    pathSegments: string[],
  ): string {
    return this.buildConstructor('MemberExpression', [
      source,
      this.renderArray(pathSegments),
    ]);
  }

  protected override createIndexExpression(expression: string): string {
    return this.buildConstructor('IndexExpression', [expression]);
  }

  protected override createSequenceNode(
    source: string,
    expressions: string[],
  ): string {
    return this.buildConstructor('SequenceExpression', [
      source,
      this.renderArray(expressions),
    ]);
  }

  protected override createIdentifierExpression(name: string): string {
    return this.buildConstructor('IdentifierExpression', [name]);
  }

  protected override createArrayNode(expressions: string[]): string {
    return this.buildConstructor('ArrayExpression', [this.renderArray(expressions)]);
  }

  protected override createSpreadNode(expression: string): string {
    return this.buildConstructor('SpreadExpression', [expression]);
  }

  protected override createNewNode(
    source: string,
    constructorExpression: string,
    argumentExpressions: string[],
  ): string {
    return this.buildConstructor('NewExpression', [
      source,
      constructorExpression,
      this.renderArray(argumentExpressions),
    ]);
  }

  protected override createFunctionNode(
    source: string,
    functionExpression: string,
    objectExpression: string | null,
    argumentExpressions: string,
    computed: boolean,
    optional: boolean,
  ): string {
    return this.buildConstructor('FunctionExpression', [
      source,
      functionExpression,
      objectExpression ?? 'null',
      argumentExpressions,
      computed,
      optional,
    ]);
  }

  protected override createTemplateLiteralNode(
    source: string,
    expressions: string[],
  ): string {
    return this.buildConstructor('TemplateLiteralExpression', [
      source,
      this.renderArray(expressions),
    ]);
  }

  protected override createUnaryPlusNode(
    source: string,
    argumentExpression: string,
  ): string {
    return this.buildConstructor('UnaryPlusExpression', [source, argumentExpression]);
  }

  protected override createUnaryMinusNode(
    source: string,
    argumentExpression: string,
  ): string {
    return this.buildConstructor('UnaryNegationExpression', [
      source,
      argumentExpression,
    ]);
  }

  protected override createLogicalNotNode(
    source: string,
    argumentExpression: string,
  ): string {
    return this.buildConstructor('LogicalNotExpression', [source, argumentExpression]);
  }

  protected override createTypeofNode(
    source: string,
    argumentExpression: string,
  ): string {
    return this.buildConstructor('TypeofExpression', [source, argumentExpression]);
  }

  protected override createEqualToNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('EqualityExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createNotEqualToNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('InequalityExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createStrictEqualToNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('StrictEqualityExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createStrictNotEqualToNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('StrictInequalityExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createLessThanNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('LessThanExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createLessThanOrEqualToNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('LessThanOrEqualExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createGreaterThanNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('GreaterThanExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createGreaterThanOrEqualToNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('GreaterThanOrEqualExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createBitwiseNotNode(
    source: string,
    argumentExpression: string,
  ): string {
    return this.buildConstructor('BitwiseNotExpression', [source, argumentExpression]);
  }

  protected override createLeftShiftNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('BitwiseLeftShiftExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createRightShiftNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('BitwiseRightShiftExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createUnsignedRightShiftNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('BitwiseUnsignedRightShiftExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createBitwiseOrNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('BitwiseOrExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createBitwiseXOrNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('BitwiseXorExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createBitwiseAndNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('BitwiseAndExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createAdditionNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('AdditionExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createSubstractionNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('SubtractionExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createMultiplicationNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('MultiplicationExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createDivisionNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('DivisionExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createModulusNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('RemainderExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createExponentiationNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('ExponentiationExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createInstanceOfNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('InstanceofExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createInNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('InExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createLogicalOrNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('LogicalOrExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createLogicalAndNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('LogicalAndExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createNullishCoalescingNode(
    source: string,
    leftExpression: string,
    rightExpression: string,
  ): string {
    return this.buildConstructor('NullishCoalescingExpression', [
      source,
      leftExpression,
      rightExpression,
    ]);
  }

  protected override createObjectNode(
    source: string,
    propertyExpressions: string[],
  ): string {
    return this.buildConstructor('ObjectExpression', [
      source,
      this.renderArray(propertyExpressions),
    ]);
  }

  protected override createPropertyNode(
    source: string,
    keyExpression: string,
    valueExpression: string,
  ): string {
    return this.buildConstructor('PropertyExpression', [
      source,
      keyExpression,
      valueExpression,
    ]);
  }

  protected override isSingleStringLiteralExpression(
    expressions: string[],
  ): expressions is [string] {
    return (
      expressions.length === 1 &&
      expressions[0].startsWith('new ConstantStringExpression(')
    );
  }

  private buildConstructor(name: string, args: Array<string | number | boolean>): string {
    const serializedArgs = args
      .map((arg) => this.serializeArgument(arg))
      .join(', ');
    return `new ${name}(${serializedArgs})`;
  }

  private serializeArgument(argument: string | number | boolean): string {
    if (typeof argument === 'string') {
      if (argument.startsWith('new ')) {
        return argument;
      }

      if (argument.startsWith('[') || argument === 'null') {
        return argument;
      }

      if (/^BigInt\(".*"\)$/.test(argument) || argument.startsWith('new RegExp(')) {
        return argument;
      }

      return JSON.stringify(argument);
    }

    return String(argument);
  }

  private renderArray(expressions: string[]): string {
    return `[${expressions.join(', ')}]`;
  }
}
