import {
   AnyFunction,
   IIndexValueAccessor,
   Inject,
   Injectable,
   ParserException,
   RsXCoreInjectionTokens,
   Type,
   UnsupportedException,
} from '@rs-x/core';
import {
   IMustProxifyItemHandlerFactory,
   IStateManager,
   RsXStateManagerInjectionTokens,
} from '@rs-x/state-manager';
import { generate as astToString } from 'astring';
import * as espree from 'espree';
import * as estraverse from 'estraverse';
import type {
   AssignmentOperator,
   BinaryExpression,
   BinaryOperator,
   CallExpression,
   ChainExpression,
   ArrayExpression as EstreeArrayExpression,
   AssignmentExpression as EstreeAssignmentExpression,
   ConditionalExpression as EstreeConditionalExpression,
   MemberExpression as EstreeMemberExpression,
   NewExpression as EstreeNewExpression,
   ObjectExpression as EstreeObjectExpression,
   SequenceExpression as EstreeSequenceExpression,
   TaggedTemplateExpression as EstreeTaggedTemplateExpression,
   Expression,
   ExpressionStatement,
   Identifier,
   Literal,
   LogicalExpression,
   LogicalOperator,
   Pattern,
   PrivateIdentifier,
   Program,
   Property,
   RegExpLiteral,
   SpreadElement,
   Super,
   TemplateLiteral,
   UnaryExpression,
   UnaryOperator,
} from 'estree';
import { IndexExpression } from './expressions';
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
import { ConvertToNumberExpression } from './expressions/convert-to-number-expression';
import { DivisionExpression } from './expressions/division-expression';
import { EqualityExpression } from './expressions/equality-expression';
import { ExponentiationExpression } from './expressions/exponentiation-expression';
import { FunctionExpression } from './expressions/function-expression';
import { GreaterThanExpression } from './expressions/greater-than-expression';
import { GreaterThanOrEqualExpression } from './expressions/greater-than-or-equal-expression';
import { IdentifierExpression } from './expressions/identifier-expression';
import { InExpression } from './expressions/in-expression';
import { InequalityExpression } from './expressions/inequality-expression';
import { InstanceofExpression } from './expressions/instanceof-expression';
import {
   ExpressionType,
   IExpression,
   IExpressionParser,
} from './expressions/interfaces';
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
import { SubtractionExpression } from './expressions/subtraction-expression';
import { TemplateStringExpression } from './expressions/template-string-expression';
import { TypeofExpression } from './expressions/typeof-expression';
import { UnaryNegationExpression } from './expressions/unary-negation-expression';
import { IIndexValueObserverManager } from './index-value-observer-manager/index-value-manager-observer.type';
import { RsXExpressionParserInjectionTokens } from './rs-x-expression-parser-injection-tokes';

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
   private readonly expressionFactories: Record<
      EspreeExpressionType,
      (
         expression: Expression | SpreadElement | Property,
         context: unknown,
         onDispose: () => void
      ) => AbstractExpression
   >;
   private readonly unaryExpressionFactories: Record<
      UnaryOperator,
      (
         expression: UnaryExpression,
         context: unknown,
         onDispose: () => void
      ) => AbstractExpression
   >;
   private readonly binaryExpressionFactories: Record<
      BinaryOperator,
      (
         expression: BinaryExpression,
         context: unknown,
         onDispose: () => void
      ) => AbstractExpression
   >;
   private readonly logicalExpressionFactories: Record<
      LogicalOperator,
      (
         expression: LogicalExpression,
         context: unknown,
         onDispose: () => void
      ) => AbstractExpression
   >;
   private readonly assignExpressionFactories: Record<
      AssignmentOperator,
      (
         expression: EstreeAssignmentExpression,
         context: unknown,
         onDispose: () => void
      ) => AbstractExpression
   >;

   constructor(
      @Inject(RsXExpressionParserInjectionTokens.IIndexValueObserverManager)
      private readonly _identifierValueObserverManager: IIndexValueObserverManager,
      @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
      private readonly _indexValueAccessor: IIndexValueAccessor,
      @Inject(RsXStateManagerInjectionTokens.IMustProxifyItemHandlerFactory)
      private readonly _mustProxifyItemHandlerFactory: IMustProxifyItemHandlerFactory,
      @Inject(RsXStateManagerInjectionTokens.IStateManager)
      private readonly _stateManager: IStateManager
   ) {
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
         [EspreeExpressionType.SequenceExpression]:
            this.createSequenceExpression,
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

   public parse(
      context: unknown,
      expressionString: string,
      onDispose: () => void
   ): AbstractExpression {
      const espreeExpression = this.tryParse(expressionString);

      let expression: AbstractExpression;
      try {
         expression = this.createExpression(
            espreeExpression,
            context,
            onDispose
         );
      } catch (e) {
         throw new ParserException(expressionString, e.message);
      }

      return expression.initialize({
         stateManager: this._stateManager,
         context,
      });
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
      context: unknown,
      onDispose: () => void
   ): AbstractExpression {
      const createExpression = this.expressionFactories[expression.type];
      if (!createExpression) {
         throw new UnsupportedException(
            `Unsupported expression type ${expression.type}`
         );
      }

      return createExpression(expression, context, onDispose);
   }

   private createLiteralExpression = (
      expression: Literal
   ): AbstractExpression => {
      if (Type.cast<RegExpLiteral>(expression).regex) {
         const regExpLiteral = expression as RegExpLiteral;
         return new ConstantRegExpExpression(
            astToString(expression),
            new RegExp(regExpLiteral.regex.pattern, regExpLiteral.regex.flags)
         );
      }
      if (expression.value === null) {
         return new ConstantNullExpression();
      }

      return this.createConstantExpression[typeof expression.value](expression);
   };

   private createBinaryExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return this.binaryExpressionFactories[expression.operator](
         expression,
         context,
         onDispose
      );
   };

   private createAssignmentExpression = (
      expression: EstreeAssignmentExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return this.assignExpressionFactories[expression.operator](
         expression,
         context,
         onDispose
      );
   };

   private createUnaryExpression = (
      expression: UnaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return this.unaryExpressionFactories[expression.operator](
         expression,
         context,
         onDispose
      );
   };

   private createConditionalExpression = (
      expression: EstreeConditionalExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new ConditionalExpression(
         astToString(expression),
         this.createExpression(expression.test, context, onDispose),
         this.createExpression(expression.consequent, context, onDispose),
         this.createExpression(expression.alternate, context, onDispose)
      );
   };

   private createLogicalExpression = (
      expression: LogicalExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return this.logicalExpressionFactories[expression.operator](
         expression,
         context,
         onDispose
      );
   };

   private createChainExpression = (
      expression: ChainExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return this.createExpression(expression.expression, context, onDispose);
   };

   private createMemberExpression = (
      expression: EstreeMemberExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      const pathSegments = this.flattenMemberExpression(expression).map((e) => {
         const expression = this.createExpression(
            e.expression,
            context,
            onDispose
         );
         return e.computed ? new IndexExpression(expression) : expression;
      });
      return new MemberExpression(
         astToString(expression),
         pathSegments,
         this._indexValueAccessor,
         this._identifierValueObserverManager,
         this._mustProxifyItemHandlerFactory
      );
   };

   private createSequenceExpression = (
      expression: EstreeSequenceExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new SequenceExpression(
         astToString(expression),
         expression.expressions.map((expression) =>
            this.createExpression(expression, context, onDispose)
         )
      );
   };

   private createIdentifier = (
      expression: Identifier,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new IdentifierExpression(
         context,
         this._identifierValueObserverManager,
         onDispose,
         expression.name
      );
   };

   private createArrayExpression = (
      expression: EstreeArrayExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new ArrayExpression(
         expression.elements.map((element) =>
            this.createExpression(element, context, onDispose)
         )
      );
   };

   private createSpreadExpression = (
      expression: SpreadElement,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new SpreadExpression(
         this.createExpression(expression.argument, context, onDispose) as
            | ArrayExpression
            | ObjectExpression
      );
   };

   private createNewExpression = (
      expression: EstreeNewExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      const constructorExpression = this.createExpression(
         expression.callee,
         context,
         onDispose
      );
      const argumentExpressions = expression.arguments.map(
         (argumentExpressions) =>
            this.createExpression(argumentExpressions, context, onDispose)
      );
      return new NewExpression(
         astToString(expression),
         Type.cast(constructorExpression),
         argumentExpressions
      );
   };

   private createCallExpression = (
      expression: CallExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      let objectExpression: IExpression<object> = null;
      let functionExpression: IExpression;
      if (expression.callee.type === EspreeExpressionType.MemberExpression) {
         objectExpression = this.createExpression(
            expression.callee.object,
            context,
            onDispose
         ) as IExpression<object>;
         functionExpression = this.createExpression(
            expression.callee.property,
            context,
            onDispose
         );
      } else {
         functionExpression = this.createExpression(
            expression.callee,
            context,
            onDispose
         );
      }

      const argumentExpressions = expression.arguments.map(
         (argumentExpression) =>
            this.createExpression(argumentExpression, context, onDispose)
      );

      return new FunctionExpression(
         astToString(expression),
         Type.cast(functionExpression),
         Type.cast(objectExpression),
         new ArrayExpression(argumentExpressions),
         Type.cast<{ computed: boolean }>(expression.callee).computed,
         Type.cast<{ optional: boolean }>(expression.callee).optional
      );
   };

   private createTemplateLiteralExpression = (
      templateLiteral: TemplateLiteral,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      const { quasis, parameters } = this.createTemplateElementExpression(
         templateLiteral,
         context,
         onDispose
      );

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
         expressions
      );
   };

   private createTaggedTemplateExpression = (
      expression: EstreeTaggedTemplateExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      const { quasis, parameters } = this.createTemplateElementExpression(
         expression.quasi,
         context,
         onDispose
      );

      let objectExpression: IExpression<object>;
      let functionExpression: IExpression<AnyFunction | string | number>;

      if (expression.tag.type === EspreeExpressionType.MemberExpression) {
         objectExpression = this.createExpression(
            expression.tag.object,
            context,
            onDispose
         ) as IExpression<object>;
         functionExpression = this.createExpression(
            expression.tag.property,
            context,
            onDispose
         ) as IExpression<AnyFunction | string | number>;
      } else {
         functionExpression = this.createExpression(
            expression.tag,
            context,
            onDispose
         ) as IExpression<AnyFunction | string | number>;
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
         false
      );
   };

   private createTemplateElementExpression(
      templateLiteral: TemplateLiteral,
      context: unknown,
      onDispose: () => void
   ): { quasis: AbstractExpression[]; parameters: AbstractExpression[] } {
      return {
         quasis: templateLiteral.quasis.map(
            (quasi) => new ConstantStringExpression(quasi.value.raw)
         ),
         parameters: templateLiteral.expressions.map((expression) =>
            this.createExpression(expression, context, onDispose)
         ),
      };
   }

   private createUnaryPlusExpression = (
      expression: UnaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new ConvertToNumberExpression(
         astToString(expression),
         this.createExpression(expression.argument, context, onDispose)
      );
   };

   private createUnaryMinusExpression = (
      expression: UnaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new UnaryNegationExpression(
         astToString(expression),
         Type.cast(
            this.createExpression(expression.argument, context, onDispose)
         )
      );
   };

   private createLogicalNotExpression = (
      expression: UnaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new LogicalNotExpression(
         astToString(expression),
         this.createExpression(expression.argument, context, onDispose)
      );
   };

   private createTypeofExpression = (
      expression: UnaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new TypeofExpression(
         astToString(expression),
         this.createExpression(expression.argument, context, onDispose)
      );
   };

   private createDeleteExpression = (): AbstractExpression => {
      throw new UnsupportedException('Delete operator is not supported');
   };

   private createEqualToExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new EqualityExpression(
         astToString(expression),
         this.createExpression(expression.left, context, onDispose),
         this.createExpression(expression.right, context, onDispose)
      );
   };

   private createNotEqualToExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new InequalityExpression(
         astToString(expression),
         this.createExpression(expression.left, context, onDispose),
         this.createExpression(expression.right, context, onDispose)
      );
   };

   private createStrictEqualToExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new StrictEqualityExpression(
         astToString(expression),
         this.createExpression(expression.left, context, onDispose),
         this.createExpression(expression.right, context, onDispose)
      );
   };

   private createStrictNotEqualToExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new StrictInequalityExpression(
         astToString(expression),
         this.createExpression(expression.left, context, onDispose),
         this.createExpression(expression.right, context, onDispose)
      );
   };

   private createLessThanExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new LessThanExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context, onDispose)),
         Type.cast(this.createExpression(expression.right, context, onDispose))
      );
   };
   private createLessThanOrEqualToExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new LessThanOrEqualExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context, onDispose)),
         Type.cast(this.createExpression(expression.right, context, onDispose))
      );
   };

   private createGreaterThanExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new GreaterThanExpression(
         astToString(expression),
         this.createExpression(expression.left, context, onDispose),
         this.createExpression(expression.right, context, onDispose)
      );
   };

   private createGreaterThanOrEqualToExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new GreaterThanOrEqualExpression(
         astToString(expression),
         this.createExpression(expression.left, context, onDispose),
         this.createExpression(expression.right, context, onDispose)
      );
   };

   private createBitwiseNotExpression = (
      expression: UnaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new BitwiseNotExpression(
         astToString(expression),
         Type.cast(
            this.createExpression(expression.argument, context, onDispose)
         )
      );
   };

   private createLeftShiftExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new BitwiseLeftShiftExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context, onDispose)),
         Type.cast(this.createExpression(expression.right, context, onDispose))
      );
   };

   private createRightShiftExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new BitwiseRightShiftExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context, onDispose)),
         Type.cast(this.createExpression(expression.right, context, onDispose))
      );
   };

   private createUnsignedRightShiftExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new BitwiseUnsignedRightShiftExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context, onDispose)),
         Type.cast(this.createExpression(expression.right, context, onDispose))
      );
   };

   private createBitwiseOrExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new BitwiseOrExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context, onDispose)),
         Type.cast(this.createExpression(expression.right, context, onDispose))
      );
   };

   private createBitwiseXOrExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new BitwiseXorExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context, onDispose)),
         Type.cast(this.createExpression(expression.right, context, onDispose))
      );
   };

   private createBitwiseAndExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new BitwiseAndExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context, onDispose)),
         Type.cast(this.createExpression(expression.right, context, onDispose))
      );
   };

   private createAdditionExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new AdditionExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context, onDispose)),
         Type.cast(this.createExpression(expression.right, context, onDispose))
      );
   };

   private createSubstractionExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new SubtractionExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context, onDispose)),
         Type.cast(this.createExpression(expression.right, context, onDispose))
      );
   };

   private createMultiplicationExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new MultiplicationExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context, onDispose)),
         Type.cast(this.createExpression(expression.right, context, onDispose))
      );
   };

   private createDivisionExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new DivisionExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context, onDispose)),
         Type.cast(this.createExpression(expression.right, context, onDispose))
      );
   };

   private createModulusExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new RemainderExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context, onDispose)),
         Type.cast(this.createExpression(expression.right, context, onDispose))
      );
   };

   private createExponentiationExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new ExponentiationExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context, onDispose)),
         Type.cast(this.createExpression(expression.right, context, onDispose))
      );
   };

   private createInstanceOfExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new InstanceofExpression(
         astToString(expression),
         this.createExpression(expression.left, context, onDispose),
         Type.cast(this.createExpression(expression.right, context, onDispose))
      );
   };

   private createInExpression = (
      expression: BinaryExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new InExpression(
         astToString(expression),
         this.createExpression(expression.left, context, onDispose),
         this.createExpression(expression.right, context, onDispose)
      );
   };

   private createLogicalOrExpression = (
      expression: LogicalExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new LogicalOrExpression(
         astToString(expression),
         this.createExpression(expression.left, context, onDispose),
         this.createExpression(expression.right, context, onDispose)
      );
   };

   private createLogicalAndExpression = (
      expression: LogicalExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new LogicalAndExpression(
         astToString(expression),
         this.createExpression(expression.left, context, onDispose),
         this.createExpression(expression.right, context, onDispose)
      );
   };

   private createNullishCoalescingExpression = (
      expression: LogicalExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      return new NullishCoalescingExpression(
         astToString(expression),
         this.createExpression(expression.left, context, onDispose),
         this.createExpression(expression.right, context, onDispose)
      );
   };

   private createObjectExpression = (
      objectExpression: EstreeObjectExpression,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      const propertyExpressions = objectExpression.properties.map(
         (property) =>
            this.createExpression(property, context, onDispose) as
               | PropertyExpression
               | SpreadExpression
      );
      return new ObjectExpression(
         astToString(objectExpression),
         propertyExpressions
      );
   };

   private createPropertyExpression = (
      propertyExpression: Property,
      context: unknown,
      onDispose: () => void
   ): AbstractExpression => {
      const keyExpression =
         propertyExpression.key.type === EspreeExpressionType.Identifier
            ? new ConstantStringExpression(
                 Type.cast<Identifier>(propertyExpression.key).name
              )
            : this.createExpression(propertyExpression.key, context, onDispose);

      return new PropertyExpression(
         astToString(propertyExpression),
         keyExpression as AbstractExpression<PropertyKey, unknown>,
         this.createExpression(propertyExpression.value, context, onDispose)
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
            0
         );
      }

      if (program.body[0].type !== 'ExpressionStatement') {
         throw new ParserException(
            expression,
            `Unsupported expression type ${program.body[0].type}`,
            0
         );
      }

      const expressionStatement = program.body[0];
      this.normalizeAST(expressionStatement);
      return expressionStatement;
   }

   // Normalize a['b'] to a.b
   private normalizeAST(ast: ExpressionStatement): void {
      estraverse.traverse(ast, {
         enter(node) {
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
      expr: MemberExpressionSegmentType
   ): IPathSehment[] {
      const result: IPathSehment[] = [];

      function walk(node: MemberExpressionSegmentType): void {
         switch (node.type) {
            case 'MemberExpression':
               // push the property once (do NOT recurse into it)
               result.push({
                  expression: node.property,
                  computed: node.computed,
               });

               // continue with object
               walk(node.object);
               break;

            case 'CallExpression':
               result.push({
                  expression: node,
                  computed: false,
               });
               walk(node.callee as MemberExpressionSegmentType);
               break;
            default:
               result.push({
                  expression: node,
                  computed: false,
               });
         }
      }

      walk(expr);
      return result.reverse();
   }
}
