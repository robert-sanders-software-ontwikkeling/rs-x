# Managing the React useState hell

React depends heavily on immutable data to detect changes.
You define state explicitly, and React re-renders when references change.

```tsx
import React { useState } from 'react';

type ChangEvent = React.ChangeEvent<HTMLInputElement>;

const  Sum: React.FC = () => {
	const [a, setA] = useState(20);
	const [b, setB] = useState(20);

	const onAChange = (e: ChangEvent) => {
		const  value = Number(e.target.value);
		setA(value);
	};

	const onBChange = (e: ChangEvent) => {
		const  value = Number(e.target.value);
		setB(value);
	};

    const sum = state.a + state.b;

	return (
		<>
            <div>
                <input  onChange={onAChange}  />
                <input  onChange={onBChange}  />
            </div>
            <div>
                {a} + {b} = {sum}
            </div>
		</>
	);
};
```

In this example, we only have two pieces of state, and it is still manageable.

But when the state in your component starts to grow, it becomes difficult to manage. You begin losing track of which parts of state exist and how they interact.

  
## A Structured Approach

To improve this, you can reorganize your code:
- Define an interface for your state
- Define a class that builds a new state based on changes
- Use a single useState call
- Use a state builder to construct new state instances

This separates state-building logic from the component and gives you a clear overview of your state structure.

```tsx
import React { useState } from 'react';

interface  IAppSTate {
	a: number;
	b: number;
}

export  class  AppStateBuilder {
	constructor(private  _state: IAppSTate) { }

	public  get  state(): IAppSTate {
		return  this._state;
	}

	public  setA(a: number): this {
		this._state = {
			...this._state,
			a
		};
		return  this;
	}

	public  setB(b: number): this {
		this._state = {
			...this._state,
			b
		};
		return  this;
	}
}

type ChangEvent = React.ChangeEvent<HTMLInputElement>;

const  Sum: React.FC = () => {
	const [state, setState] = useState<IAppSTate>(
        { a:  10, b:  20 }
    );

	const onAChange = (e: ChangEvent) => {
		const  value = Number(e.target.value);
		setState((prevState) =>  
			new AppStateBuilder(prevState).setA(value).state
		);
	};

	const onBChange = (e: ChangEvent) => {
		const  value = Number(e.target.value);
		setState((prevState) => 
			new  AppStateBuilder(prevState).setB(value).state
		);
	};

    const sum = state.a + state.b;

	return (
		<>
            <div>
                <input  onChange={onAChange} />
                <input  onChange={onBChange} />
            </div>
            <div>
                {state.a} + {state.b} = {sum}
            </div>
		</>
	);
};
```

  

This reduces complexity by separating state construction logic from UI logic.
However, this approach still has a major drawback.

If your state contains nested objects, arrays, or maps, updating state becomes increasingly complex. You must constantly ensure that you create new references for every modified branch of the object tree.

This leads to more spreading, more copying, and more room for mistakes.

## A Third Approach: Reactive Models using (RS-X)

Instead of manually rebuilding immutable state trees, you can use a reactive model approach.

With RS-X:

- You create a stable reference to your model (using React.useRef)

- You make the model reactive

- You update fields directly

- The UI updates automatically

Example:
```tsx
import React { useRef, useState } from 'react';
import { useRsxModel } from  '@rs-x/react'

interface  IAppSTate {
	a: number;
	b: number;
}

type ChangEvent = React.ChangeEvent<HTMLInputElement>;

const  Sum: React.FC = () => {
	const  modelRef = useRef<IAppSTate>({ a:  10, b:  20 });
	const  state = modelRef.current;
	useRsxModel<IAppSTate, IAppSTate>(state);

	const onAChange = (e: ChangEvent) => {
		state.a = Number(e.target.value);
	};

	const onBChange = (e: ChangEvent) => {
		state.b = Number(e.target.value);
	};

    const sum = state.a + state.b;

	return (
        <>
            <div>
                <input  onChange={onAChange} />
                <input  onChange={onBChange} />
            </div>
            <div>
                {state.a} + {state.b} = {sum}
            </div>
		</>
	);
};
```

References:
- [RS-X github](https://github.com/robert-sanders-software-ontwikkeling/rs-x)
- [RS-X with React](https://dev.to/robert_sanders_04918a4344/rs-x-now-works-with-react-4a56)
- [RS-X React demo](https://stackblitz.com/~/github.com/robert-sanders-software-ontwikkeling/rs-x-react-demo)