import {
    printValue,
    WaitForEvent,

} from '@rs-x/core';
import { Observable, Subject } from 'rxjs';

export const run = (async () => {
    class MyEventContext {
        private readonly _message = new Subject<string>();


        public get message(): Observable<string> {
            return this._message;
        }

        public emitMessage(message: string): void {
            this._message.next(message);
        }
    }

    const eventContext = new MyEventContext();
    const result = await new WaitForEvent(eventContext, 'message', { count: 2 }).wait(() => {
        eventContext.emitMessage('Hello');
        eventContext.emitMessage('hi');
    });
    console.log('Emitted events:');
    printValue(result);
})();