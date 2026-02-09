# RS-X React Hooks

This document covers two primary hooks for reactive data handling in React: `useRsxExpression` and `useRsxModel`.

The **RS-X React hooks** provides seamless integration of RS-X expressions within React. It allows you to bind expressions to your data models, making your templates fully reactive without extra boilerplate.

## Installation

Update the `dependencies` section in your `package.json` to include the required RS-X packages. You can ignore the version numbers and use the latest versions compatible with your React version. The latest RS-X packages are currently built with React 19. After updating, run `npm install` to install the dependencies.

```json
"dependencies": {
    "@rs-x/core": "0.4.21",
    "@rs-x/state-manager": "0.4.21",
    "@rs-x/expression-parser": "0.4.21",
    "@rs-x/react":"^0.4.21"
  },
```

---

## `useRsxExpression`

`useRsxExpression` is a React hook that evaluates a JavaScript expression, makes the associated model reactive and subscribes to its changes.

### Overview

- Evaluates an expression in the context of a given model.
- Automatically updates when the expression value changes.
- Returns the current value of the expression, initially `null`.
- Requires a model if the expression is a string.
- Supports both string expressions and pre-constructed expression objects.
- Properly disposes of the expression if it was created internally.
- Recreates the expression if the expression string, model, or watch rules change.

### Options

- `model`: The object context for evaluating the expression (required for string expressions).
- `leafWatchRule`: Optional rule for watching leaf nodes in the expression recursivly

---

## `useRsxModel`

`useRsxModel` recursively walks through a model object and makes each field reactive using `useRsxExpression`.

### Overview

- Walks the model object top-to-bottom (non-recursively).
- Skips methods and arrow functions.
- Can optionally filter which fields should be made reactive using a field filter function.
- Throws `UnsupportedException` for collection types (Array, Map, Set, etc.) to avoid breaking React Hooks order.
- Replaces each field value with the reactive value returned by `useRsxExpression`.
- Recursively processes nested plain objects, keeping the original structure intact.
- Returns a new object with the same structure as the original model but with reactive values.

### Field Filter

A field filter is a function `(model: object, field: string) => boolean` used to selectively make fields reactive.

---

## References

- [RS-X]('../../../readme.md')
- [RS-X core]('../../../rs-x-core/readme.md')
- [RS-X state manager]('../../../rs-x-state-manager/readme.md')
- [RS-X expression parser]('../../../rs-x-expression-parser/readme.md')
- [RS=X React demo](https://stackblitz.com/~/github.com/robert-sanders-software-ontwikkeling/rs-x-react-demo)
