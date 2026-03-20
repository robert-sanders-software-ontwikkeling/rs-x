import { IDomQuery } from '../dom-query/dom-query.interface';

export class DomQueryMock implements IDomQuery {
   getElements = jest.fn();
   getTextNodes = jest.fn();
   getDescendantsExceptTemplateContent = jest.fn().mockReturnValue([]);
   getParent = jest.fn();
   findParent = jest.fn();
   findElement = jest.fn();
   getChildNodesWithContent = jest.fn();
   isDescendant = jest.fn();
   isAncestor = jest.fn();
   hasCustomElementAsAncestor = jest.fn();
   isInsideTemplate = jest.fn();
}
