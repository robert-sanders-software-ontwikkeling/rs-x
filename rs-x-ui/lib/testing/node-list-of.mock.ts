export class NodeListOfMock<T extends Node>
   extends Array<T>
   implements NodeListOf<T>
{
   public readonly item = jest.fn();
   public override forEach = jest.fn();
}
