### RS-X now works with React 🎉

I’m happy to share that **RS-X can now be used with React**.

With RS-X, you don’t need to wire everything through `useState`, `useEffect`, or derived state.  
Your **data model itself becomes reactive**, and React simply renders the result.

## What changes with RS-X in React

Instead of thinking in terms of:
- syncing state
- effects
- memoized selectors

You work directly with your **data model**.

When the model changes:
- dependent expressions update automatically
- React re-renders only where needed

No extra glue code.

## Why this is different

- No need to mirror your data into React state
- No `useEffect` chains to keep things in sync
- No derived state bugs
- You update the model → the UI follows

RS-X tracks dependencies at the **expression level**, not the component level.

## Async is first-class

RS-X also handles asynchronous data naturally:
- Promises in your model are resolved reactively
- Expressions update when async values arrive
- No loading-state orchestration required

## How it fits into React

RS-X doesn’t replace React — it **simplifies what React has to manage**.

React stays focused on rendering.  
RS-X handles:
- reactivity
- dependency tracking
- expression evaluation

## Why I built this

I wanted:
- reactive data without a global store
- fewer hooks and less boilerplate
- a model-driven way of thinking
- predictable updates without over-rendering

React support makes that approach practical in real applications.  
You can see it **in action on StackBlitz**: [React demo](https://stackblitz.com/~/github.com/robert-sanders-software-ontwikkeling/rs-x-react-demo)

Feedback is very welcome.

— Robert

### References
- [Showing the Power of RS-X with a “Scary” Credit-Risk Formula](https://dev.to/robert_sanders_04918a4344/showing-the-power-of-rs-x-with-a-scary-credit-risk-formula-nlp)
- [RS-X: Reactive State and Expressions for JavaScript and TypeScript](https://dev.to/robert_sanders_04918a4344/rs-x-reactive-state-and-expressions-for-javascript-and-typescript-3a76)
- [Using RS-X with React](https://dev.to/robert_sanders_04918a4344/rs-x-now-works-with-react-4a56)
- [Angular demo](https://stackblitz.com/~/github.com/robert-sanders-software-ontwikkeling/rs-x-angular-demo)
- [RS-X GitHub](https://github.com/robert-sanders-software-ontwikkeling/rs-x)
- NPM packages:
  - [@rs-x/core](https://www.npmjs.com/package/@rs-x/core)
  - [@rs-x/state-manager](https://www.npmjs.com/package/@rs-x/state-manager)
  - [@rs-x/expression-parser](https://www.npmjs.com/package/@rs-x/expression-parser)
  - [@rs-x/angular](https://www.npmjs.com/package/@rs-x/angular)