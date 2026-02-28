import { type ISerializedExpressionInfo } from './serialized-expression-info.interface';

export interface ISerializedModelWithExpressions {
  name: string;
  version: number;
  editorModelString: string;
  selectedExpressionIndex: number;
  expressions: ISerializedExpressionInfo[];
}
