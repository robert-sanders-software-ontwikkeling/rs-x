import { type IExpressionInfo } from './expression-info.interface';

export interface IModelWithExpressions {
  name: string;
  model: object;
  version: number;
  editorModelString: string;
  selectedExpressionIndex: number;
  expressions: IExpressionInfo[];
}
