import { Subject } from 'rxjs';
import { AbstractExpression } from '../expressions';


export class ExpressionChangeTransactionManagerMock {
    public readonly commited = new Subject<AbstractExpression>();
    public readonly subscribeCommitted = jest.fn();
    public readonly registerChange = jest.fn();
    public readonly suspend = jest.fn();
    public readonly continue = jest.fn();
    public readonly commit = jest.fn();
    public readonly dispose = jest.fn();
}