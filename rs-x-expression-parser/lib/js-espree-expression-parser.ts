import { generate as astToString } from 'astring';
import * as espree from 'espree';
import * as estraverse from 'estraverse';
import type {
  ArrayExpression as EstreeArrayExpression,
  AssignmentExpression as EstreeAssignmentExpression,
  BinaryExpression,
  BinaryOperator,
  CallExpression,
  ChainExpression,
  ConditionalExpression as EstreeConditionalExpression,
  Expression,
  ExpressionStatement,
  Identifier,
  Literal,
  LogicalExpression,
  LogicalOperator,
  MemberExpression as EstreeMemberExpression,
  NewExpression as EstreeNewExpression,
  Node,
  ObjectExpression as EstreeObjectExpression,
  Pattern,
  PrivateIdentifier,
  Program,
  Property,
  RegExpLiteral,
  SequenceExpression as EstreeSequenceExpression,
  SpreadElement,
  Super,
  TaggedTemplateExpression as EstreeTaggedTemplateExpression,
  TemplateLiteral,
  UnaryExpression,
  UnaryOperator,
} from 'estree';

import {
  type AnyFunction,
  Injectable,
  ParserException,
  Type,
  UnsupportedException,
} from '@rs-x/core';

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
import {
  ExpressionType,
  type IExpression,
  type IExpressionParser,
} from './expressions/expression-parser.interface';
import { FunctionExpression } from './expressions/function-expression';
import { GreaterThanExpression } from './expressions/greater-than-expression';
import { GreaterThanOrEqualExpression } from './expressions/greater-than-or-equal-expression';
import { IdentifierExpression } from './expressions/identifier-expression';
import { InExpression } from './expressions/in-expression';
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
import { TemplateStringExpression } from './expressions/template-string-expression';
import { TypeofExpression } from './expressions/typeof-expression';
import { UnaryNegationExpression } from './expressions/unary-negation-expression';
import { UnaryPlusExpression } from './expressions/unary-plus-expression';
import { IndexExpression } from './expressions';

enum EspreeExpressionType {
  UnaryExpression = 'UnaryExpression',
  BinaryExpression = 'BinaryExpression',
  AssignmentExpression = 'AssignmentExpression',
  ConditionalExpression = 'ConditionalExpression',
  LogicalExpression = 'LogicalExpression',
  ChainExpression = 'ChainExpression',
  MemberExpression = 'MemberExpression',
  Identifier = 'Identifier',
  Literal = 'Literal',
  NewExpression = 'NewExpression',
  CallExpression = 'CallExpression',
  TemplateLiteral = 'TemplateLiteral',
  SpreadElement = 'SpreadElement',
  TaggedTemplateExpression = 'TaggedTemplateExpression',
  SequenceExpression = 'SequenceExpression',
  ArrayExpression = 'ArrayExpression',
  ObjectExpression = 'ObjectExpression',
  Property = 'Property',
}

type MemberExpressionSegmentType = Expression | PrivateIdentifier | Super;

type ExpressionFactory<T extends Expression | SpreadElement | Property> = (
  expression: T,
) => AbstractExpression;

type KnownExpressionType =
  keyof (typeof JsEspreeExpressionParser.prototype)['expressionFactories'];

interface IPathSehment {
  expression: MemberExpressionSegmentType;
  computed: boolean;
}

