import { IDisposableOwner } from '../disposable-owner.interface';

export class DisposableOwnerMock implements IDisposableOwner {
   public readonly release = jest.fn();
   public readonly canDispose = jest.fn();
}
