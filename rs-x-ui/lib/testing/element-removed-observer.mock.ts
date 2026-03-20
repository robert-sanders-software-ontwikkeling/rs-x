import { ObservableMock } from '../../../rs-x-core/lib/testing/observable.mock';
import { IElementRemovedObserver } from '../element-removed-observer/element-removed-observer.interface';

export class ElementRemovedObserverMock implements IElementRemovedObserver {
   public readonly removed = new ObservableMock<NodeList>();
   public readonly observer = jest.fn();
   public readonly dispose = jest.fn();
}
