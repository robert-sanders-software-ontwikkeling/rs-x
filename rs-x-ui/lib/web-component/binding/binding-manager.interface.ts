import { Observable } from 'rxjs';
import {
   IBinding,
   IReflectedAttribute,
} from './interfaces';

export interface IBindingManager {
   readonly bound: Observable<void>;
   readonly attributeReflected: Observable<IReflectedAttribute>;
   readonly rebuildContent: Observable<void>;
   setPropertyFromAttribute(
      attributeName: string,
      newValue: unknown,
      oldValue: unknown
   ): Promise<void>;
   attachBindingsManually(bindings: IBinding[]): void;
   attachBindings(content: Node[]): void;
   rebindElements(element: Node[]):void;
   removeBindingsForElements(elements: Node[]): void;
   detachBindings(): void;
}
