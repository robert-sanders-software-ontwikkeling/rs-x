import { IInputContext } from '../web-component/decorators/input/input-context.interface';

export class InputContextMock implements IInputContext {
   public readonly getInputInfo = jest.fn();
   public readonly getInputs = jest.fn();
   public readonly getInputForAttribute = jest.fn();
   public readonly getInputForReflectToAttributeProperty = jest.fn();
   public readonly getObservedAttributes = jest.fn();
}
