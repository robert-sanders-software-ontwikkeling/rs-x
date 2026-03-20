import { IBindingQueue } from '../../web-component/binding/binding-queue.interface';

export class BindingQueueMock implements IBindingQueue {
   public isBinding!: boolean;
   public readonly push = jest.fn();
   public readonly bind = jest.fn();
}
