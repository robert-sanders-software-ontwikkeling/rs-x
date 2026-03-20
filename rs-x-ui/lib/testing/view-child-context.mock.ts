import { IViewChildContext } from '../web-component/decorators/view-child/view-child-context.interface';

export class ViewChildContextMock implements IViewChildContext {
   public readonly getViewChildren = jest.fn();
   public readonly getViewChild = jest.fn();
   public readonly clearViewChildren = jest.fn();
}
