import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { InjectionContainer } from '@rs-x/core';
import {
  type IExpression,
  rsx,
  RsXExpressionParserModule,
} from '@rs-x/expression-parser';

import { useRsxExpression } from '../hooks/use-rsx-expression';
import { useRsxModel } from '../hooks/use-rsx-model';

function ModuleScopedExample({
  model,
  expression,
}: {
  model: {
    price: number;
    quantity: number;
  };
  expression: IExpression<number>;
}) {
  const total = useRsxExpression(expression);

  return (
    <div>
      <div data-testid="total">{total}</div>
      <button
        onClick={() => {
          model.price = 120;
        }}
      >
        Update Price
      </button>
    </div>
  );
}

function MemoOwnedExample() {
  const model = React.useMemo(
    () => ({
      price: 100,
      quantity: 3,
    }),
    [],
  );
  const totalExpression = React.useMemo(
    () => rsx<number>('price * quantity')(model),
    [model],
  );
  const total = useRsxExpression(totalExpression);

  return (
    <div>
      <div data-testid="total">{total}</div>
      <button
        onClick={() => {
          model.quantity = 4;
        }}
      >
        Update Quantity
      </button>
    </div>
  );
}

function RsxModelExample() {
  const model = React.useMemo(
    () => ({
      user: {
        name: 'Alice',
      },
      score: 42,
    }),
    [],
  );
  const values = useRsxModel<
    typeof model,
    {
      user: {
        name: string;
      };
      score: number;
    }
  >(model);

  return (
    <div>
      <div data-testid="name">{values.user.name}</div>
      <div data-testid="score">{values.score}</div>
      <button
        onClick={() => {
          model.user.name = 'Bob';
          model.score = 100;
        }}
      >
        Update Model
      </button>
    </div>
  );
}

describe('docs examples runtime', () => {
  beforeEach(() => {
    InjectionContainer.load(RsXExpressionParserModule);
  });

  afterEach(() => {
    InjectionContainer.unload(RsXExpressionParserModule);
  });

  it('supports a module-scoped expression instance', async () => {
    const user = userEvent.setup();
    const moduleScopedModel = {
      price: 100,
      quantity: 3,
    };
    const moduleScopedTotalExpression = rsx<number>('price * quantity')(
      moduleScopedModel,
    );

    render(
      <ModuleScopedExample
        model={moduleScopedModel}
        expression={moduleScopedTotalExpression}
      />,
    );

    expect(screen.getByTestId('total').textContent).toBe('300');

    await user.click(screen.getByRole('button', { name: 'Update Price' }));

    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('360');
    });
  });

  it('supports a component-owned expression created with useMemo', async () => {
    const user = userEvent.setup();

    render(<MemoOwnedExample />);

    expect(screen.getByTestId('total').textContent).toBe('300');

    await user.click(screen.getByRole('button', { name: 'Update Quantity' }));

    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('400');
    });
  });

  it('updates the UI when the original model fields change through useRsxModel', async () => {
    const user = userEvent.setup();

    render(<RsxModelExample />);

    expect(screen.getByTestId('name').textContent).toBe('Alice');
    expect(screen.getByTestId('score').textContent).toBe('42');

    await user.click(screen.getByRole('button', { name: 'Update Model' }));

    await waitFor(() => {
      expect(screen.getByTestId('name').textContent).toBe('Bob');
      expect(screen.getByTestId('score').textContent).toBe('100');
    });
  });
});
