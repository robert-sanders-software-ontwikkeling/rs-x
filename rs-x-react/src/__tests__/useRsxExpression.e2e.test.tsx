import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { type IExpression } from '@rs-x/expression-parser';

import { getExpressionFactory } from '../expressionFactory';
import { useRsxExpression } from '../hooks/useRsxExpression';

// Component binding a real RS-X expression
const TestComponent: React.FC<{
  model: { x: number; r: number };
  expression: string | IExpression;
}> = ({ model, expression }) => {
  const result = useRsxExpression<number>(expression, model);

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

describe('useRsxExpression E2E (real RS-X)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('computes expression and updates when model changes: using expression string', async () => {
    const user = userEvent.setup();
    const model = { x: 3, r: 5 };
    const expressionString = 'r * x * (1 - x)';

    render(<TestComponent model={model} expression={expressionString} />);

    const xInput = screen.getByTestId('x-input') as HTMLInputElement;
    const rInput = screen.getByTestId('r-input') as HTMLInputElement;
    const resultDiv = screen.getByTestId('result');

    expect(resultDiv.textContent).toBe('-30'); // 5*3*(1-3)

    await user.clear(xInput);
    await user.type(xInput, '2');
    expect(resultDiv.textContent).toBe('-10'); // 5*2*(1-2)

    await user.clear(rInput);
    await user.type(rInput, '4');
    expect(resultDiv.textContent).toBe('-8'); // 4*2*(1-2)
  });

  it('computes expression and updates when model changes: using expression tree', async () => {
    const user = userEvent.setup();
    const model = { x: 3, r: 5 };
    const expressionString = 'r * x * (1 - x)';
    const factory = getExpressionFactory();
    let exprInstance = factory.create(model, expressionString);

    render(<TestComponent model={model} expression={exprInstance} />);

    const xInput = screen.getByTestId('x-input') as HTMLInputElement;
    const rInput = screen.getByTestId('r-input') as HTMLInputElement;
    const resultDiv = screen.getByTestId('result');

    expect(resultDiv.textContent).toBe('-30'); // 5*3*(1-3)

    await user.clear(xInput);
    await user.type(xInput, '2');
    expect(resultDiv.textContent).toBe('-10'); // 5*2*(1-2)

    await user.clear(rInput);
    await user.type(rInput, '4');
    expect(resultDiv.textContent).toBe('-8'); // 4*2*(1-2)
  });

  it('recreates expression tree if expression string changes', async () => {
    const user = userEvent.setup();
    const model = { x: 2, r: 3 };

    const Wrapper: React.FC = () => {
      const [expr, setExpr] = React.useState('r * x');
      return (
        <>
          <button
            data-testid="change-expression"
            onClick={() => setExpr('r + x')}
          >
            Change Expression
          </button>
          <TestComponent model={model} expression={expr} />
        </>
      );
    };

    render(<Wrapper />);

    const resultDiv = screen.getByTestId('result');
    const btn = screen.getByTestId('change-expression');

    expect(resultDiv.textContent).toBe('6'); // 2*3
    await user.click(btn);
    expect(resultDiv.textContent).toBe('5'); // 2+3
  });

  it('recreates expression tree if expression changes', async () => {
    const user = userEvent.setup();
    const model = { x: 2, r: 3 };

    const Wrapper: React.FC = () => {
      const [expr, setExpr] = React.useState<string | IExpression>('r * x');

      return (
        <>
          <button
            data-testid="change-expression"
            onClick={() =>
              setExpr(getExpressionFactory().create(model, 'r + x'))
            }
          >
            Change Expression
          </button>
          <TestComponent model={model} expression={expr} />
        </>
      );
    };

    render(<Wrapper />);

    const resultDiv = screen.getByTestId('result');
    const btn = screen.getByTestId('change-expression');

    // Initial computation
    expect(resultDiv.textContent).toBe('6'); // 2*3

    // Click to switch to a new expression tree
    await user.click(btn);
    expect(resultDiv.textContent).toBe('5'); // 2+3
  });
  it('recomputes when model reference changes', async () => {
    const user = userEvent.setup();

    const Wrapper: React.FC = () => {
      const [model, setModel] = React.useState({ x: 1, r: 2 });
      return (
        <>
          <button
            data-testid="change-model"
            onClick={() => setModel({ x: 4, r: 5 })}
          >
            Change Model
          </button>
          <TestComponent model={model} expression="r * x" />
        </>
      );
    };

    render(<Wrapper />);
    const resultDiv = screen.getByTestId('result');
    const btn = screen.getByTestId('change-model');

    expect(resultDiv.textContent).toBe('2'); // 2*1
    await user.click(btn);
    expect(resultDiv.textContent).toBe('20'); // 5*4
  });

  it('disposes expression tree on unmount if created by hook', async () => {
    const model = { x: 1, r: 1 };
    const expressionString = 'r * x';

    // Capture the expression instance
    const factory = getExpressionFactory();
    let exprInstance = factory.create(model, expressionString);
    const disposeSpy = vi.spyOn(exprInstance, 'dispose');

    // Mock create to return our spied instance
    vi.spyOn(factory, 'create').mockReturnValue(exprInstance);

    const { unmount } = render(
      <TestComponent model={model} expression={expressionString} />,
    );

    expect(disposeSpy).not.toHaveBeenCalled();
    unmount();
    expect(disposeSpy).toHaveBeenCalled(); // ✅ now we actually test dispose
  });

  it('does NOT dispose external expression tree on unmount', async () => {
    const model = { x: 1, r: 1 };
    const expr = getExpressionFactory().create(model, 'r * x'); // external expression
    const disposeSpy = vi.spyOn(expr, 'dispose');

    const Wrapper: React.FC = () => (
      <TestComponent model={model} expression={expr} />
    );

    const { unmount } = render(<Wrapper />);
    unmount();
    expect(disposeSpy).not.toHaveBeenCalled(); // ✅ ensures hook does not dispose external
  });
});
