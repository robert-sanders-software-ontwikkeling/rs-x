import { Injectable, Type } from '@rs-x/core';

import { AbstractJsEspreeExpressionParser } from './abstract-js-espree-expression-parser';
import { AbstractExpression } from './expressions/abstract-expression';
import { AdditionExpression } from './expressions/addition-expression';
import { ArrayExpression } from './expressions/array-expression';
import { BitwiseAndExpression } from './expressions/bitwise-and-expression';
import { BitwiseLeftShiftExpression } from './expressions/bitwise-left-shift-expression';
import { BitwiseNotExpression } from './expressions/bitwise-not-expression';
import { BitwiseOrExpression } from './expressions/bitwise-or-expression';
import { BitwiseRightShiftExpression } from './expressions/bitwise-right-shift-expression';
import { BitwiseUnsignedRightShiftExpression } from './expressions/bitwise-unsigned-right-shift-expression';
import { BitwiseXorExpression } from './expressions/bitwise-xor-expression';
import { ConditionalExpression } from './expressions/conditional-expression';
import { ConstantBigIntExpression } from './expressions/constant-bigint-expression';
import { ConstantBooleanExpression } from './expressions/constant-boolean-expression';
import { ConstantNullExpression } from './expressions/constant-null-expression';
import { ConstantNumberExpression } from './expressions/constant-number-expression';
import { ConstantRegExpExpression } from './expressions/constant-regexp-expression';
import { ConstantStringExpression } from './expressions/constant-string-expression';
import { DivisionExpression } from './expressions/division-expression';
import { EqualityExpression } from './expressions/equality-expression';
import { ExponentiationExpression } from './expressions/exponentiation-expression';
import { type IExpression, type IExpressionParser } from './expressions/expression-parser.interface';
import { FunctionExpression } from './expressions/function-expression';
import { GreaterThanExpression } from './expressions/greater-than-expression';
import { GreaterThanOrEqualExpression } from './expressions/greater-than-or-equal-expression';
import { IdentifierExpression } from './expressions/identifier-expression';
import { InExpression } from './expressions/in-expression';
import { IndexExpression } from './expressions/index-expression';
import { InequalityExpression } from './expressions/inequality-expression';
import { InstanceofExpression } from './expressions/instanceof-expression';
import { LessThanExpression } from './expressions/less-than-expression';
import { LessThanOrEqualExpression } from './expressions/less-than-or-equal-expression';
import { LogicalAndExpression } from './expressions/logical-and-expression';
import { LogicalNotExpression } from './expressions/logical-not-expression';
import { LogicalOrExpression } from './expressions/logical-or-expression';
import { MemberExpression } from './expressions/member-expression';
import { MultiplicationExpression } from './expressions/multiplication-expression';
import { NewExpression } from './expressions/new-expression';
import { NullishCoalescingExpression } from './expressions/nullish-coalescing-expression';
import { ObjectExpression } from './expressions/object-expression';
import { PropertyExpression } from './expressions/property-expression';
import { RemainderExpression } from './expressions/remainder-expression';
import { SequenceExpression } from './expressions/sequence-expression';
import { SpreadExpression } from './expressions/spread-expression';
import { StrictEqualityExpression } from './expressions/strict-equality-expression';
import { StrictInequalityExpression } from './expressions/strict-inequality-expression';
import { SubtractionExpression as SubstractionExpression } from './expressions/substraction-expression';
import { TemplateLiteralExpression } from './expressions/template-literal-expression';
import { TypeofExpression } from './expressions/typeof-expression';
import { UnaryNegationExpression } from './expressions/unary-negation-expression';
import { UnaryPlusExpression } from './expressions/unary-plus-expression';

