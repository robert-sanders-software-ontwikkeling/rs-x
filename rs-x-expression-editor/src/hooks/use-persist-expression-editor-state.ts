import { useDebouncedEffect } from './use-debounced-effect';
import { ExpressionEdtitorStateSerializer } from '../services/expression-editor-state-serializer';
import type { IExpressionEditorState } from '../models/expression-editor-state.interface';

export function usePersistExpressionEditorState(
  state: IExpressionEditorState,
  delay = 200
): void {
  useDebouncedEffect(
    () => {
      return ExpressionEdtitorStateSerializer
        .getInstance()
        .serialize(state);
    },
    [state],
    delay
  );
}