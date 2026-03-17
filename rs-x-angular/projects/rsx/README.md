# @rs-x/angular

Angular pipe integration for rs-x — bind RS-X expressions to Angular templates with automatic reactive updates.

**Docs:** [rsxjs.com](https://rsxjs.com)

---

## Installation

```bash
npm install @rs-x/core @rs-x/state-manager @rs-x/expression-parser @rs-x/angular
```

## Setup

```ts
import { providexRsx } from '@rs-x/angular';

bootstrapApplication(App, {
  providers: [...providexRsx()],
});
```

## Usage

```ts
import { RsxPipe } from '@rs-x/angular';

@Component({
  imports: [RsxPipe],
  template: `{{ expression | rsx: model }}`,
})
export class MyComponent {
  expression = 'a + b';
  model = { a: 1, b: 2 };
}
```

See [rsxjs.com](https://rsxjs.com) for full documentation and examples.
