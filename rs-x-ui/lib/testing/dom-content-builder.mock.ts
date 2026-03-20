import { IDomContentBuilder } from '../web-component/interfaces';

export class DomContentBuilderMock implements IDomContentBuilder {
   public readonly buildContent = jest.fn();
}
