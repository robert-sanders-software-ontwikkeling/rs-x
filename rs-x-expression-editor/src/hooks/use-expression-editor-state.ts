import { useEffect, useState } from 'react';
import { IExpressionEditorState } from '../models/expression-editor-state.interface';
import { ExpressionEdtitorStateSerializer } from '../services/expression-editor-state-serializer';

export function useExpressionEditorState() {
    const [state, setState] = useState<IExpressionEditorState | null>(null);

    useEffect(() => {
        ExpressionEdtitorStateSerializer
            .getInstance()
            .deserialize()
            .then(setState);
    }, []);

    return state;
}