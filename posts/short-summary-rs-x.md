# Make Reactivity easy

Many UI frameworks make reactivity *feel unnatural*.

React relies heavily on **immutability** so it can detect changes efficiently using reference checks.  
That works, but it also means you often end up writing lots of copying/spreading code just to update state.

Angular is moving toward a more reactive model with **Signals**.  
Signals are powerful, but they still introduce a new API and a different way of thinking:

- Wrap values
- Use `set()` / `update()`
- Add extra wiring (`effect()` / `useEffect()`) especially around async flows

But most developers don’t naturally think in “signals”.

We think in:

- **data models**
- **operations**
- **plain TypeScript / JavaScript**
- and simply assigning values when something changes

## A More Natural Approach

What if reactivity was not something you had to *learn*…

…but something that felt like a natural extension of JavaScript?

That is the goal of **RS-X**:  
Make reactivity feel like part of TypeScript itself — similar to how **LINQ** made SQL-like queries feel native in C#.

You shouldn’t need a special API for async vs sync data either.  
Just write your model, mix promises and values, and let the framework handle the rest.

## Example

```ts
const model = {
  a: Promise.resolve(10),
  b: 20
};

const expression = rsx`a + b`(model);

expression.changed.subscribe(() => {
  console.log(expression.value);
});

// Later:
model.a = Promise.resolve(40);
model.b = 40;
```

Check out the [RS-X project on github](https://github.com/robert-sanders-software-ontwikkeling/rs-x)

