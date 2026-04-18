// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  CompiledFrameworkExamplePreview,
  EditableCompiledFrameworkExample,
} from './framework-runtime-lab.component';

const loadAngularCoreModule = () => import('@angular/core');
const loadAngularCommonModule = () => import('@angular/common');
const loadAngularFormsModule = () => import('@angular/forms');
const loadAngularPlatformBrowserModule = () =>
  import('@angular/platform-browser');
const loadAngularCompilerModule = () => import('@angular/compiler');
const loadAngularRsxModule = () =>
  import('../../../../rs-x-angular/dist/rsx/fesm2022/rs-x-angular.mjs');
const loadVueModule = () => import('vue/dist/vue.esm-bundler.js');
const loadRsxVueModule = () => import('@rs-x/vue');

const angularStringExample = `
  import { Component } from '@angular/core';
  import { RsxPipe } from '@rs-x/angular';

  @Component({
    selector: 'app-greeting',
    standalone: true,
    imports: [RsxPipe],
    template: '<p data-testid="greeting">{{ "firstName + \\' \\' + lastName" | rsx: model }}</p>',
  })
  export default class GreetingComponent {
    model = {
      firstName: 'Jane',
      lastName: 'Doe',
    };
  }
`;

describe('CompiledFrameworkExamplePreview', () => {
  it('keeps the Angular string-expression preview rendered after code edits', async () => {
    const { container, rerender } = render(
      <CompiledFrameworkExamplePreview
        framework="angular"
        code={angularStringExample}
        moduleLoaders={{
          loadAngularCoreModule,
          loadAngularCommonModule,
          loadAngularFormsModule,
          loadAngularPlatformBrowserModule,
          loadAngularCompilerModule,
          loadAngularRsxModule,
        }}
      />,
    );

    await waitFor(() => {
      expect(container.textContent).toContain('Jane Doe');
    });

    rerender(
      <CompiledFrameworkExamplePreview
        framework="angular"
        code={angularStringExample.replace("'Jane'", "'Jan'")}
        moduleLoaders={{
          loadAngularCoreModule,
          loadAngularCommonModule,
          loadAngularFormsModule,
          loadAngularPlatformBrowserModule,
          loadAngularCompilerModule,
          loadAngularRsxModule,
        }}
      />,
    );

    await waitFor(() => {
      expect(container.textContent).toContain('Jan Doe');
    });
  });

  it('remounts the preview when reset code is clicked even if the code text is unchanged', async () => {
    const reactCounterExample = `
      import { useState } from 'react';

      export default function CounterExample() {
        const [count, setCount] = useState(0);

        return (
          <div>
            <p>Count: {count}</p>
            <button onClick={() => setCount(count + 1)}>Increase</button>
          </div>
        );
      }
    `;

    render(
      <EditableCompiledFrameworkExample
        framework="react"
        initialCode={reactCounterExample}
        editorId="reset-remount-test"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Count: 0')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Increase' }));

    await waitFor(() => {
      expect(screen.getByText('Count: 1')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reset code' }));

    await waitFor(() => {
      expect(screen.getByText('Count: 0')).toBeTruthy();
    });
  });

  it('calls a compiled module dispose hook on recompile and on unmount', async () => {
    const disposeTrackingExample = `
      const countDispose = () => {
        globalThis.__rsxDisposeCount = (globalThis.__rsxDisposeCount ?? 0) + 1;
      };

      export default function DisposeExample() {
        return <p>demo</p>;
      }

      export function dispose() {
        countDispose();
      }
    `;

    const { rerender, unmount } = render(
      <CompiledFrameworkExamplePreview
        framework="react"
        code={disposeTrackingExample}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('demo')).toBeTruthy();
    });

    expect(
      (globalThis as { __rsxDisposeCount?: number }).__rsxDisposeCount ?? 0,
    ).toBe(0);

    rerender(
      <CompiledFrameworkExamplePreview
        framework="react"
        code={disposeTrackingExample.replace('demo', 'demo updated')}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('demo updated')).toBeTruthy();
    });

    expect(
      (globalThis as { __rsxDisposeCount?: number }).__rsxDisposeCount,
    ).toBe(1);

    unmount();

    expect(
      (globalThis as { __rsxDisposeCount?: number }).__rsxDisposeCount,
    ).toBe(2);
  });

  it('replaces editor and preview state when initialCode changes', async () => {
    const { rerender } = render(
      <EditableCompiledFrameworkExample
        framework="react"
        initialCode={`
          export default function Example() {
            return <p>first example</p>;
          }
        `}
        editorId="initial-code-refresh-test"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('first example')).toBeTruthy();
    });

    rerender(
      <EditableCompiledFrameworkExample
        framework="react"
        initialCode={`
          export default function Example() {
            return <p>second example</p>;
          }
        `}
        editorId="initial-code-refresh-test"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('second example')).toBeTruthy();
    });
  });

  it('does not show RS-X diagnostics for the current Vue pre-built example', async () => {
    render(
      <EditableCompiledFrameworkExample
        framework="vue"
        editorId="vue-prebuilt-current"
        initialCode={`
          import { rsx } from '@rs-x/expression-parser';
          import { useRsxExpression, useRsxModel } from '@rs-x/vue';

          // Create a module-scoped model and expression once
          const model = {
            price: 100,
            quantity: 3,
          };
          const totalExpr = rsx<number>('price * quantity')(model);

          export default {
            name: 'OrderTotal',
            setup() {
              useRsxModel(model);
              const total = useRsxExpression(totalExpr);

              return {
                model,
                total,
              };
            },
            template: \`
              <div>
                <label>
                  Price
                  <input
                    :value="model.price"
                    type="number"
                    @input="model.price = Number($event.target.value)"
                  />
                </label>
                <label>
                  Quantity
                  <input
                    :value="model.quantity"
                    type="number"
                    @input="model.quantity = Number($event.target.value)"
                  />
                </label>
                <dl>
                  <div class="metricRow">
                    <dt>Total</dt>
                    <dd class="metricValue">{{ total }}</dd>
                  </div>
                </dl>
              </div>
            \`,
          };
        `}
        moduleLoaders={{ loadVueModule, loadRsxVueModule }}
      />,
    );

    await waitFor(() => {
      expect(
        screen.queryByText('Fix these errors to run the preview again.'),
      ).toBeNull();
    });
  });

  it('runs the current Vue pre-built example and updates total when inputs change', async () => {
    const { container } = render(
      <EditableCompiledFrameworkExample
        framework="vue"
        editorId="vue-prebuilt-runtime"
        initialCode={`
          import { rsx } from '@rs-x/expression-parser';
          import { useRsxExpression, useRsxModel } from '@rs-x/vue';

          // Create a module-scoped model and expression once
          const model = {
            price: 100,
            quantity: 3,
          };
          const totalExpr = rsx<number>('price * quantity')(model);

          export default {
            name: 'OrderTotal',
            setup() {
              useRsxModel(model);
              const total = useRsxExpression(totalExpr);

              return {
                model,
                total,
              };
            },
            template: \`
              <div>
                <label>
                  Price
                  <input
                    :value="model.price"
                    type="number"
                    @input="model.price = Number($event.target.value)"
                  />
                </label>
                <label>
                  Quantity
                  <input
                    :value="model.quantity"
                    type="number"
                    @input="model.quantity = Number($event.target.value)"
                  />
                </label>
                <dl>
                  <div class="metricRow">
                    <dt>Total</dt>
                    <dd class="metricValue">{{ total }}</dd>
                  </div>
                </dl>
              </div>
            \`,
          };

          export function dispose() {
            totalExpr.dispose();
          }
        `}
        moduleLoaders={{ loadVueModule, loadRsxVueModule }}
      />,
    );

    await waitFor(() => {
      expect(container.textContent).toContain('300');
    });

    const inputs = container.querySelectorAll('input[type="number"]');
    expect(inputs).toHaveLength(2);

    fireEvent.input(inputs[0]!, { target: { value: '150' } });
    fireEvent.input(inputs[1]!, { target: { value: '4' } });

    await waitFor(() => {
      expect(container.textContent).toContain('600');
    });
  });
});
