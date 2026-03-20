export class HTMLCollectionMock
   extends Array<Element>
   implements HTMLCollection
{
   public readonly namedItem = jest.fn();
   public readonly item = jest.fn();
}
