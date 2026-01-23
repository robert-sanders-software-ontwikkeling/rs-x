
import { FunctionCallResultCacheFactory } from '../../lib/function-call-result-cache/function-call-result-cache.factory';
import { type IFunctionCallResult } from '../../lib/function-call-result-cache/function-call-result-cache.factory.interface';
import { DisposableFunctionCallIndexMock } from '../../lib/testing/disposable-function-call-index.mock';
import { FunctionCallIndexFactoryMock } from '../../lib/testing/function-call-index.factory.mock';

describe('FunctionCallIndexFactory tests', () => {
    let functionCallIndexFactory: FunctionCallIndexFactoryMock;
    let functionCallResultCacheFactory: FunctionCallResultCacheFactory;

    beforeEach(() => {
        functionCallIndexFactory = new FunctionCallIndexFactoryMock();
        functionCallResultCacheFactory = new FunctionCallResultCacheFactory(functionCallIndexFactory);
    });

    it('create will return function cache result', () => {
        const context = {};
        functionCallIndexFactory.create.mockReturnValue({
            instance: {
                context,
                functionName: 'test',
                argumentsId: {
                    sequence: [1, 2],
                    id: '123'
                }
            }
        });

        const actual = functionCallResultCacheFactory.create(context, {
            functionName: 'test',
            arguments: [1, 2],
            result: 10,
        });

        expect(actual).toEqual(
            expect.objectContaining({
                index: {
                    context,
                    functionName: 'test',
                    argumentsId: {
                        sequence: [1, 2],
                        id: '123'
                    }
                },
                result: 10
            })
        );
    });

    it('create will call FunctionCallIndexFactor.create with the correct parameters', () => {
        const context = {};
        functionCallIndexFactory.create.mockReturnValue({
            instance: {
                context,
                functionName: 'test',
                argumentsId: {
                    sequence: [1, 2],
                    id: '123'
                }
            }
        });

        functionCallResultCacheFactory.create(context, {
            functionName: 'test',
            arguments: [1, 2],
            result: 10,
        });

        expect(functionCallIndexFactory.create).toHaveBeenCalledTimes(1);
        expect(functionCallIndexFactory.create).toHaveBeenCalledWith({
            functionName: 'test',
            context,
            arguments: [1, 2]
        });
    });

    it('will release function cache result when all references have been released', () => {
        const context = {};
        const functionCallIndex = new DisposableFunctionCallIndexMock(
            context,
            'test',
            {
                sequence: [1, 2],
                id: '123'
            },
            'test123'
        );
        functionCallIndexFactory.create.mockReturnValue({ instance: functionCallIndex });
        const result: IFunctionCallResult = {
            functionName: 'test',
            arguments: [1, 2],
            result: 10,
        };

        const functionCallResultCache1 = functionCallResultCacheFactory.create(context, result);
        const functionCallResultCache2 = functionCallResultCacheFactory.create(context, result);

        expect(functionCallResultCache1).toBe(functionCallResultCache2);
        expect(functionCallResultCacheFactory.get(context, functionCallIndex)).toBeDefined();


        functionCallResultCache1.dispose();

        expect(functionCallResultCacheFactory.get(context, functionCallIndex)).toBeDefined();
        expect(functionCallIndex.dispose).not.toHaveBeenCalled();

        functionCallResultCache2.dispose();

        expect(functionCallResultCacheFactory.get(context, functionCallIndex)).toBeUndefined();
        expect(functionCallIndex.dispose).toHaveBeenCalledTimes(1);

    });

    it('will created different function cache result instances for different context but same function index', () => {
        const context1 = {};
        const context2 = {}
        const functionCallIndex = new DisposableFunctionCallIndexMock(
            {},
            'test',
            {
                sequence: [1, 2],
                id: '123'
            },
            'test123'
        );
        functionCallIndexFactory.create.mockReturnValue({ instance: functionCallIndex });
        const result: IFunctionCallResult = {
            functionName: 'test',
            arguments: [1, 2],
            result: 10,
        };

        const functionCallResultCache1 = functionCallResultCacheFactory.create(context1, result);
        const functionCallResultCache2 = functionCallResultCacheFactory.create(context2, result);

        expect(functionCallResultCache1).not.toBe(functionCallResultCache2);
    });
});