@Injectable()
export class JsEspreeExpressionParser
  extends AbstractJsEspreeExpressionParser<AbstractExpression>
  implements IExpressionParser
{
  protected override createConstantStringExpression(
    value: string,
  ): AbstractExpression {
    return new ConstantStringExpression(value);
  }

  protected override createConstantNumberExpression(
    value: number,
  ): AbstractExpression {
    return new ConstantNumberExpression(value);
  }

  protected override createConstantBooleanExpression(
    value: boolean,
  ): AbstractExpression {
    return new ConstantBooleanExpression(value);
  }

  protected override createConstantBigIntExpression(
    value: bigint,
  ): AbstractExpression {
    return new ConstantBigIntExpression(value);
  }

  protected override createConstantNullExpression(): AbstractExpression {
    return new ConstantNullExpression();
  }

  protected override createConstantRegExpExpression(
    source: string,
    value: RegExp,
  ): AbstractExpression {
    return new ConstantRegExpExpression(source, value);
  }

  protected override createConditionalNode(
    source: string,
    testExpression: AbstractExpression,
    consequentExpression: AbstractExpression,
    alternateExpression: AbstractExpression,
  ): AbstractExpression {
    return new ConditionalExpression(
      source,
      testExpression,
      consequentExpression,
      alternateExpression,
    );
  }

  protected override createMemberNode(
    source: string,
    pathSegments: AbstractExpression[],
  ): AbstractExpression {
    return new MemberExpression(source, pathSegments);
  }

  protected override createIndexExpression(
    expression: AbstractExpression,
  ): AbstractExpression {
    return new IndexExpression(expression);
  }

  protected override createSequenceNode(
    source: string,
    expressions: AbstractExpression[],
  ): AbstractExpression {
    return new SequenceExpression(source, expressions);
  }

  protected override createIdentifierExpression(name: string): AbstractExpression {
    return new IdentifierExpression(name);
  }

  protected override createArrayNode(expressions: AbstractExpression[]): AbstractExpression {
    return new ArrayExpression(expressions);
  }

  protected override createSpreadNode(expression: AbstractExpression): AbstractExpression {
    return new SpreadExpression(Type.cast(expression));
  }

  protected override createNewNode(
    source: string,
    constructorExpression: AbstractExpression,
    argumentExpressions: AbstractExpression[],
  ): AbstractExpression {
    return new NewExpression(source, Type.cast(constructorExpression), argumentExpressions);
  }

  protected override createFunctionNode(
    source: string,
    functionExpression: AbstractExpression,
    objectExpression: AbstractExpression | null,
    argumentExpressions: AbstractExpression,
    computed: boolean,
    optional: boolean,
  ): AbstractExpression {
    return new FunctionExpression(
      source,
      Type.cast(functionExpression),
      Type.cast(objectExpression as IExpression<object> | null),
      Type.cast(argumentExpressions),
      computed,
      optional,
    );
  }

  protected override createTemplateLiteralNode(
    source: string,
    expressions: AbstractExpression[],
  ): AbstractExpression {
    return new TemplateLiteralExpression(source, expressions);
  }

  protected override createUnaryPlusNode(
    source: string,
    argumentExpression: AbstractExpression,
  ): AbstractExpression {
    return new UnaryPlusExpression(source, argumentExpression);
  }

  protected override createUnaryMinusNode(
    source: string,
    argumentExpression: AbstractExpression,
  ): AbstractExpression {
    return new UnaryNegationExpression(source, Type.cast(argumentExpression));
  }

  protected override createLogicalNotNode(
    source: string,
    argumentExpression: AbstractExpression,
  ): AbstractExpression {
    return new LogicalNotExpression(source, argumentExpression);
  }

  protected override createTypeofNode(
    source: string,
    argumentExpression: AbstractExpression,
  ): AbstractExpression {
    return new TypeofExpression(source, argumentExpression);
  }

  protected override createEqualToNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new EqualityExpression(source, leftExpression, rightExpression);
  }

  protected override createNotEqualToNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new InequalityExpression(source, leftExpression, rightExpression);
  }

  protected override createStrictEqualToNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new StrictEqualityExpression(source, leftExpression, rightExpression);
  }

  protected override createStrictNotEqualToNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new StrictInequalityExpression(source, leftExpression, rightExpression);
  }

  protected override createLessThanNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new LessThanExpression(source, Type.cast(leftExpression), Type.cast(rightExpression));
  }

  protected override createLessThanOrEqualToNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new LessThanOrEqualExpression(
      source,
      Type.cast(leftExpression),
      Type.cast(rightExpression),
    );
  }

  protected override createGreaterThanNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new GreaterThanExpression(source, leftExpression, rightExpression);
  }

  protected override createGreaterThanOrEqualToNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new GreaterThanOrEqualExpression(source, leftExpression, rightExpression);
  }

  protected override createBitwiseNotNode(
    source: string,
    argumentExpression: AbstractExpression,
  ): AbstractExpression {
    return new BitwiseNotExpression(source, Type.cast(argumentExpression));
  }

  protected override createLeftShiftNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new BitwiseLeftShiftExpression(
      source,
      Type.cast(leftExpression),
      Type.cast(rightExpression),
    );
  }

  protected override createRightShiftNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new BitwiseRightShiftExpression(
      source,
      Type.cast(leftExpression),
      Type.cast(rightExpression),
    );
  }

  protected override createUnsignedRightShiftNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new BitwiseUnsignedRightShiftExpression(
      source,
      Type.cast(leftExpression),
      Type.cast(rightExpression),
    );
  }

  protected override createBitwiseOrNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new BitwiseOrExpression(source, Type.cast(leftExpression), Type.cast(rightExpression));
  }

  protected override createBitwiseXOrNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new BitwiseXorExpression(source, Type.cast(leftExpression), Type.cast(rightExpression));
  }

  protected override createBitwiseAndNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new BitwiseAndExpression(source, Type.cast(leftExpression), Type.cast(rightExpression));
  }

  protected override createAdditionNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new AdditionExpression(source, Type.cast(leftExpression), Type.cast(rightExpression));
  }

  protected override createSubstractionNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new SubstractionExpression(source, Type.cast(leftExpression), Type.cast(rightExpression));
  }

  protected override createMultiplicationNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new MultiplicationExpression(
      source,
      Type.cast(leftExpression),
      Type.cast(rightExpression),
    );
  }

  protected override createDivisionNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new DivisionExpression(source, Type.cast(leftExpression), Type.cast(rightExpression));
  }

  protected override createModulusNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new RemainderExpression(source, Type.cast(leftExpression), Type.cast(rightExpression));
  }

  protected override createExponentiationNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new ExponentiationExpression(
      source,
      Type.cast(leftExpression),
      Type.cast(rightExpression),
    );
  }

  protected override createInstanceOfNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new InstanceofExpression(source, leftExpression, Type.cast(rightExpression));
  }

  protected override createInNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new InExpression(source, leftExpression, rightExpression);
  }

  protected override createLogicalOrNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new LogicalOrExpression(source, leftExpression, rightExpression);
  }

  protected override createLogicalAndNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new LogicalAndExpression(source, leftExpression, rightExpression);
  }

  protected override createNullishCoalescingNode(
    source: string,
    leftExpression: AbstractExpression,
    rightExpression: AbstractExpression,
  ): AbstractExpression {
    return new NullishCoalescingExpression(source, leftExpression, rightExpression);
  }

  protected override createObjectNode(
    source: string,
    propertyExpressions: AbstractExpression[],
  ): AbstractExpression {
    return new ObjectExpression(source, Type.cast(propertyExpressions));
  }

  protected override createPropertyNode(
    source: string,
    keyExpression: AbstractExpression,
    valueExpression: AbstractExpression,
  ): AbstractExpression {
    return new PropertyExpression(
      source,
      Type.cast(keyExpression as AbstractExpression<PropertyKey, unknown>),
      valueExpression,
    );
  }
}
