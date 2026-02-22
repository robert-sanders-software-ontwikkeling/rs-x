import { ISerializedExpressionInfo } from './serialized-expression-info.interface';

export interface ISerializedModelWithExpressions {
    name: string;
    version: number;
    editorModelString: string;
    isDeleting: boolean;
    selectedExpressionIndex: number;
    expressions: ISerializedExpressionInfo[];
}