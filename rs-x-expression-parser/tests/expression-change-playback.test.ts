import { emptyFunction, InjectionContainer, WaitForEvent } from '../../rs-x-core/lib';
import { IExpression, IExpressionFactory, RsXExpressionParserInjectionTokens, RsXExpressionParserModule, unloadRsXExpressionParserModule } from '../lib';
import { IExpressionChangePlayback } from '../lib/expression-change-playback';
import { IExpressionChangeHistory } from '../lib/expression-change-tracker/expression-change-history.interface';
import { IExpressionChangeTracker, IExpressionChangeTrackerManager } from '../lib/expression-change-tracker/expression-change-tracker-manager.interface';

interface IModel {
    a: number,
    b: { c: number }
}

describe('ExpressionChangePlayback tests', () => {
    let expressionChangePlayback: IExpressionChangePlayback;
    let expressionChangeTracker: IExpressionChangeTracker;
    let expressionChangeTrackerManager: IExpressionChangeTrackerManager;
    let expression: IExpression;
    let model: IModel;
    let expressionFactory: IExpressionFactory;

    const setA = (value: number) => {
        return new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { model.a = value });
    };

    const setC = (value: number) => {
        return new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => { model.b.c = value });
    };

    beforeAll(async () => {
        await InjectionContainer.load(RsXExpressionParserModule);
        expressionFactory = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionFactory);
        expressionChangePlayback = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionChangePlayback);
        expressionChangeTrackerManager = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionChangeTrackerManager);
    });

    afterAll(async () => {
        await unloadRsXExpressionParserModule();
    });


    beforeEach(async () => {
        model = {
            a: 20,
            b: {
                c: 30
            }
        };

        expression = expressionFactory.create(model, 'a + b.c');


        await new WaitForEvent(expression, 'changed').wait(emptyFunction);

        expressionChangeTracker = expressionChangeTrackerManager.create(expression).instance;
    });

    afterEach(() => {
       
        expression.dispose();
        expressionChangeTracker.dispose();
        
    });


    it('play forward: will use the newest change for identifier up to t', async () => {
        /*
            Initial: a=20, c=30  => expression = a + c = 50
    
            t1: a:  20 => 21   => 51
            t2: a:  21 => 30   => 60
            t3: a:  30 => 35   => 65
            t4: c:  30 => 100  => 135
            t5: c: 100 => 99   => 134
        */

        const history = await new WaitForEvent(expressionChangeTracker, 'changed', { count: 5 }).wait(async () => {
            await setA(21);
            await setA(30);
            await setA(35);
            await setC(100);
            await setC(99);
        }) as IExpressionChangeHistory[][];

        expect(history.length).toEqual(5);
        expect(expression.value).toEqual(134);

        // Go back to base (t0)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionChangePlayback.playBackward(0, history);
        });
        expect(expression.value).toEqual(50);

        // Now play forward to t=2 (t3 applied as the newest "a" change)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionChangePlayback.playForward(2, history);
        });

        // at t=2 => a=35, c=30 => 65
        expect(expression.value).toEqual(65);
    });

    it('play forward: can playback every change', async () => {
        /*
            Initial: a=20, c=30 => 50
    
            t1: a:  20 => 21   => 51
            t2: a:  21 => 30   => 60
            t3: a:  30 => 35   => 65
            t4: c:  30 => 100  => 135
            t5: c: 100 => 99   => 134
        */

        const history = await new WaitForEvent(expressionChangeTracker, 'changed', { count: 5 }).wait(async () => {
            await setA(21);
            await setA(30);
            await setA(35);
            await setC(100);
            await setC(99);
        }) as IExpressionChangeHistory[][];

        expect(history.length).toEqual(5);
        expect(expression.value).toEqual(134);

        // Ensure we start from base state (t0)
        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionChangePlayback.playBackward(0, history);
        });
        expect(expression.value).toEqual(50);

        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionChangePlayback.playForward(0, history);
        });
        expect(expression.value).toEqual(51);

        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionChangePlayback.playForward(1, history);
        });
        expect(expression.value).toEqual(60);

        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionChangePlayback.playForward(2, history);
        });
        expect(expression.value).toEqual(65);

        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionChangePlayback.playForward(3, history);
        });
        expect(expression.value).toEqual(135);

        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionChangePlayback.playForward(4, history);
        });
        expect(expression.value).toEqual(134);
    });


    it('play backward: will use the oldest change for identifier', async () => {
        /*
            t1: a:  20 => 21
            t2: a: 21 => 30
            t3: a: 30 => 35
            t4: c: 30 => 100
            t5: c: 100 => 99

        */

        const history = await new WaitForEvent(expressionChangeTracker, 'changed', { count: 5 }).wait(async () => {
            await setA(21);
            await setA(30);
            await setA(35);
            await setC(100);
            await setC(99)
        }) as IExpressionChangeHistory[][];

        expect(history.length).toEqual(5);
        expect(expression.value).toEqual(134);

        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionChangePlayback.playBackward(0, history)
        });

        expect(expression.value).toEqual(50);
    });

    it('play backward: can playback every change', async () => {
        /*
            t1: a:  20 => 21
            t2: a: 21 => 30
            t3: a: 30 => 35
            t4: c: 30 => 100
            t5: c: 100 => 99

        */

        const history = await new WaitForEvent(expressionChangeTracker, 'changed', { count: 5 }).wait(async () => {
            await setA(21);
            await setA(30);
            await setA(35);
            await setC(100);
            await setC(99)
        }) as IExpressionChangeHistory[][];

        expect(history.length).toEqual(5);
        expect(expression.value).toEqual(134);

        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionChangePlayback.playBackward(4, history)
        });
        expect(expression.value).toEqual(135);

        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionChangePlayback.playBackward(3, history)
        });
        expect(expression.value).toEqual(65);

        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionChangePlayback.playBackward(2, history)
        });
        expect(expression.value).toEqual(60);

        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionChangePlayback.playBackward(1, history)
        });
        expect(expression.value).toEqual(51);

        await new WaitForEvent(expression, 'changed', { ignoreInitialValue: true }).wait(() => {
            expressionChangePlayback.playBackward(0, history)
        });
        expect(expression.value).toEqual(50);
    });

});