@Injectable()
export class JsEspreeExpressionParser implements IExpressionParser {
  public static readonly instance: IExpressionParser;
  private readonly createConstantExpression = {
    string: (literal: Literal) =>
      new ConstantStringExpression(literal.value as string),
    number: (literal: Literal) =>
      new ConstantNumberExpression(Number(literal.value)),
    boolean: (literal: Literal) =>
      new ConstantBooleanExpression(Boolean(literal.value)),
    bigint: (literal: Literal) =>
      new ConstantBigIntExpression(BigInt(literal.value as string)),
  };
  private readonly expressionFactories: {
    [EspreeExpressionType.UnaryExpression]: ExpressionFactory<UnaryExpression>;
    [EspreeExpressionType.BinaryExpression]: ExpressionFactory<BinaryExpression>;
    [EspreeExpressionType.AssignmentExpression]: ExpressionFactory<EstreeAssignmentExpression>;
    [EspreeExpressionType.Literal]: ExpressionFactory<Literal>;
    [EspreeExpressionType.ConditionalExpression]: ExpressionFactory<EstreeConditionalExpression>;
    [EspreeExpressionType.LogicalExpression]: ExpressionFactory<LogicalExpression>;
    [EspreeExpressionType.ChainExpression]: ExpressionFactory<ChainExpression>;
    [EspreeExpressionType.MemberExpression]: ExpressionFactory<EstreeMemberExpression>;
    [EspreeExpressionType.Identifier]: ExpressionFactory<Identifier>;
    [EspreeExpressionType.NewExpression]: ExpressionFactory<EstreeNewExpression>;
    [EspreeExpressionType.CallExpression]: ExpressionFactory<CallExpression>;
    [EspreeExpressionType.TemplateLiteral]: ExpressionFactory<TemplateLiteral>;
    [EspreeExpressionType.SpreadElement]: ExpressionFactory<SpreadElement>;
    [EspreeExpressionType.SequenceExpression]: ExpressionFactory<EstreeSequenceExpression>;
    [EspreeExpressionType.TaggedTemplateExpression]: ExpressionFactory<EstreeTaggedTemplateExpression>;
    [EspreeExpressionType.ArrayExpression]: ExpressionFactory<EstreeArrayExpression>;
    [EspreeExpressionType.ObjectExpression]: ExpressionFactory<EstreeObjectExpression>;
    [EspreeExpressionType.Property]: ExpressionFactory<Property>;
  };
  private readonly unaryExpressionFactories: Record<
    UnaryOperator,
    (expression: UnaryExpression) => AbstractExpression
  >;
  private readonly binaryExpressionFactories: Record<
    BinaryOperator,
    (expression: BinaryExpression) => AbstractExpression
  >;
  private readonly logicalExpressionFactories: Record<
    LogicalOperator,
    (expression: LogicalExpression) => AbstractExpression
  >;

  constructor() {
    this.expressionFactories = {
      [EspreeExpressionType.UnaryExpression]: this.createUnaryExpression,
      [EspreeExpressionType.BinaryExpression]: this.createBinaryExpression,
      [EspreeExpressionType.AssignmentExpression]:
        this.createAssignmentExpression,
      [EspreeExpressionType.Literal]: this.createLiteralExpression,
      [EspreeExpressionType.ConditionalExpression]:
        this.createConditionalExpression,
      [EspreeExpressionType.LogicalExpression]: this.createLogicalExpression,
      [EspreeExpressionType.ChainExpression]: this.createChainExpression,
      [EspreeExpressionType.MemberExpression]: this.createMemberExpression,
      [EspreeExpressionType.Identifier]: this.createIdentifier,
      [EspreeExpressionType.NewExpression]: this.createNewExpression,
      [EspreeExpressionType.CallExpression]: this.createCallExpression,
      [EspreeExpressionType.TemplateLiteral]:
        this.createTemplateLiteralExpression,
      [EspreeExpressionType.SpreadElement]: this.createSpreadExpression,
      [EspreeExpressionType.SequenceExpression]: this.createSequenceExpression,
      [EspreeExpressionType.TaggedTemplateExpression]:
        this.createTaggedTemplateExpression,
      [EspreeExpressionType.ArrayExpression]: this.createArrayExpression,
      [EspreeExpressionType.ObjectExpression]: this.createObjectExpression,
      [EspreeExpressionType.Property]: this.createPropertyExpression,
    };

    this.unaryExpressionFactories = {
      '+': this.createUnaryPlusExpression,
      '-': this.createUnaryMinusExpression,
      '!': this.createLogicalNotExpression,
      '~': this.createBitwiseNotExpression,
      typeof: this.createTypeofExpression,
      delete: this.createDeleteExpression,
      void: () => {
        throw new UnsupportedException(`void expression is not supported`);
      },
    };

    this.binaryExpressionFactories = {
      '==': this.createEqualToExpression,
      '!=': this.createNotEqualToExpression,
      '===': this.createStrictEqualToExpression,
      '!==': this.createStrictNotEqualToExpression,
      '<': this.createLessThanExpression,
      '<=': this.createLessThanOrEqualToExpression,
      '>': this.createGreaterThanExpression,
      '>=': this.createGreaterThanOrEqualToExpression,
      '<<': this.createLeftShiftExpression,
      '>>': this.createRightShiftExpression,
      '>>>': this.createUnsignedRightShiftExpression,
      '+': this.createAdditionExpression,
      '-': this.createSubstractionExpression,
      '*': this.createMultiplicationExpression,
      '/': this.createDivisionExpression,
      '%': this.createModulusExpression,
      '**': this.createExponentiationExpression,
      '|': this.createBitwiseOrExpression,
      '^': this.createBitwiseXOrExpression,
      '&': this.createBitwiseAndExpression,
      in: this.createInExpression,
      instanceof: this.createInstanceOfExpression,
    };

    this.logicalExpressionFactories = {
      '||': this.createLogicalOrExpression,
      '&&': this.createLogicalAndExpression,
      '??': this.createNullishCoalescingExpression,
    };
  }

