import { ISerializedExpressionInfo } from './serialized-expression-info.interface';

export interface ISerializedModelWithExpressions {
    name: string;
    editorModelString: string;
    isDeleting: boolean;
    selectedExpressionIndex: number | null;
    editingExpressionIndex: number | null;
    expressions: ISerializedExpressionInfo[];
}