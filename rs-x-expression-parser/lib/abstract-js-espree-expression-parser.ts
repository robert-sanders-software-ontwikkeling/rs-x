import { generate as astToString } from 'astring';
import * as espree from 'espree';
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
  ParserException,
  Type,
  UnsupportedException,
} from '@rs-x/core';

import { ExpressionType, type IExpression } from './expressions/expression-parser.interface';

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

type ExpressionFactory<
  TExpression,
  T extends Expression | SpreadElement | Property,
> = (expression: T) => TExpression;

type KnownExpressionType =
  keyof (typeof AbstractJsEspreeExpressionParser.prototype)['expressionFactories'];

interface IPathSegment {
  expression: MemberExpressionSegmentType;
  computed: boolean;
}

type INormalizedMemberProperty = Pick<IPathSegment, 'expression' | 'computed'>;

export abstract class AbstractJsEspreeExpressionParser<TExpression> {
  private static readonly _parseOptions = {
    ecmaVersion: 2022,
    range: true,
  } as const;
  private _currentExpressionSource: string | undefined;

  private readonly expressionFactories: {
    [EspreeExpressionType.UnaryExpression]: ExpressionFactory<
      TExpression,
      UnaryExpression
    >;
    [EspreeExpressionType.BinaryExpression]: ExpressionFactory<
      TExpression,
      BinaryExpression
    >;
    [EspreeExpressionType.AssignmentExpression]: ExpressionFactory<
      TExpression,
      EstreeAssignmentExpression
    >;
    [EspreeExpressionType.Literal]: ExpressionFactory<TExpression, Literal>;
    [EspreeExpressionType.ConditionalExpression]: ExpressionFactory<
      TExpression,
      EstreeConditionalExpression
    >;
    [EspreeExpressionType.LogicalExpression]: ExpressionFactory<
      TExpression,
      LogicalExpression
    >;
    [EspreeExpressionType.ChainExpression]: ExpressionFactory<
      TExpression,
      ChainExpression
    >;
    [EspreeExpressionType.MemberExpression]: ExpressionFactory<
      TExpression,
      EstreeMemberExpression
    >;
    [EspreeExpressionType.Identifier]: ExpressionFactory<TExpression, Identifier>;
    [EspreeExpressionType.NewExpression]: ExpressionFactory<
      TExpression,
      EstreeNewExpression
    >;
    [EspreeExpressionType.CallExpression]: ExpressionFactory<
      TExpression,
      CallExpression
    >;
    [EspreeExpressionType.TemplateLiteral]: ExpressionFactory<
      TExpression,
      TemplateLiteral
    >;
    [EspreeExpressionType.SpreadElement]: ExpressionFactory<
      TExpression,
      SpreadElement
    >;
    [EspreeExpressionType.SequenceExpression]: ExpressionFactory<
      TExpression,
      EstreeSequenceExpression
    >;
    [EspreeExpressionType.TaggedTemplateExpression]: ExpressionFactory<
      TExpression,
      EstreeTaggedTemplateExpression
    >;
    [EspreeExpressionType.ArrayExpression]: ExpressionFactory<
      TExpression,
      EstreeArrayExpression
    >;
    [EspreeExpressionType.ObjectExpression]: ExpressionFactory<
      TExpression,
      EstreeObjectExpression
    >;
    [EspreeExpressionType.Property]: ExpressionFactory<TExpression, Property>;
  };

  private readonly unaryExpressionFactories: Record<
    UnaryOperator,
    (expression: UnaryExpression) => TExpression
  >;
  private readonly binaryExpressionFactories: Record<
    BinaryOperator,
    (expression: BinaryExpression) => TExpression
  >;
  private readonly logicalExpressionFactories: Record<
    LogicalOperator,
    (expression: LogicalExpression) => TExpression
  >;

