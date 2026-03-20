import { Subject } from 'rxjs';
import { Observable } from 'rxjs/internal/Observable';
import {
   IBinding,
   IChangedBinding,
} from '../../web-component/binding/interfaces';

export interface IBindingManagerPrivate {
   readonly _rebuildContent: Subject<void>;
   bindInOrder(bindings: IBinding[]): Observable<IChangedBinding[]>;
   setLeftValue(binding: IBinding): Observable<IChangedBinding>;
   setRightValue(binding: IBinding): Observable<IChangedBinding>;
}
