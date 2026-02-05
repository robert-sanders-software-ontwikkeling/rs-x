import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { useRsxExpression } from '../hooks/useRsxExpression';

// Simple test component to bind an expression to a model
const TestComponent: React.FC<{ model: { x: number; r: number } }> = ({
  model,
}) => {
  const result = useRsxExpression<number>('r * x * (1 - x)', model);

  return (
    <div>
      <input
        data-testid="x-input"
        type="number"
        value={model.x}
        onChange={(e) => (model.x = Number(e.target.value))}
      />
      <input
        data-testid="r-input"
        type="number"
        value={model.r}
        onChange={(e) => (model.r = Number(e.target.value))}
      />
      <div data-testid="result">{result}</div>
    </div>
  );
};

describe('RS-X React E2E', () => {
  it('updates expression result when model changes', async () => {
    const model = { x: 3, r: 5 };
    const user = userEvent.setup();

    render(<TestComponent model={model} />);

    const xInput = screen.getByTestId('x-input') as HTMLInputElement;
    const rInput = screen.getByTestId('r-input') as HTMLInputElement;
    const resultDiv = screen.getByTestId('result');

    // Initial computation
    expect(resultDiv.textContent).toBe(
      String(model.r * model.x * (1 - model.x)),
    ); // 5 * 3 * (1-3) = -30

    // Update x
    await user.clear(xInput);
    await user.type(xInput, '2');
    expect(resultDiv.textContent).toBe(
      String(model.r * model.x * (1 - model.x)),
    ); // 5 * 2 * -1 = -10

    // Update r
    await user.clear(rInput);
    await user.type(rInput, '4');
    expect(resultDiv.textContent).toBe(
      String(model.r * model.x * (1 - model.x)),
    ); // 4 * 2 * -1 = -8
  });
});