  public constructor() {
    this.expressionFactories = {
      [EspreeExpressionType.UnaryExpression]: (expression) =>
        this.createUnaryExpression(expression),
      [EspreeExpressionType.BinaryExpression]: (expression) =>
        this.createBinaryExpression(expression),
      [EspreeExpressionType.AssignmentExpression]: (expression) =>
        this.createAssignmentExpression(expression),
      [EspreeExpressionType.Literal]: (expression) =>
        this.createLiteralExpression(expression),
      [EspreeExpressionType.ConditionalExpression]: (expression) =>
        this.createConditionalExpression(expression),
      [EspreeExpressionType.LogicalExpression]: (expression) =>
        this.createLogicalExpression(expression),
      [EspreeExpressionType.ChainExpression]: (expression) =>
        this.createChainExpression(expression),
      [EspreeExpressionType.MemberExpression]: (expression) =>
        this.createMemberExpression(expression),
      [EspreeExpressionType.Identifier]: (expression) =>
        this.createIdentifierExpression(expression.name),
      [EspreeExpressionType.NewExpression]: (expression) =>
        this.createNewExpression(expression),
      [EspreeExpressionType.CallExpression]: (expression) =>
        this.createCallExpression(expression),
      [EspreeExpressionType.TemplateLiteral]: (expression) =>
        this.createTemplateLiteralExpression(expression),
      [EspreeExpressionType.SpreadElement]: (expression) =>
        this.createSpreadElementExpression(expression),
      [EspreeExpressionType.SequenceExpression]: (expression) =>
        this.createSequenceExpression(expression),
      [EspreeExpressionType.TaggedTemplateExpression]: (expression) =>
        this.createTaggedTemplateExpression(expression),
      [EspreeExpressionType.ArrayExpression]: (expression) =>
        this.createArrayExpression(expression),
      [EspreeExpressionType.ObjectExpression]: (expression) =>
        this.createObjectExpression(expression),
      [EspreeExpressionType.Property]: (expression) =>
        this.createPropertyExpression(expression),
    };

    this.unaryExpressionFactories = {
      '+': (expression) => this.createUnaryPlusExpression(expression),
      '-': (expression) => this.createUnaryMinusExpression(expression),
      '!': (expression) => this.createLogicalNotExpression(expression),
      '~': (expression) => this.createBitwiseNotExpression(expression),
      typeof: (expression) => this.createTypeofExpression(expression),
      delete: () => this.createDeleteExpression(),
      void: () => {
        throw new UnsupportedException('void expression is not supported');
      },
    };

    this.binaryExpressionFactories = {
      '==': (expression) => this.createEqualToExpression(expression),
      '!=': (expression) => this.createNotEqualToExpression(expression),
      '===': (expression) => this.createStrictEqualToExpression(expression),
      '!==': (expression) => this.createStrictNotEqualToExpression(expression),
      '<': (expression) => this.createLessThanExpression(expression),
      '<=': (expression) => this.createLessThanOrEqualToExpression(expression),
      '>': (expression) => this.createGreaterThanExpression(expression),
      '>=': (expression) => this.createGreaterThanOrEqualToExpression(expression),
      '<<': (expression) => this.createLeftShiftExpression(expression),
      '>>': (expression) => this.createRightShiftExpression(expression),
      '>>>': (expression) => this.createUnsignedRightShiftExpression(expression),
      '+': (expression) => this.createAdditionExpression(expression),
      '-': (expression) => this.createSubstractionExpression(expression),
      '*': (expression) => this.createMultiplicationExpression(expression),
      '/': (expression) => this.createDivisionExpression(expression),
      '%': (expression) => this.createModulusExpression(expression),
      '**': (expression) => this.createExponentiationExpression(expression),
      '|': (expression) => this.createBitwiseOrExpression(expression),
      '^': (expression) => this.createBitwiseXOrExpression(expression),
      '&': (expression) => this.createBitwiseAndExpression(expression),
      in: (expression) => this.createInExpression(expression),
      instanceof: (expression) => this.createInstanceOfExpression(expression),
    };

    this.logicalExpressionFactories = {
      '||': (expression) => this.createLogicalOrExpression(expression),
      '&&': (expression) => this.createLogicalAndExpression(expression),
      '??': (expression) => this.createNullishCoalescingExpression(expression),
    };
  }

  public parse(expressionString: string): TExpression {
    this._currentExpressionSource = expressionString;

    try {
      const espreeExpression = this.tryParse(expressionString);
      return this.createExpression(espreeExpression);
    } catch (e) {
      if (e instanceof Error) {
        throw new ParserException(expressionString, e.message);
      }

      throw new ParserException(expressionString, String(e));
    } finally {
      this._currentExpressionSource = undefined;
    }
  }

