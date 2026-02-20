import { Type } from '../types/type';
import { CustomError } from './custome-error';


export class NoAccessorFoundExeception<TContext, TIndex> extends CustomError {
    private static createMessage<TContext, TIndex>(context: TContext, index: TIndex): string {
        const description = `This may mean that the index '${index}' does not exist on the given context, or that the index value type is not supported.`;

        if (!Type.isNullOrUndefined(context)) {
            return `No accessor found for '${index}'. ${description}`;
        } else {
            return `Context is null or undefined. Cannot get value for index '${index}'.`;
        }
    }

    constructor(context: TContext, index: TIndex) {
        super(NoAccessorFoundExeception.createMessage(context, index), 'NoAccessorFoundExeception');
    }
}