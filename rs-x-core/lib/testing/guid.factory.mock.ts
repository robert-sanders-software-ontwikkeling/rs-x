import { type IGuidFactory } from '../guid';

export class GuidFactoryMock implements IGuidFactory {
  public readonly create = jest.fn();
}
