import { FunctionCallIndexFactory } from '../../lib/function-call-index/function-call-index.factory';
import { SequenceIdFactoryMock } from '../../lib/testing/sequence-id.factory.mock';
import { SequenceWithIdMock } from '../../lib/testing/sequence-id.mock';

describe('FunctionCallIndexFactory tests', () => {
    let sequenceIdFactory: SequenceIdFactoryMock
    let functionCallIndexFactory: FunctionCallIndexFactory;

    beforeEach(() => {
        sequenceIdFactory = new SequenceIdFactoryMock();
        functionCallIndexFactory = new FunctionCallIndexFactory(sequenceIdFactory);
    });

    it('create will return a function index', () => {
        const context = {};
        const args = [1, 2];
        const sequenceId = new SequenceWithIdMock('123', args);
       
        sequenceIdFactory.create.mockReturnValue(sequenceId);

        const actual = functionCallIndexFactory.create({ context, functionName: 'test', arguments: args })

        expect(actual).toEqual({
            id: sequenceId,
            referenceCount: 1,
            instance: expect.objectContaining({
                functionName: 'test',
                context,
                argumentsId: sequenceId,
                id: 'test123'
            })
        });

    });

    it('Will release function index when all references have been release', () => {
        const context = {};
    
        const args = [1, 2];
        const sequenceId = new SequenceWithIdMock('123', args)

        sequenceIdFactory.create.mockReturnValue(sequenceId);

        const { instance: functionIndex1 } = functionCallIndexFactory.create({ context, functionName: 'test', arguments: args })
        const { instance: functionIndex2 } = functionCallIndexFactory.create({ context, functionName: 'test', arguments: args });

        expect(functionIndex1).toBe(functionIndex2);
        expect(functionCallIndexFactory.getFromId(sequenceId)).toBe(functionIndex1);

        functionIndex1.dispose();

        expect(functionCallIndexFactory.getFromId(sequenceId)).toBe(functionIndex1);

        functionIndex2.dispose();

        expect(functionCallIndexFactory.getFromId(sequenceId)).toBeUndefined();
    });

    it('Will create function index per arguments id', () => {
        const context = {};
        const sequenceId1 = new SequenceWithIdMock('123');
        const sequenceId2 = new SequenceWithIdMock('1234')
      
        sequenceIdFactory.create
            .mockReturnValueOnce(sequenceId1)
            .mockReturnValueOnce(sequenceId2);

        const actual1 = functionCallIndexFactory.create({ context, functionName: 'test', arguments: [1] })
        const actual2 = functionCallIndexFactory.create({ context, functionName: 'test', arguments: [2] });

        expect(actual1).toEqual({
            id: sequenceId1,
            referenceCount: 1,
            instance: expect.objectContaining({
                functionName: 'test',
                context,
                argumentsId: sequenceId1,
                id: 'test123'
            })
        });

        expect(actual2).toEqual({
            id: sequenceId2,
            referenceCount: 1,
            instance: expect.objectContaining({
                functionName: 'test',
                context,
                argumentsId: sequenceId2,
                id: 'test1234'
            })
        });
    });
});