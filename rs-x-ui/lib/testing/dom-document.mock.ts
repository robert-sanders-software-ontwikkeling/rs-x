import { IDomDocument } from '../dom-window/dom-document.interface';

export class DomDocumentMock implements IDomDocument {
   public documentElement!: HTMLElement;
   public readonly body!: HTMLElement;
   public readonly createElement = jest.fn();
   public readonly createElementNS = jest.fn();
}