  public parse(expressionString: string): AbstractExpression {
    const espreeExpression = this.tryParse(expressionString);

    let expression: AbstractExpression;
    try {
      expression = this.createExpression(espreeExpression);
    } catch (e) {
      if (e instanceof Error) {
        throw new ParserException(expressionString, e.message);
      }

      throw new ParserException(expressionString, String(e));
    }

    return expression;
  }

  private tryParse(expressionString: string): Expression {
    return this.parseExpression(expressionString).expression;
  }

  private createExpression(
    expression:
      | Expression
      | Super
      | PrivateIdentifier
      | SpreadElement
      | Property
      | Pattern,
  ): AbstractExpression {
    if (!(expression.type in this.expressionFactories)) {
      throw new UnsupportedException(
        `Unsupported expression type ${expression.type}`,
      );
    }

    const factory =
      this.expressionFactories[expression.type as KnownExpressionType];

    return factory(Type.cast(expression));
  }

  private createLiteralExpression = (
    expression: Literal,
  ): AbstractExpression => {
    // RegExp literal
    if ((expression as RegExpLiteral).regex) {
      const regExpLiteral = expression as RegExpLiteral;
      return new ConstantRegExpExpression(
        astToString(expression),
        new RegExp(regExpLiteral.regex.pattern, regExpLiteral.regex.flags),
      );
    }

    // null literal
    if (expression.value === null) {
      return new ConstantNullExpression();
    }

    // Only allowed types
    const valueType = typeof expression.value;
    if (
      valueType === 'string' ||
      valueType === 'number' ||
      valueType === 'boolean' ||
      valueType === 'bigint'
    ) {
      return this.createConstantExpression[valueType](expression);
    }

    throw new UnsupportedException(`Unsupported literal type: ${valueType}`);
  };

