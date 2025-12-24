import { SequenceIdFactory } from '../../lib/sequence-id/sequence-id.factory'
import { GuidFactoryMock } from '../../lib/testing/guid.factory.mock';

describe('SequenceIdFactory tests', () => {
    let guidFactory: GuidFactoryMock;
    let sequenceIdFactory: SequenceIdFactory;

    beforeEach(() => {
        guidFactory = new GuidFactoryMock();
        sequenceIdFactory = new SequenceIdFactory(guidFactory);

    });

    it('will create sequnce with id', () => {
        const context = {};
        guidFactory.create.mockReturnValue('123');
        const sequence = [1, 2]

        const actual = sequenceIdFactory.create(context, sequence);
        expect(actual).toEqual(expect.objectContaining({
            id: '123',
            sequence,
        })
        );
    });

    it('will create different sequence-ids for different sequence on same context', () => {
        const context = {};
        guidFactory.create
            .mockReturnValueOnce('123')
            .mockReturnValueOnce('1234');
        const sequence1 = [1, 2]
        const sequence2 = [1, 3];

        const actual1 = sequenceIdFactory.create(context, sequence1);
        const actual2 = sequenceIdFactory.create(context, sequence2);

        expect(actual1).toEqual(expect.objectContaining({
            id: '123',
            sequence: sequence1,
        })
        );
        expect(actual2).toEqual(expect.objectContaining({
            id: '1234',
            sequence: sequence2,
        })
        );
    });

    it('will create different sequence-ids for same sequence on different context', () => {
        const context1 = {};
        const context2 = {};
        guidFactory.create.mockReturnValue('123')

        const sequence1 = [1, 2]

        const actual1 = sequenceIdFactory.create(context1, sequence1);
        const actual2 = sequenceIdFactory.create(context2, sequence1);

        expect(actual1).not.toBe(actual2)

    });

    it('will return same sequence-id for same sequence on same context', () => {
        const context = {};
        guidFactory.create.mockReturnValue('123')

        const sequence1 = [1, 2]

        const actual1 = sequenceIdFactory.create(context, sequence1);
        const actual2 = sequenceIdFactory.create(context, sequence1);

        expect(actual1).toBe(actual2)
    });

    it('will not release sequence-id until all references have been released', () => {
        const context = {};
        guidFactory.create.mockReturnValue('123')
        const sequence1 = [1, 2]

        const sequenceWIthId1 = sequenceIdFactory.create(context, sequence1);
        const sequenceWIthId2 = sequenceIdFactory.create(context, sequence1);

        expect(sequenceIdFactory.get(context, sequence1)).toBeDefined();

        sequenceWIthId1.dispose();

        expect(sequenceIdFactory.get(context, sequence1)).toBeDefined();

        sequenceWIthId2.dispose();

        expect(sequenceIdFactory.get(context, sequence1)).toBeUndefined();

    });
});