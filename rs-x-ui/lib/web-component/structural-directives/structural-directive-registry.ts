import {
   Injectable,
   InjectionContainer,
   InvalidOperationException,
   PreDestroy,
} from '@rs-x/core';
import { IDomQuery } from '../../dom-query/dom-query.interface';
import { RsXUIInjectionTokens } from '../../rx-x-ui.injection-tokens';
import { Observable, Subject, Subscription } from 'rxjs';
import { IDirectiveMetadata } from './directive-decorator/directive-metadata.interface';
import { IStructuralDirectiveFactory } from './repeater/repeater-directive.factory.interface';
import { IStructuralDirective } from './repeater/repeater.directive.interface';
import { IStructuralDirectiveRegistry } from './structural-directive-registry.interface';

@Injectable()
export class StructuralDirectiveRegistry
   implements IStructuralDirectiveRegistry
{
   private _bound = new Subject<IStructuralDirective>();
   private _attached = new Subject<IStructuralDirective[]>();
   private _detached = new Subject<IStructuralDirective[]>();
   public static readonly instance = new StructuralDirectiveRegistry();
   private readonly _observers = new Map<
      ShadowRoot | Element,
      MutationObserver
   >();
   private readonly _directiveInstances = new Map<
      Element,
      IStructuralDirective[]
   >();
   private readonly _directivesMetadata = new Map<string, IDirectiveMetadata>();

   private readonly _boundSubscriptions = new Map<
      IStructuralDirective,
      Subscription
   >();
   private _directiveAttributes: string[] | null = null;

   private constructor() {}

   public get attached(): Observable<IStructuralDirective[]> {
      return this._attached;
   }

   public get detached(): Observable<IStructuralDirective[]> {
      return this._detached;
   }

   public get bound(): Observable<IStructuralDirective> {
      return this._bound;
   }

   public getDirectivesForElement(element: Element): IStructuralDirective[] {
      return this._directiveInstances.get(element) ?? [];
   }

   @PreDestroy()
   public dispose(): void {
      Array.from(this._observers.values()).forEach((observer) =>
         observer.disconnect()
      );
      this._observers.clear();
      this._directivesMetadata.clear();
      this._directiveInstances.clear();
      this._directiveAttributes = null;
   }

   public unregisterDirective(name: string): void {
      this._directiveAttributes = null;
      this._directivesMetadata.delete(`data-${name}`);
   }

   public registerDirective(metadata: IDirectiveMetadata): void {
      const name = `data-${metadata.name}`;
      if (this._directivesMetadata.has(name)) {
         throw new InvalidOperationException(
            `Directive ${metadata.name} has already been registered`
         );
      }
      this._directivesMetadata.set(name, metadata);
      this._directiveAttributes = null;
   }

   public registerContext(context: ShadowRoot | HTMLElement): void {
      const observer = new MutationObserver(this.onChanged);
      observer.observe(context, {
         childList: true,
         subtree: true,
      });

      this._observers.set(context, observer);
   }

   public unregisterContext(context: ShadowRoot | HTMLElement): void {
      this._observers.get(context)?.disconnect();
      this._observers.delete(context);

      const elementsToDetach = this.getValidElements(
         context.querySelectorAll('*')
      );
      this.detachDirectives(elementsToDetach);
   }

   private get directiveAttributes(): string[] {
      if (!this._directiveAttributes) {
         this._directiveAttributes = Array.from(
            this._directivesMetadata.keys()
         ).sort(
            (a, b) =>
               (this._directivesMetadata.get(b)?.priority ?? 0) -
               (this._directivesMetadata.get(a)?.priority ?? 0)
         );
      }
      return this._directiveAttributes;
   }

   private onChanged = (mutations: MutationRecord[]) => {
      mutations.forEach((mutation) => {
         this.attachDirectives(this.getValidElements(mutation.addedNodes));
         this.detachDirectives(this.getValidElements(mutation.removedNodes));
      });
   };

   private detachDirectives(elements: Element[]): void {
      elements.forEach((element) => {
         this._observers.get(element)?.disconnect();
         this._observers.delete(element);
      });

      const directives = elements
         .map((element) => this._directiveInstances.get(element))
         .filter((d): d is IStructuralDirective[] => !!d)
         .reduce((a, b) => a.concat(b), []);

      elements.forEach((element) => this._directiveInstances.delete(element));

      if (directives.length === 0) {
         return;
      }

      directives.forEach((directive) => {
         directive.detach();
         this._boundSubscriptions.get(directive)?.unsubscribe();
         this._boundSubscriptions.delete(directive);
      });

      this._detached.next(directives);
   }

   private getValidElements(nodes: NodeList): Element[] {
      const domQuery = InjectionContainer.get<IDomQuery>(
         RsXUIInjectionTokens.IDomQuery
      );

      return Array.from(nodes)
         .filter(
            (node) =>
               node.nodeType === Node.ELEMENT_NODE &&
               !domQuery.isInsideTemplate(node)
         )
         .map((node) => [
            node,
            ...domQuery.getDescendantsExceptTemplateContent(node),
         ])
         .reduce((a, b) => a.concat(b), []) as Element[];
   }

   private async attachDirectives(elements: Element[]): Promise<void> {
      const directives = elements
         .map((element) => this.attachDirectiveToElement(element))
         .reduce((a, b) => a.concat(b), []);

      if (directives.length === 0) {
         return;
      }
      await Promise.all(
         directives.map((directive) => {
            this._boundSubscriptions.set(
               directive,
               directive.bound.subscribe(() => this.emitBound(directive))
            );
            return directive.attach();
         })
      );

      this._attached.next(directives);
   }

   private emitBound(directive: IStructuralDirective): void {
      this._bound.next(directive);
   }

   private attachDirectiveToElement(element: Element): IStructuralDirective[] {
      const directives = this.directiveAttributes
         .filter((directiveAttribute) =>
            element.hasAttribute(directiveAttribute)
         )
         .map((directiveAttribute) => {
            const directiveMetadata =
               this._directivesMetadata.get(directiveAttribute);
            const expressionString = element.getAttribute(directiveAttribute);

            const factory = InjectionContainer.get<IStructuralDirectiveFactory>(
               directiveMetadata!.factortyToken
            );
            return factory.create(element, expressionString!);
         });

      this._directiveInstances.set(element, directives);

      return directives;
   }
}
