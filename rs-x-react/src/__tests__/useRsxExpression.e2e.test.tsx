import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type IExpression } from '@rs-x/expression-parser';
import { type IIndexWatchRule } from '@rs-x/state-manager';

import { getExpressionFactory } from '../expressionFactory';
import { useRsxExpression } from '../hooks/useRsxExpression';

// Component binding a real RS-X expression
const TestComponent: React.FC<{
  model: { x: number; r: number };
  expression: string | IExpression;
  leafWatchRule?: IIndexWatchRule;
}> = ({ model, expression, leafWatchRule }) => {
  const result = useRsxExpression<number>(expression, { model, leafWatchRule });

  return (
    <div>
      <div data-testid="result">{result}</div>
    </div>
  );
};

const TestComponentWithRepeater: React.FC<{
  model: {
    numbers: Promise<number[]>;
  };
}> = ({ model }) => {
  const items = useRsxExpression<number[]>('numbers', { model });

  return (
    <div>
      {items?.map((item, index) => (
        <div key={index} data-testid={`item-${index}`}>
          {item}
        </div>
      ))}
    </div>
  );
};

describe('useRsxExpression E2E (real RS-X)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders initial value', async () => {
    const model = { numbers: Promise.resolve([10, 20, 30]) };

    render(<TestComponentWithRepeater model={model} />);

    const items = await screen.findAllByTestId(/item-/);

    expect(items.map((el) => el.textContent)).toEqual(['10', '20', '30']);
  });

  it('reactively updates view when model numbers change asynchronously', async () => {
    const model = { numbers: Promise.resolve([10, 20, 30]) };

    const { rerender } = render(<TestComponentWithRepeater model={model} />);

    // Wait for initial render
    await waitFor(async () => {
      const items = await screen.findAllByTestId(/item-/);
      expect(items.map((el) => el.textContent)).toEqual(['10', '20', '30']);
    });

    // Step 2: update model.numbers asynchronously
    model.numbers = Promise.resolve([1, 2, 3, 4]);

    // Trigger a rerender so hook sees the updated model reference
    rerender(<TestComponentWithRepeater model={model} />);

    // Wait until DOM updates with new numbers
    await waitFor(async () => {
      const items = await screen.findAllByTestId(/item-/);
      expect(items.map((el) => el.textContent)).toEqual(['1', '2', '3', '4']);
    });
  });

  it('computes expression and updates when model changes: using expression string', async () => {
    const model = { x: 3, r: 5 };
    const expressionString = 'r * x * (1 - x)';

    render(<TestComponent model={model} expression={expressionString} />);

    const resultDiv = screen.getByTestId('result');
    expect(resultDiv.textContent).toBe('-30'); // 5*3*(1-3)

    model.x = 2;
    await waitFor(() => {
      expect(resultDiv.textContent).toBe('-10'); // 5*2*(1-2)
    });

    model.r = 4;
    await waitFor(() => {
      expect(resultDiv.textContent).toBe('-8'); // 4*2*(1-2)
    });
  });

  it('computes expression and updates when model changes: using expression tree', async () => {
    const model = { x: 3, r: 5 };
    const expressionString = 'r * x * (1 - x)';
    const factory = getExpressionFactory();
    const exprInstance = factory.create(model, expressionString);

    render(<TestComponent model={model} expression={exprInstance} />);

    const resultDiv = screen.getByTestId('result');

    expect(resultDiv.textContent).toBe('-30'); // 5*3*(1-3)

    model.x = 2;
    await waitFor(() => {
      expect(resultDiv.textContent).toBe('-10'); // 5*2*(1-2)
    });

    model.r = 4;
    await waitFor(() => {
      expect(resultDiv.textContent).toBe('-8'); // 4*2*(1-2)
    });
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

    expect(resultDiv.textContent).toBe('6'); // 2*3
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

    const factory = getExpressionFactory();
    const exprInstance = factory.create(model, expressionString);
    const disposeSpy = vi.spyOn(exprInstance, 'dispose');

    vi.spyOn(factory, 'create').mockReturnValue(exprInstance);

    const { unmount } = render(
      <TestComponent model={model} expression={expressionString} />,
    );

    expect(disposeSpy).not.toHaveBeenCalled();
    unmount();
    expect(disposeSpy).toHaveBeenCalled();
  });

  it('does NOT dispose external expression tree on unmount', async () => {
    const model = { x: 1, r: 1 };
    const expr = getExpressionFactory().create(model, 'r * x');
    const disposeSpy = vi.spyOn(expr, 'dispose');

    const Wrapper: React.FC = () => (
      <TestComponent model={model} expression={expr} />
    );

    const { unmount } = render(<Wrapper />);
    unmount();
    expect(disposeSpy).not.toHaveBeenCalled();
  });
});