  private createBinaryExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return this.binaryExpressionFactories[expression.operator](expression);
  };

  private createAssignmentExpression = (): AbstractExpression => {
    throw new UnsupportedException('Assignment expressions are not supported');
  };

  private createUnaryExpression = (
    expression: UnaryExpression,
  ): AbstractExpression => {
    return this.unaryExpressionFactories[expression.operator](expression);
  };

  private createConditionalExpression = (
    expression: EstreeConditionalExpression,
  ): AbstractExpression => {
    return new ConditionalExpression(
      astToString(expression),
      this.createExpression(expression.test),
      this.createExpression(expression.consequent),
      this.createExpression(expression.alternate),
    );
  };

  private createLogicalExpression = (
    expression: LogicalExpression,
  ): AbstractExpression => {
    return this.logicalExpressionFactories[expression.operator](expression);
  };

  private createChainExpression = (
    expression: ChainExpression,
  ): AbstractExpression => {
    return this.createExpression(expression.expression);
  };

  private createMemberExpression = (
    expression: EstreeMemberExpression,
  ): AbstractExpression => {
    const pathSegments = this.flattenMemberExpression(expression).map((e) => {
      const expression = this.createExpression(e.expression);
      return e.computed ? new IndexExpression(expression) : expression;
    });
    return new MemberExpression(astToString(expression), pathSegments);
  };

  private createSequenceExpression = (
    expression: EstreeSequenceExpression,
  ): AbstractExpression => {
    return new SequenceExpression(
      astToString(expression),
      expression.expressions.map((expression) =>
        this.createExpression(expression),
      ),
    );
  };

  private createIdentifier = (expression: Identifier): AbstractExpression => {
    return new IdentifierExpression(expression.name);
  };

  private createArrayExpression = (
    expression: EstreeArrayExpression,
  ): AbstractExpression => {
    return new ArrayExpression(
      expression.elements.map((element) =>
        this.createExpression(Type.cast(element)),
      ),
    );
  };

  private createSpreadExpression = (
    expression: SpreadElement,
  ): AbstractExpression => {
    return new SpreadExpression(
      this.createExpression(expression.argument) as
        | ArrayExpression
        | ObjectExpression,
    );
  };

  private createNewExpression = (
    expression: EstreeNewExpression,
  ): AbstractExpression => {
    const constructorExpression = this.createExpression(expression.callee);
    const argumentExpressions = expression.arguments.map(
      (argumentExpressions) => this.createExpression(argumentExpressions),
    );
    return new NewExpression(
      astToString(expression),
      Type.cast(constructorExpression),
      argumentExpressions,
    );
  };

  private createCallExpression = (
    expression: CallExpression,
  ): AbstractExpression => {
    let objectExpression: IExpression<object> | null = null;
    let functionExpression: IExpression;
    if (expression.callee.type === EspreeExpressionType.MemberExpression) {
      objectExpression = this.createExpression(
        expression.callee.object,
      ) as IExpression<object>;
      functionExpression = this.createExpression(expression.callee.property);
    } else {
      functionExpression = this.createExpression(expression.callee);
    }

    const argumentExpressions = expression.arguments.map((argumentExpression) =>
      this.createExpression(argumentExpression),
    );

    return new FunctionExpression(
      astToString(expression),
      Type.cast(functionExpression),
      Type.cast(objectExpression),
      new ArrayExpression(argumentExpressions),
      Type.cast<{ computed: boolean }>(expression.callee).computed,
      Type.cast<{ optional: boolean }>(expression.callee).optional,
    );
  };

  private createTemplateLiteralExpression = (
    templateLiteral: TemplateLiteral,
  ): AbstractExpression => {
    const { quasis, parameters } =
      this.createTemplateElementExpression(templateLiteral);

    const expressions = quasis.flatMap((quasi, index) => {
      return [quasi, parameters[index]].filter((a) => a);
    });

    if (
      expressions.length === 1 &&
      expressions[0].type === ExpressionType.String
    ) {
      return expressions[0];
    }

    return new TemplateStringExpression(
      astToString(templateLiteral),
      expressions,
    );
  };

  private createTaggedTemplateExpression = (
    expression: EstreeTaggedTemplateExpression,
  ): AbstractExpression => {
    const { quasis, parameters } = this.createTemplateElementExpression(
      expression.quasi,
    );

    let objectExpression: IExpression<object> | null = null;
    let functionExpression: IExpression<AnyFunction | string | number>;

    if (expression.tag.type === EspreeExpressionType.MemberExpression) {
      objectExpression = this.createExpression(
        expression.tag.object,
      ) as IExpression<object>;
      functionExpression = this.createExpression(
        expression.tag.property,
      ) as IExpression<AnyFunction | string | number>;
    } else {
      functionExpression = this.createExpression(expression.tag) as IExpression<
        AnyFunction | string | number
      >;
    }

    return new FunctionExpression(
      astToString(expression),
      Type.cast(functionExpression),
      Type.cast(objectExpression),
      new ArrayExpression([
        new ArrayExpression(quasis),
        new SpreadExpression(new ArrayExpression(parameters)),
      ]),
      false,
      false,
    );
  };

  private createTemplateElementExpression(templateLiteral: TemplateLiteral): {
    quasis: AbstractExpression[];
    parameters: AbstractExpression[];
  } {
    return {
      quasis: templateLiteral.quasis.map(
        (quasi) => new ConstantStringExpression(quasi.value.raw),
      ),
      parameters: templateLiteral.expressions.map((expression) =>
        this.createExpression(expression),
      ),
    };
  }

  private createUnaryPlusExpression = (
    expression: UnaryExpression,
  ): AbstractExpression => {
    return new UnaryPlusExpression(
      astToString(expression),
      this.createExpression(expression.argument),
    );
  };

  private createUnaryMinusExpression = (
    expression: UnaryExpression,
  ): AbstractExpression => {
    return new UnaryNegationExpression(
      astToString(expression),
      Type.cast(this.createExpression(expression.argument)),
    );
  };

  private createLogicalNotExpression = (
    expression: UnaryExpression,
  ): AbstractExpression => {
    return new LogicalNotExpression(
      astToString(expression),
      this.createExpression(expression.argument),
    );
  };

  private createTypeofExpression = (
    expression: UnaryExpression,
  ): AbstractExpression => {
    return new TypeofExpression(
      astToString(expression),
      this.createExpression(expression.argument),
    );
  };

  private createDeleteExpression = (): AbstractExpression => {
    throw new UnsupportedException('Delete operator is not supported');
  };

  private createEqualToExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new EqualityExpression(
      astToString(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  };

  private createNotEqualToExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new InequalityExpression(
      astToString(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  };

  private createStrictEqualToExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new StrictEqualityExpression(
      astToString(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  };

  private createStrictNotEqualToExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new StrictInequalityExpression(
      astToString(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  };

  private createLessThanExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new LessThanExpression(
      astToString(expression),
      Type.cast(this.createExpression(expression.left)),
      Type.cast(this.createExpression(expression.right)),
    );
  };
  private createLessThanOrEqualToExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new LessThanOrEqualExpression(
      astToString(expression),
      Type.cast(this.createExpression(expression.left)),
      Type.cast(this.createExpression(expression.right)),
    );
  };

  private createGreaterThanExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new GreaterThanExpression(
      astToString(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  };

  private createGreaterThanOrEqualToExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new GreaterThanOrEqualExpression(
      astToString(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  };

  private createBitwiseNotExpression = (
    expression: UnaryExpression,
  ): AbstractExpression => {
    return new BitwiseNotExpression(
      astToString(expression),
      Type.cast(this.createExpression(expression.argument)),
    );
  };

  private createLeftShiftExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new BitwiseLeftShiftExpression(
      astToString(expression),
      Type.cast(this.createExpression(expression.left)),
      Type.cast(this.createExpression(expression.right)),
    );
  };

  private createRightShiftExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new BitwiseRightShiftExpression(
      astToString(expression),
      Type.cast(this.createExpression(expression.left)),
      Type.cast(this.createExpression(expression.right)),
    );
  };

  private createUnsignedRightShiftExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new BitwiseUnsignedRightShiftExpression(
      astToString(expression),
      Type.cast(this.createExpression(expression.left)),
      Type.cast(this.createExpression(expression.right)),
    );
  };

  private createBitwiseOrExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new BitwiseOrExpression(
      astToString(expression),
      Type.cast(this.createExpression(expression.left)),
      Type.cast(this.createExpression(expression.right)),
    );
  };

  private createBitwiseXOrExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new BitwiseXorExpression(
      astToString(expression),
      Type.cast(this.createExpression(expression.left)),
      Type.cast(this.createExpression(expression.right)),
    );
  };

  private createBitwiseAndExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new BitwiseAndExpression(
      astToString(expression),
      Type.cast(this.createExpression(expression.left)),
      Type.cast(this.createExpression(expression.right)),
    );
  };

  private createAdditionExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new AdditionExpression(
      astToString(expression),
      Type.cast(this.createExpression(expression.left)),
      Type.cast(this.createExpression(expression.right)),
    );
  };

  private createSubstractionExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new SubstractionExpression(
      astToString(expression),
      Type.cast(this.createExpression(expression.left)),
      Type.cast(this.createExpression(expression.right)),
    );
  };

  private createMultiplicationExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new MultiplicationExpression(
      astToString(expression),
      Type.cast(this.createExpression(expression.left)),
      Type.cast(this.createExpression(expression.right)),
    );
  };

  private createDivisionExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new DivisionExpression(
      astToString(expression),
      Type.cast(this.createExpression(expression.left)),
      Type.cast(this.createExpression(expression.right)),
    );
  };

  private createModulusExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new RemainderExpression(
      astToString(expression),
      Type.cast(this.createExpression(expression.left)),
      Type.cast(this.createExpression(expression.right)),
    );
  };

  private createExponentiationExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new ExponentiationExpression(
      astToString(expression),
      Type.cast(this.createExpression(expression.left)),
      Type.cast(this.createExpression(expression.right)),
    );
  };

  private createInstanceOfExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new InstanceofExpression(
      astToString(expression),
      this.createExpression(expression.left),
      Type.cast(this.createExpression(expression.right)),
    );
  };

  private createInExpression = (
    expression: BinaryExpression,
  ): AbstractExpression => {
    return new InExpression(
      astToString(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  };

  private createLogicalOrExpression = (
    expression: LogicalExpression,
  ): AbstractExpression => {
    return new LogicalOrExpression(
      astToString(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  };

  private createLogicalAndExpression = (
    expression: LogicalExpression,
  ): AbstractExpression => {
    return new LogicalAndExpression(
      astToString(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  };

  private createNullishCoalescingExpression = (
    expression: LogicalExpression,
  ): AbstractExpression => {
    return new NullishCoalescingExpression(
      astToString(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  };

  private createObjectExpression = (
    objectExpression: EstreeObjectExpression,
  ): AbstractExpression => {
    const propertyExpressions = objectExpression.properties.map(
      (property) =>
        this.createExpression(property) as
          | PropertyExpression
          | SpreadExpression,
    );
    return new ObjectExpression(
      astToString(objectExpression),
      propertyExpressions,
    );
  };

  private createPropertyExpression = (
    propertyExpression: Property,
  ): AbstractExpression => {
    const keyExpression =
      propertyExpression.key.type === EspreeExpressionType.Identifier
        ? new ConstantStringExpression(
            Type.cast<Identifier>(propertyExpression.key).name,
          )
        : this.createExpression(propertyExpression.key);

    return new PropertyExpression(
      astToString(propertyExpression),
      keyExpression as AbstractExpression<PropertyKey, unknown>,
      this.createExpression(propertyExpression.value),
    );
  };

  private parseExpression(expression: string): ExpressionStatement {
    const program = espree.parse(expression, {
      ecmaVersion: 2022,
    }) as Program;

    if (program.body.length === 0) {
      throw new ParserException(expression, 'Empty expression', 0);
    }

    if (program.body.length > 1) {
      throw new ParserException(
        expression,
        `Multiple expression are not supported`,
        0,
      );
    }

    if (program.body[0].type !== 'ExpressionStatement') {
      throw new ParserException(
        expression,
        `Unsupported expression type ${program.body[0].type}`,
        0,
      );
    }

    const expressionStatement = program.body[0];
    this.normalizeAST(expressionStatement);
    return expressionStatement;
  }

  // Normalize a['b'] to a.b
  private normalizeAST(ast: ExpressionStatement): void {
    estraverse.traverse(ast, {
      enter(node: Node) {
        if (
          node.type === 'MemberExpression' &&
          node.computed &&
          node.property.type === 'Literal'
        ) {
          const property = node.property as Literal;

          if (
            typeof property.value === 'string' ||
            typeof property.value === 'number'
          ) {
            node.property = {
              type: 'Identifier',
              name: property.value,
            } as Identifier;

            node.computed = false;
          }
        }
      },
    });
  }

  private flattenMemberExpression(
    expr: MemberExpressionSegmentType,
  ): IPathSehment[] {
    const result: IPathSehment[] = [];

    function walk(node: MemberExpressionSegmentType): void {
      switch (node.type) {
        case EspreeExpressionType.MemberExpression:
          // first resolve the object
          walk(node.object as MemberExpressionSegmentType);

          // then push the property
          result.push({
            expression: node.property,
            computed: node.computed,
          });
          break;

        case EspreeExpressionType.CallExpression:
          // CallExpression is a single semantic segment
          result.push({
            expression: node,
            computed: false,
          });
          break;

        default:
          result.push({
            expression: node,
            computed: false,
          });
      }
    }

    walk(expr);
    return result;
  }
}