  protected abstract createConstantStringExpression(value: string): TExpression;
  protected abstract createConstantNumberExpression(value: number): TExpression;
  protected abstract createConstantBooleanExpression(value: boolean): TExpression;
  protected abstract createConstantBigIntExpression(value: bigint): TExpression;
  protected abstract createConstantNullExpression(): TExpression;
  protected abstract createConstantRegExpExpression(
    source: string,
    value: RegExp,
  ): TExpression;

  protected abstract createConditionalNode(
    source: string,
    testExpression: TExpression,
    consequentExpression: TExpression,
    alternateExpression: TExpression,
  ): TExpression;

  protected abstract createMemberNode(
    source: string,
    pathSegments: TExpression[],
  ): TExpression;

  protected abstract createIndexExpression(expression: TExpression): TExpression;

  protected abstract createSequenceNode(
    source: string,
    expressions: TExpression[],
  ): TExpression;

  protected abstract createIdentifierExpression(name: string): TExpression;

  protected abstract createArrayNode(expressions: TExpression[]): TExpression;

  protected abstract createSpreadNode(expression: TExpression): TExpression;

  protected abstract createNewNode(
    source: string,
    constructorExpression: TExpression,
    argumentExpressions: TExpression[],
  ): TExpression;

  protected abstract createFunctionNode(
    source: string,
    functionExpression: TExpression,
    objectExpression: TExpression | null,
    argumentExpressions: TExpression,
    computed: boolean,
    optional: boolean,
  ): TExpression;

  protected abstract createTemplateLiteralNode(
    source: string,
    expressions: TExpression[],
  ): TExpression;

  protected abstract createUnaryPlusNode(
    source: string,
    argumentExpression: TExpression,
  ): TExpression;

  protected abstract createUnaryMinusNode(
    source: string,
    argumentExpression: TExpression,
  ): TExpression;

  protected abstract createLogicalNotNode(
    source: string,
    argumentExpression: TExpression,
  ): TExpression;

  protected abstract createTypeofNode(
    source: string,
    argumentExpression: TExpression,
  ): TExpression;

  protected abstract createEqualToNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createNotEqualToNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createStrictEqualToNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createStrictNotEqualToNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createLessThanNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createLessThanOrEqualToNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createGreaterThanNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createGreaterThanOrEqualToNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createBitwiseNotNode(
    source: string,
    argumentExpression: TExpression,
  ): TExpression;

  protected abstract createLeftShiftNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createRightShiftNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createUnsignedRightShiftNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createBitwiseOrNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createBitwiseXOrNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createBitwiseAndNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createAdditionNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createSubstractionNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createMultiplicationNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createDivisionNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createModulusNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createExponentiationNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createInstanceOfNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createInNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createLogicalOrNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createLogicalAndNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createNullishCoalescingNode(
    source: string,
    leftExpression: TExpression,
    rightExpression: TExpression,
  ): TExpression;

  protected abstract createObjectNode(
    source: string,
    propertyExpressions: TExpression[],
  ): TExpression;

