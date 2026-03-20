export class HTMLCollectionOfMock<T extends Element>
   extends Array<T>
   implements HTMLCollectionOf<T>
{
   public readonly item = jest.fn();
   public readonly namedItem = jest.fn();
}
