import { emptyFunction, InjectionContainer, WaitForEvent } from '@rs-x/core';
import { IExpression, IExpressionChangeHistory, IExpressionChangeTracker, IExpressionChangeTrackerManager, IExpressionFactory, RsXExpressionParserInjectionTokens, RsXExpressionParserModule, unloadRsXExpressionParserModule } from '@rs-x/expression-parser';


interface IModel {
    a: number,
    b: { c: number }
}


describe('ExpressionChangeTracker tests', () => {

    let expressionChangeTracker: IExpressionChangeTracker;
    let expressionChangeTrackerManager: IExpressionChangeTrackerManager;
    let expression: IExpression;
    let model: IModel;
    let expressionFactory: IExpressionFactory;

     beforeAll(async () => {
            await InjectionContainer.load(RsXExpressionParserModule);
            expressionFactory = InjectionContainer.get(RsXExpressionParserInjectionTokens.IExpressionFactory);
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
    
    
            // expressionChangeTracker = expressionChangeTrackerManager.create(expression).instance;
        });
    
        afterEach(() => {
        
            expression.dispose();
            expressionChangeTracker.dispose();
            
        });


        it('emit initial values', async () => {

            expressionChangeTracker = expressionChangeTrackerManager.create(expression).instance;

            const actual = new WaitForEvent(expressionChangeTracker, 'changed').wait(emptyFunction)

            const expected: IExpressionChangeHistory[] = [
                
            ]

            expect(actual).toEqual(expected);


        })
    
    });