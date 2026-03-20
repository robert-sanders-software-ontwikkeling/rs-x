import { ObservableMock } from '@rs-x/core/testing';
import { IResizeObserverEntry } from '../resize/resize-observer-entry.interface';
import { IResizeObserverService } from '../resize/resize-observer-service.interface';

export class ResizeObserverServiceMock implements IResizeObserverService {
   private readonly _resized = new ObservableMock<IResizeObserverEntry[]>();

   public get resized(): ObservableMock<IResizeObserverEntry[]> {
      return this._resized;
   }

   public readonly observe = jest.fn();
   public readonly unobserve = jest.fn();
}
