interface Model {
  a: number;
}

declare const model: Model;

function rsx(expression: string): (m: Model) => number {
  return () => expression.length;
}

rsx('a + 1')(model);
