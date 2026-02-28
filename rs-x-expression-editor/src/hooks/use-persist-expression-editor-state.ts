import type { IExpressionEditorState } from '../models/expression-editor-state.interface';
import { ExpressionEdtitorStateSerializer } from '../services/expression-editor-state-serializer';

import { useDebouncedEffect } from './use-debounced-effect';

export function usePersistExpressionEditorState(
  state: IExpressionEditorState | null | undefined,
  delay = 200,
): void {
  useDebouncedEffect(
    () => {
      if (!state) {
        return;
      }

      ExpressionEdtitorStateSerializer.getInstance().serialize(state);
    },
    [state],
    delay,
  );
}
