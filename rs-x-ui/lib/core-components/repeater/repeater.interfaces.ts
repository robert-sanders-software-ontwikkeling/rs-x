import { ArrayObserver } from '@rs-x/core';
import { Observable } from 'rxjs';
import {
   ICustomElement,
   ICustomElementController,
} from '../../web-component/interfaces';

export interface IRepeaterController extends ICustomElementController {
   itemFieldName: string;
   items: unknown[] | ArrayObserver<unknown>;
}

export interface IRepeaterItemsChangeInfo {
   addedElements: Element[];
   deletedElements: Element[];
   currentElements: Element[];
}

export interface IRepeaterDirective
   extends ICustomElement<IRepeaterController> {
   itemsBound: Observable<void>;
   items: unknown[] | ArrayObserver<unknown>;
}