  protected abstract createPropertyNode(
    source: string,
    keyExpression: TExpression,
    valueExpression: TExpression,
  ): TExpression;

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
  ): TExpression {
    if (!(expression.type in this.expressionFactories)) {
      throw new UnsupportedException(
        `Unsupported expression type ${expression.type}`,
      );
    }

    const factory =
      this.expressionFactories[expression.type as KnownExpressionType];

    return factory(Type.cast(expression));
  }

  private createLiteralExpression(expression: Literal): TExpression {
    if ((expression as RegExpLiteral).regex) {
      const regExpLiteral = expression as RegExpLiteral;
      return this.createConstantRegExpExpression(
        this.getExpressionSource(expression),
        new RegExp(regExpLiteral.regex.pattern, regExpLiteral.regex.flags),
      );
    }

    if (expression.value === null) {
      return this.createConstantNullExpression();
    }

    const valueType = typeof expression.value;

    if (valueType === 'string') {
      return this.createConstantStringExpression(
        Type.cast<string>(expression.value),
      );
    }
    if (valueType === 'number') {
      return this.createConstantNumberExpression(Number(expression.value));
    }
    if (valueType === 'boolean') {
      return this.createConstantBooleanExpression(Boolean(expression.value));
    }
    if (valueType === 'bigint') {
      return this.createConstantBigIntExpression(
        BigInt(Type.cast<bigint>(expression.value)),
      );
    }

    throw new UnsupportedException(`Unsupported literal type: ${valueType}`);
  }

  private createBinaryExpression(expression: BinaryExpression): TExpression {
    return this.binaryExpressionFactories[expression.operator](expression);
  }

  private createAssignmentExpression(
    _expression: EstreeAssignmentExpression,
  ): TExpression {
    throw new UnsupportedException('Assignment expressions are not supported');
  }

  private createUnaryExpression(expression: UnaryExpression): TExpression {
    return this.unaryExpressionFactories[expression.operator](expression);
  }

  private createConditionalExpression(
    expression: EstreeConditionalExpression,
  ): TExpression {
    return this.createConditionalNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.test),
      this.createExpression(expression.consequent),
      this.createExpression(expression.alternate),
    );
  }

  private createLogicalExpression(expression: LogicalExpression): TExpression {
    return this.logicalExpressionFactories[expression.operator](expression);
  }

  private createChainExpression(expression: ChainExpression): TExpression {
    return this.createExpression(expression.expression);
  }

  private createMemberExpression(expression: EstreeMemberExpression): TExpression {
    const pathSegments = this.flattenMemberExpression(expression).map((segment) => {
      const currentExpression = this.createExpression(segment.expression);
      return segment.computed
        ? this.createIndexExpression(currentExpression)
        : currentExpression;
    });

    return this.createMemberNode(this.getExpressionSource(expression), pathSegments);
  }

  private createSequenceExpression(
    expression: EstreeSequenceExpression,
  ): TExpression {
    return this.createSequenceNode(
      this.getExpressionSource(expression, { preferGenerator: true }),
      expression.expressions.map((childExpression) =>
        this.createExpression(childExpression),
      ),
    );
  }

  private createArrayExpression(expression: EstreeArrayExpression): TExpression {
    return this.createArrayNode(
      expression.elements.map((element) =>
        this.createExpression(Type.cast(element)),
      ),
    );
  }

  private createSpreadElementExpression(expression: SpreadElement): TExpression {
    return this.createSpreadNode(this.createExpression(expression.argument));
  }

  private createNewExpression(expression: EstreeNewExpression): TExpression {
    const constructorExpression = this.createExpression(expression.callee);
    const argumentExpressions = expression.arguments.map((argumentExpression) =>
      this.createExpression(argumentExpression),
    );

    return this.createNewNode(
      this.getExpressionSource(expression),
      constructorExpression,
      argumentExpressions,
    );
  }

  private createCallExpression(expression: CallExpression): TExpression {
    let objectExpression: TExpression | null = null;
    let functionExpression: TExpression;
    let computed = false;
    let optional = false;

    if (expression.callee.type === EspreeExpressionType.MemberExpression) {
      objectExpression = this.createExpression(expression.callee.object);
      const normalizedProperty = this.normalizeMemberProperty(
        expression.callee.property,
        expression.callee.computed,
      );
      functionExpression = this.createExpression(normalizedProperty.expression);
      computed = normalizedProperty.computed;
      optional = expression.callee.optional;
    } else {
      functionExpression = this.createExpression(expression.callee);
    }

    const argumentExpressions = expression.arguments.map((argumentExpression) =>
      this.createExpression(argumentExpression),
    );

    return this.createFunctionNode(
      this.getExpressionSource(expression),
      functionExpression,
      objectExpression,
      this.createArrayNode(argumentExpressions),
      computed,
      optional,
    );
  }

  private createTemplateLiteralExpression(
    templateLiteral: TemplateLiteral,
  ): TExpression {
    const { quasis, parameters } =
      this.createTemplateElementExpression(templateLiteral);

    const expressions = quasis.flatMap((quasi, index) => {
      return [quasi, parameters[index]].filter((expression): expression is TExpression =>
        expression !== undefined,
      );
    });

    if (this.isSingleStringLiteralExpression(expressions)) {
      return expressions[0];
    }

    return this.createTemplateLiteralNode(
      this.getExpressionSource(templateLiteral),
      expressions,
    );
  }

  private createTaggedTemplateExpression(
    expression: EstreeTaggedTemplateExpression,
  ): TExpression {
    const { quasis, parameters } = this.createTemplateElementExpression(
      expression.quasi,
    );

    let objectExpression: TExpression | null = null;
    let functionExpression: TExpression;

    if (expression.tag.type === EspreeExpressionType.MemberExpression) {
      objectExpression = this.createExpression(expression.tag.object);
      const normalizedProperty = this.normalizeMemberProperty(
        expression.tag.property,
        expression.tag.computed,
      );
      functionExpression = this.createExpression(normalizedProperty.expression);
    } else {
      functionExpression = this.createExpression(expression.tag);
    }

    return this.createFunctionNode(
      this.getExpressionSource(expression),
      functionExpression,
      objectExpression,
      this.createArrayNode([
        this.createArrayNode(quasis),
        this.createSpreadNode(this.createArrayNode(parameters)),
      ]),
      false,
      false,
    );
  }

  private createTemplateElementExpression(templateLiteral: TemplateLiteral): {
    quasis: TExpression[];
    parameters: TExpression[];
  } {
    return {
      quasis: templateLiteral.quasis.map((quasi) =>
        this.createConstantStringExpression(quasi.value.raw),
      ),
      parameters: templateLiteral.expressions.map((expression) =>
        this.createExpression(expression),
      ),
    };
  }

  private createUnaryPlusExpression(expression: UnaryExpression): TExpression {
    return this.createUnaryPlusNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.argument),
    );
  }

  private createUnaryMinusExpression(expression: UnaryExpression): TExpression {
    return this.createUnaryMinusNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.argument),
    );
  }

  private createLogicalNotExpression(expression: UnaryExpression): TExpression {
    return this.createLogicalNotNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.argument),
    );
  }

  private createTypeofExpression(expression: UnaryExpression): TExpression {
    return this.createTypeofNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.argument),
    );
  }

  private createDeleteExpression(): TExpression {
    throw new UnsupportedException('Delete operator is not supported');
  }

  private createEqualToExpression(expression: BinaryExpression): TExpression {
    return this.createEqualToNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createNotEqualToExpression(expression: BinaryExpression): TExpression {
    return this.createNotEqualToNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createStrictEqualToExpression(expression: BinaryExpression): TExpression {
    return this.createStrictEqualToNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createStrictNotEqualToExpression(
    expression: BinaryExpression,
  ): TExpression {
    return this.createStrictNotEqualToNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createLessThanExpression(expression: BinaryExpression): TExpression {
    return this.createLessThanNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createLessThanOrEqualToExpression(
    expression: BinaryExpression,
  ): TExpression {
    return this.createLessThanOrEqualToNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createGreaterThanExpression(
    expression: BinaryExpression,
  ): TExpression {
    return this.createGreaterThanNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createGreaterThanOrEqualToExpression(
    expression: BinaryExpression,
  ): TExpression {
    return this.createGreaterThanOrEqualToNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createBitwiseNotExpression(expression: UnaryExpression): TExpression {
    return this.createBitwiseNotNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.argument),
    );
  }

  private createLeftShiftExpression(expression: BinaryExpression): TExpression {
    return this.createLeftShiftNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createRightShiftExpression(expression: BinaryExpression): TExpression {
    return this.createRightShiftNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createUnsignedRightShiftExpression(
    expression: BinaryExpression,
  ): TExpression {
    return this.createUnsignedRightShiftNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createBitwiseOrExpression(expression: BinaryExpression): TExpression {
    return this.createBitwiseOrNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createBitwiseXOrExpression(expression: BinaryExpression): TExpression {
    return this.createBitwiseXOrNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createBitwiseAndExpression(
    expression: BinaryExpression,
  ): TExpression {
    return this.createBitwiseAndNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createAdditionExpression(expression: BinaryExpression): TExpression {
    return this.createAdditionNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createSubstractionExpression(
    expression: BinaryExpression,
  ): TExpression {
    return this.createSubstractionNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createMultiplicationExpression(
    expression: BinaryExpression,
  ): TExpression {
    return this.createMultiplicationNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createDivisionExpression(expression: BinaryExpression): TExpression {
    return this.createDivisionNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createModulusExpression(expression: BinaryExpression): TExpression {
    return this.createModulusNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createExponentiationExpression(
    expression: BinaryExpression,
  ): TExpression {
    return this.createExponentiationNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createInstanceOfExpression(
    expression: BinaryExpression,
  ): TExpression {
    return this.createInstanceOfNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createInExpression(expression: BinaryExpression): TExpression {
    return this.createInNode(
      this.getExpressionSource(expression, { preferGenerator: true }),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createLogicalOrExpression(
    expression: LogicalExpression,
  ): TExpression {
    return this.createLogicalOrNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createLogicalAndExpression(
    expression: LogicalExpression,
  ): TExpression {
    return this.createLogicalAndNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createNullishCoalescingExpression(
    expression: LogicalExpression,
  ): TExpression {
    return this.createNullishCoalescingNode(
      this.getExpressionSource(expression),
      this.createExpression(expression.left),
      this.createExpression(expression.right),
    );
  }

  private createObjectExpression(
    objectExpression: EstreeObjectExpression,
  ): TExpression {
    const propertyExpressions = objectExpression.properties.map((property) =>
      this.createExpression(property),
    );

    return this.createObjectNode(
      this.getExpressionSource(objectExpression, { preferGenerator: true }),
      propertyExpressions,
    );
  }

  private createPropertyExpression(propertyExpression: Property): TExpression {
    const keyExpression =
      propertyExpression.key.type === EspreeExpressionType.Identifier
        ? this.createConstantStringExpression(
            Type.cast<Identifier>(propertyExpression.key).name,
          )
        : this.createExpression(propertyExpression.key);

    return this.createPropertyNode(
      this.getExpressionSource(propertyExpression, { preferGenerator: true }),
      keyExpression,
      this.createExpression(propertyExpression.value),
    );
  }

  private parseExpression(expression: string): ExpressionStatement {
    const program = espree.parse(
      expression,
      AbstractJsEspreeExpressionParser._parseOptions,
    ) as Program;

    if (program.body.length === 0) {
      throw new ParserException(expression, 'Empty expression', 0);
    }

    if (program.body.length > 1) {
      throw new ParserException(
        expression,
        'Multiple expression are not supported',
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

    return program.body[0];
  }

  protected getExpressionSource(
    expression: Node | PrivateIdentifier | Super,
    options?: { preferGenerator?: boolean },
  ): string {
    if (options?.preferGenerator) {
      return astToString(Type.cast<Node>(expression));
    }

    const range = Type.cast<{ range?: [number, number] }>(expression).range;
    if (this._currentExpressionSource && range !== undefined) {
      return this._currentExpressionSource.slice(range[0], range[1]);
    }

    return astToString(Type.cast<Node>(expression));
  }

  protected isSingleStringLiteralExpression(
    expressions: TExpression[],
  ): expressions is [TExpression] {
    if (expressions.length !== 1) {
      return false;
    }

    const expression = expressions[0] as unknown as IExpression | undefined;
    return expression?.type === ExpressionType.String;
  }

  private normalizeMemberProperty(
    expression: MemberExpressionSegmentType,
    computed: boolean,
  ): INormalizedMemberProperty {
    if (computed && expression.type === EspreeExpressionType.Literal) {
      const property = expression as Literal;
      if (
        typeof property.value === 'string' ||
        typeof property.value === 'number'
      ) {
        return {
          expression: {
            type: EspreeExpressionType.Identifier,
            name: property.value,
          } as Identifier,
          computed: false,
        };
      }
    }

    return {
      expression,
      computed,
    };
  }

  private flattenMemberExpression(expr: MemberExpressionSegmentType): IPathSegment[] {
    const result: IPathSegment[] = [];

    const walk = (node: MemberExpressionSegmentType): void => {
      switch (node.type) {
        case EspreeExpressionType.MemberExpression:
          walk(node.object as MemberExpressionSegmentType);
          result.push(
            this.normalizeMemberProperty(node.property, node.computed),
          );
          break;

        case EspreeExpressionType.CallExpression:
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
    };

    walk(expr);
    return result;
  }
}
