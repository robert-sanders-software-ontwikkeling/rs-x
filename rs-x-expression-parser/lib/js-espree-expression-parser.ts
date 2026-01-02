import {
   AnyFunction,
   IDisposableOwner,
   IIndexValueAccessor,
   Inject,
   Injectable,
   ParserException,
   RsXCoreInjectionTokens,
   Type,
   UnsupportedException
} from '@rs-x/core';
import {
   IMustProxifyItemHandlerFactory,
   IStateManager,
   RsXStateManagerInjectionTokens
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
import { IGuidFactory } from '../../rs-x-core/lib/guid/guid.factory.interface';
import { IExpressionChangeTransactionManager } from './expresion-change-transaction-manager.interface';
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
import { UnaryPlusExpression } from './expressions/unary-plus-expression';
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
         new ConstantStringExpression(literal.value as string, this._expressionChangeTransactionManager),
      number: (literal: Literal) =>
         new ConstantNumberExpression(Number(literal.value), this._expressionChangeTransactionManager),
      boolean: (literal: Literal) =>
         new ConstantBooleanExpression(Boolean(literal.value), this._expressionChangeTransactionManager),
      bigint: (literal: Literal) =>
         new ConstantBigIntExpression(BigInt(literal.value as string), this._expressionChangeTransactionManager),
   };
   private readonly expressionFactories: Record<
      EspreeExpressionType,
      (
         expression: Expression | SpreadElement | Property,
         context: unknown
      ) => AbstractExpression
   >;
   private readonly unaryExpressionFactories: Record<
      UnaryOperator,
      (
         expression: UnaryExpression,
         context: unknown
      ) => AbstractExpression
   >;
   private readonly binaryExpressionFactories: Record<
      BinaryOperator,
      (
         expression: BinaryExpression,
         context: unknown
      ) => AbstractExpression
   >;
   private readonly logicalExpressionFactories: Record<
      LogicalOperator,
      (
         expression: LogicalExpression,
         context: unknown
      ) => AbstractExpression
   >;
   private readonly assignExpressionFactories: Record<
      AssignmentOperator,
      (
         expression: EstreeAssignmentExpression,
         context: unknown
      ) => AbstractExpression
   >;

   constructor(
      @Inject(RsXCoreInjectionTokens.IIndexValueAccessor)
      private readonly _indexValueAccessor: IIndexValueAccessor,
      @Inject(RsXStateManagerInjectionTokens.IMustProxifyItemHandlerFactory)
      private readonly _mustProxifyItemHandlerFactory: IMustProxifyItemHandlerFactory,
      @Inject(RsXExpressionParserInjectionTokens.IExpressionChangeTransactionManager)
      private readonly _expressionChangeTransactionManager: IExpressionChangeTransactionManager,
      @Inject(RsXStateManagerInjectionTokens.IStateManager)
      private readonly _stateManager: IStateManager,
      @Inject(RsXCoreInjectionTokens.IGuidFactory)
      private readonly _guidFactory: IGuidFactory,
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
      owner: IDisposableOwner
   ): AbstractExpression {
      const espreeExpression = this.tryParse(expressionString);

      let expression: AbstractExpression;
      try {
         expression = this.createExpression(
            espreeExpression,
            context
         );
      } catch (e) {
         throw new ParserException(expressionString, e.message);
      }

      expression.initialize({
         context,
         transactionManager: this._expressionChangeTransactionManager,
         owner
      });
      this._expressionChangeTransactionManager.commit();

      return expression
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
      context: unknown
   ): AbstractExpression {
      const createExpression = this.expressionFactories[expression.type];
      if (!createExpression) {
         throw new UnsupportedException(
            `Unsupported expression type ${expression.type}`
         );
      }

      return createExpression(expression, context);
   }

   private createLiteralExpression = (
      expression: Literal
   ): AbstractExpression => {
      if (Type.cast<RegExpLiteral>(expression).regex) {
         const regExpLiteral = expression as RegExpLiteral;
         return new ConstantRegExpExpression(
            astToString(expression),
            new RegExp(regExpLiteral.regex.pattern, regExpLiteral.regex.flags),
            this._expressionChangeTransactionManager
         );
      }
      if (expression.value === null) {
         return new ConstantNullExpression(this._expressionChangeTransactionManager);
      }

      return this.createConstantExpression[typeof expression.value](expression);
   };

   private createBinaryExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return this.binaryExpressionFactories[expression.operator](
         expression,
         context
      );
   };

   private createAssignmentExpression = (
      expression: EstreeAssignmentExpression,
      context: unknown
   ): AbstractExpression => {
      return this.assignExpressionFactories[expression.operator](
         expression,
         context
      );
   };

   private createUnaryExpression = (
      expression: UnaryExpression,
      context: unknown
   ): AbstractExpression => {
      return this.unaryExpressionFactories[expression.operator](
         expression,
         context
      );
   };

   private createConditionalExpression = (
      expression: EstreeConditionalExpression,
      context: unknown
   ): AbstractExpression => {
      return new ConditionalExpression(
         astToString(expression),
         this.createExpression(expression.test, context),
         this.createExpression(expression.consequent, context),
         this.createExpression(expression.alternate, context)
      );
   };

   private createLogicalExpression = (
      expression: LogicalExpression,
      context: unknown
   ): AbstractExpression => {
      return this.logicalExpressionFactories[expression.operator](
         expression,
         context
      );
   };

   private createChainExpression = (
      expression: ChainExpression,
      context: unknown
   ): AbstractExpression => {
      return this.createExpression(expression.expression, context);
   };

   private createMemberExpression = (
      expression: EstreeMemberExpression,
      context: unknown
   ): AbstractExpression => {
      const pathSegments = this.flattenMemberExpression(expression).map((e) => {
         const expression = this.createExpression(
            e.expression,
            context
         );
         return e.computed ? new IndexExpression(expression) : expression;
      });
      return new MemberExpression(
         astToString(expression),
         pathSegments,
         this._indexValueAccessor,
         this._stateManager,
         this._mustProxifyItemHandlerFactory,
         this._expressionChangeTransactionManager
      );
   };

   private createSequenceExpression = (
      expression: EstreeSequenceExpression,
      context: unknown
   ): AbstractExpression => {
      return new SequenceExpression(
         astToString(expression),
         expression.expressions.map((expression) =>
            this.createExpression(expression, context)
         )
      );
   };

   private createIdentifier = (
      expression: Identifier,
      context: unknown
   ): AbstractExpression => {
      return new IdentifierExpression(
         context,
         this._stateManager,
         expression.name,
         this._expressionChangeTransactionManager
      );
   };

   private createArrayExpression = (
      expression: EstreeArrayExpression,
      context: unknown
   ): AbstractExpression => {
      return new ArrayExpression(
         expression.elements.map((element) =>
            this.createExpression(element, context)
         )
      );
   };

   private createSpreadExpression = (
      expression: SpreadElement,
      context: unknown
   ): AbstractExpression => {
      return new SpreadExpression(
         this.createExpression(expression.argument, context) as
         | ArrayExpression
         | ObjectExpression
      );
   };

   private createNewExpression = (
      expression: EstreeNewExpression,
      context: unknown
   ): AbstractExpression => {
      const constructorExpression = this.createExpression(
         expression.callee,
         context,
      );
      const argumentExpressions = expression.arguments.map(
         (argumentExpressions) =>
            this.createExpression(argumentExpressions, context)
      );
      return new NewExpression(
         astToString(expression),
         Type.cast(constructorExpression),
         argumentExpressions
      );
   };

   private createCallExpression = (
      expression: CallExpression,
      context: unknown
   ): AbstractExpression => {
      let objectExpression: IExpression<object> = null;
      let functionExpression: IExpression;
      if (expression.callee.type === EspreeExpressionType.MemberExpression) {
         objectExpression = this.createExpression(
            expression.callee.object,
            context
         ) as IExpression<object>;
         functionExpression = this.createExpression(
            expression.callee.property,
            context
         );
      } else {
         functionExpression = this.createExpression(
            expression.callee,
            context
         );
      }

      const argumentExpressions = expression.arguments.map(
         (argumentExpression) =>
            this.createExpression(argumentExpression, context)
      );

      return new FunctionExpression(
         astToString(expression),
         Type.cast(functionExpression),
         Type.cast(objectExpression),
         new ArrayExpression(argumentExpressions),
         Type.cast<{ computed: boolean }>(expression.callee).computed,
         Type.cast<{ optional: boolean }>(expression.callee).optional,
         this._expressionChangeTransactionManager,
         this._stateManager,
         this._guidFactory
      
      );
   };

   private createTemplateLiteralExpression = (
      templateLiteral: TemplateLiteral,
      context: unknown
   ): AbstractExpression => {
      const { quasis, parameters } = this.createTemplateElementExpression(
         templateLiteral,
         context,
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
      context: unknown
   ): AbstractExpression => {
      const { quasis, parameters } = this.createTemplateElementExpression(
         expression.quasi,
         context
      );

      let objectExpression: IExpression<object>;
      let functionExpression: IExpression<AnyFunction | string | number>;

      if (expression.tag.type === EspreeExpressionType.MemberExpression) {
         objectExpression = this.createExpression(
            expression.tag.object,
            context
         ) as IExpression<object>;
         functionExpression = this.createExpression(
            expression.tag.property,
            context
         ) as IExpression<AnyFunction | string | number>;
      } else {
         functionExpression = this.createExpression(
            expression.tag,
            context
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
         false,
         this._expressionChangeTransactionManager,
         this._stateManager,
         this._guidFactory
      );
   };

   private createTemplateElementExpression(
      templateLiteral: TemplateLiteral,
      context: unknown
   ): { quasis: AbstractExpression[]; parameters: AbstractExpression[] } {
      return {
         quasis: templateLiteral.quasis.map(
            (quasi) => new ConstantStringExpression(quasi.value.raw, this._expressionChangeTransactionManager)
         ),
         parameters: templateLiteral.expressions.map((expression) =>
            this.createExpression(expression, context)
         ),
      };
   }

   private createUnaryPlusExpression = (
      expression: UnaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new UnaryPlusExpression(
         astToString(expression),
         this.createExpression(expression.argument, context)
      );
   };

   private createUnaryMinusExpression = (
      expression: UnaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new UnaryNegationExpression(
         astToString(expression),
         Type.cast(
            this.createExpression(expression.argument, context)
         )
      );
   };

   private createLogicalNotExpression = (
      expression: UnaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new LogicalNotExpression(
         astToString(expression),
         this.createExpression(expression.argument, context)
      );
   };

   private createTypeofExpression = (
      expression: UnaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new TypeofExpression(
         astToString(expression),
         this.createExpression(expression.argument, context)
      );
   };

   private createDeleteExpression = (): AbstractExpression => {
      throw new UnsupportedException('Delete operator is not supported');
   };

   private createEqualToExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new EqualityExpression(
         astToString(expression),
         this.createExpression(expression.left, context),
         this.createExpression(expression.right, context)
      );
   };

   private createNotEqualToExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new InequalityExpression(
         astToString(expression),
         this.createExpression(expression.left, context),
         this.createExpression(expression.right, context)
      );
   };

   private createStrictEqualToExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new StrictEqualityExpression(
         astToString(expression),
         this.createExpression(expression.left, context),
         this.createExpression(expression.right, context)
      );
   };

   private createStrictNotEqualToExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new StrictInequalityExpression(
         astToString(expression),
         this.createExpression(expression.left, context),
         this.createExpression(expression.right, context)
      );
   };

   private createLessThanExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new LessThanExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context)),
         Type.cast(this.createExpression(expression.right, context))
      );
   };
   private createLessThanOrEqualToExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new LessThanOrEqualExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context)),
         Type.cast(this.createExpression(expression.right, context))
      );
   };

   private createGreaterThanExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new GreaterThanExpression(
         astToString(expression),
         this.createExpression(expression.left, context),
         this.createExpression(expression.right, context)
      );
   };

   private createGreaterThanOrEqualToExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new GreaterThanOrEqualExpression(
         astToString(expression),
         this.createExpression(expression.left, context),
         this.createExpression(expression.right, context)
      );
   };

   private createBitwiseNotExpression = (
      expression: UnaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new BitwiseNotExpression(
         astToString(expression),
         Type.cast(
            this.createExpression(expression.argument, context)
         )
      );
   };

   private createLeftShiftExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new BitwiseLeftShiftExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context)),
         Type.cast(this.createExpression(expression.right, context))
      );
   };

   private createRightShiftExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new BitwiseRightShiftExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context)),
         Type.cast(this.createExpression(expression.right, context))
      );
   };

   private createUnsignedRightShiftExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new BitwiseUnsignedRightShiftExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context)),
         Type.cast(this.createExpression(expression.right, context))
      );
   };

   private createBitwiseOrExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new BitwiseOrExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context)),
         Type.cast(this.createExpression(expression.right, context))
      );
   };

   private createBitwiseXOrExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new BitwiseXorExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context)),
         Type.cast(this.createExpression(expression.right, context))
      );
   };

   private createBitwiseAndExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new BitwiseAndExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context)),
         Type.cast(this.createExpression(expression.right, context))
      );
   };

   private createAdditionExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new AdditionExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context)),
         Type.cast(this.createExpression(expression.right, context))
      );
   };

   private createSubstractionExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new SubtractionExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context)),
         Type.cast(this.createExpression(expression.right, context))
      );
   };

   private createMultiplicationExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new MultiplicationExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context)),
         Type.cast(this.createExpression(expression.right, context))
      );
   };

   private createDivisionExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new DivisionExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context)),
         Type.cast(this.createExpression(expression.right, context))
      );
   };

   private createModulusExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new RemainderExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context)),
         Type.cast(this.createExpression(expression.right, context))
      );
   };

   private createExponentiationExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new ExponentiationExpression(
         astToString(expression),
         Type.cast(this.createExpression(expression.left, context)),
         Type.cast(this.createExpression(expression.right, context))
      );
   };

   private createInstanceOfExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new InstanceofExpression(
         astToString(expression),
         this.createExpression(expression.left, context),
         Type.cast(this.createExpression(expression.right, context))
      );
   };

   private createInExpression = (
      expression: BinaryExpression,
      context: unknown
   ): AbstractExpression => {
      return new InExpression(
         astToString(expression),
         this.createExpression(expression.left, context),
         this.createExpression(expression.right, context)
      );
   };

   private createLogicalOrExpression = (
      expression: LogicalExpression,
      context: unknown
   ): AbstractExpression => {
      return new LogicalOrExpression(
         astToString(expression),
         this.createExpression(expression.left, context),
         this.createExpression(expression.right, context)
      );
   };

   private createLogicalAndExpression = (
      expression: LogicalExpression,
      context: unknown
   ): AbstractExpression => {
      return new LogicalAndExpression(
         astToString(expression),
         this.createExpression(expression.left, context),
         this.createExpression(expression.right, context)
      );
   };

   private createNullishCoalescingExpression = (
      expression: LogicalExpression,
      context: unknown
   ): AbstractExpression => {
      return new NullishCoalescingExpression(
         astToString(expression),
         this.createExpression(expression.left, context),
         this.createExpression(expression.right, context)
      );
   };

   private createObjectExpression = (
      objectExpression: EstreeObjectExpression,
      context: unknown
   ): AbstractExpression => {
      const propertyExpressions = objectExpression.properties.map(
         (property) =>
            this.createExpression(property, context) as
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
      context: unknown
   ): AbstractExpression => {
      const keyExpression =
         propertyExpression.key.type === EspreeExpressionType.Identifier
            ? new ConstantStringExpression(
               Type.cast<Identifier>(propertyExpression.key).name,
               this._expressionChangeTransactionManager
            )
            : this.createExpression(propertyExpression.key, context);

      return new PropertyExpression(
         astToString(propertyExpression),
         keyExpression as AbstractExpression<PropertyKey, unknown>,
         this.createExpression(propertyExpression.value, context)
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
