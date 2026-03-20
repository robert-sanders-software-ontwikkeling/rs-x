import { IDisposable } from '@rs-x/core';
import { IDirectiveMetadata } from './directive-decorator/directive-metadata.interface';
import { Observable } from 'rxjs';
import { IStructuralDirective } from './repeater/repeater.directive.interface';

export interface IStructuralDirectiveRegistry extends IDisposable {
   readonly attached: Observable<IStructuralDirective[]>;
   readonly detached: Observable<IStructuralDirective[]>;
   readonly bound: Observable<IStructuralDirective>;
   getDirectivesForElement(element: Element): IStructuralDirective[];
   unregisterDirective(name: string): void;
   registerDirective(directive: IDirectiveMetadata): void;
   registerContext(shadowRoot: ShadowRoot): void;
   unregisterContext(context: ShadowRoot | HTMLElement): void;
}
