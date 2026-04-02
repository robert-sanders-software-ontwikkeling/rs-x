import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InjectionContainer } from '@rs-x/core';
import {
  type IExpression,
  rsx,
  RsXExpressionParserModule,
} from '@rs-x/expression-parser';

import { useRsxExpression } from '../hooks/use-rsx-expression';

// Component binding a real RS-X expression
const TestComponent: React.FC<{
  expression: IExpression;
}> = ({ expression }) => {
  const result = useRsxExpression<number>(expression);

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
  const expr = React.useMemo(() => rsx<number[]>('numbers')(model), [model]);
  const items = useRsxExpression<number[]>(expr);

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
  beforeEach(() => {
    InjectionContainer.load(RsXExpressionParserModule);
  });

  afterEach(() => {
    InjectionContainer.unload(RsXExpressionParserModule);
  });
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

  it('computes expression and updates when model changes: using rsx', async () => {
    const model = { x: 3, r: 5 };
    const expr = rsx('r * x * (1 - x)')(model);

    render(<TestComponent expression={expr} />);

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
    const exprInstance = rsx('r * x * (1 - x)')(model);

    render(<TestComponent expression={exprInstance} />);

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

  it('recreates expression tree if expression changes', async () => {
    const user = userEvent.setup();
    const model = { x: 2, r: 3 };

    const Wrapper: React.FC = () => {
      const [expr, setExpr] = React.useState<IExpression>(rsx('r * x')(model));
      return (
        <>
          <button
            data-testid="change-expression"
            onClick={() => setExpr(rsx('r + x')(model))}
          >
            Change Expression
          </button>
          <TestComponent expression={expr} />
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
      const expr = React.useMemo(() => rsx('r * x')(model), [model]);
      return (
        <>
          <button
            data-testid="change-model"
            onClick={() => setModel({ x: 4, r: 5 })}
          >
            Change Model
          </button>
          <TestComponent expression={expr} />
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

  it('does not dispose expressions automatically', async () => {
    const model = { x: 1, r: 1 };
    const expr = rsx('r * x')(model);
    const disposeSpy = vi.spyOn(expr, 'dispose');

    const Wrapper: React.FC = () => <TestComponent expression={expr} />;

    const { unmount } = render(<Wrapper />);
    unmount();
    expect(disposeSpy).not.toHaveBeenCalled();
  });
});
