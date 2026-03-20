import { ObservableMock } from '@rs-x/core/testing';
import { IResizeObserverEntry } from '../resize/resize-observer-entry.interface';
import {
   ISlotBoundEventArgs,
} from '../web-component/binding/interfaces';
import {
   IStyle,
   IWebComponentController,
   IWebComponentElement,
} from '../web-component/interfaces';

export interface IWebComponentElementMockProperties<
   T extends IWebComponentController = IWebComponentController,
> {
   visible?: boolean;
   customStyle?: IStyle;
   element?: HTMLElement;
   controller?: T;
   parent?: Element;
}

export class WebComponentElementMock<
   T extends IWebComponentController = IWebComponentController,
> implements IWebComponentElement<T>
{
   public readonly resized = new ObservableMock<IResizeObserverEntry[]>();
   public readonly slotBound = new ObservableMock<ISlotBoundEventArgs>();
   public readonly slotAssigned = new ObservableMock<HTMLSlotElement>();
   public readonly bound = new ObservableMock<void>();
   public visible!: boolean;
   public customStyle!: IStyle;
   public element!: HTMLElement;
   public controller!: T;
   public parent!: Element;

   constructor(properties: IWebComponentElementMockProperties<T>) {
      Object.assign(this, properties);
   }

   public readonly buildContent = jest.fn();
   public readonly attach = jest.fn();
   public readonly detach = jest.fn();
   public readonly attributeChanged = jest.fn();
   public readonly querySelector = jest.fn();
}
