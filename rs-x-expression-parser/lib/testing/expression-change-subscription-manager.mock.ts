import { KeyedInstanceFactoryMock, ObservableMock } from '@rs-x/core/testing';
import { Subject } from 'rxjs';

export class ExpressionChangeSubscriptionManagerMock extends KeyedInstanceFactoryMock<unknown, unknown, Subject<unknown>> {
    public readonly changed = new ObservableMock<unknown>();
}
