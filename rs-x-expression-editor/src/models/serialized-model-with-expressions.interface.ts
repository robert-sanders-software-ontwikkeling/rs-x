import { ISerializedExpressionInfo } from './serialized-expression-info.interface';

export interface ISerializedModelWithExpressions {
    name: string;
    editorModelString: string;
    isDeleting: boolean;
    selectedExpressionIndex: number;
    expressions: ISerializedExpressionInfo[];
}