import { IOutputContext } from '../web-component/decorators/output/output-context.interface';
export class OutputContextMock implements IOutputContext {
   public readonly getOutputs = jest.fn();
   public readonly getOutputInfo = jest.fn();
   public readonly isOutput = jest.fn();
   public readonly emitEvent = jest.fn();
   public readonly subscribeToEvent = jest.fn();
}
