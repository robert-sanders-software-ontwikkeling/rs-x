import { BehaviorSubject, Subject, tap, throwError, timer } from 'rxjs';

import { WaitForEvent } from '../lib/wait-for-event';

describe('WaitOptions tests', () => {
   it('will ignore the initials valye when ignoreInitialValue = true', async () => {
      const eventContext = {
         event: new BehaviorSubject(10),
      };

      const actual = await new WaitForEvent(eventContext, 'event', {
         ignoreInitialValue: true,
      }).wait(() => {
         eventContext.event.next(20);
      });
      expect(actual).toEqual(20);
   });

   it('will return initials valye when event when ignoreInitialValue = false', async () => {
      const eventContext = {
         event: new BehaviorSubject(10),
      };

      const actual = await new WaitForEvent(eventContext, 'event', {
         ignoreInitialValue: false,
      }).wait(() => {});
      expect(actual).toEqual(10);
   });

   it('will wait until x events have been emitted when count = x', async () => {
      const eventContext = {
         event: new Subject(),
      };

      const actual = await new WaitForEvent(eventContext, 'event', {
         count: 2,
      }).wait(() => {
         eventContext.event.next(10);
         eventContext.event.next(20);
      });
      expect(actual).toEqual([10, 20]);
   });

   it('will return null if no events have been emitted', async () => {
      const eventContext = {
         event: new Subject(),
      };
      const actual = await new WaitForEvent(eventContext, 'event', {
         ignoreInitialValue: false,
      }).wait(() => {});
      expect(actual).toBeNull();
   });

   it('if a trigger returns a promise it will wait for it to fisnish', async () => {
      const eventContext = {
         event: new Subject(),
      };
      const actual = await new WaitForEvent(eventContext, 'event', {
         timeout: 300,
      }).wait(() => {
         return new Promise((resolve) => {
            setTimeout(() => {
               eventContext.event.next(10);
               resolve(undefined);
            }, 200);
         });
      });
      expect(actual).toEqual(10);
   });

   it('if a trigger returns a observable it will wait for it to fisnish', async () => {
      const eventContext = {
         event: new Subject(),
      };
      const actual = await new WaitForEvent(eventContext, 'event', {
         timeout: 300,
      }).wait(() => {
         return timer(200).pipe(
            tap(() => eventContext.event.next(10)),
            tap(() => {})
         );
      });
      expect(actual).toEqual(10);
   });

   it('will throw an error if trigger returns an observable that emits error', async () => {
      const eventContext = {
         event: new Subject(),
      };

      await expect(
         new WaitForEvent(eventContext, 'event', { timeout: 300 }).wait(() => {
            return throwError(() => new Error('oops'));
         })
      ).rejects.toThrow(new Error('oops'));
   });

   it('will throw an error if trigger returns an rejected promise', async () => {
      const eventContext = {
         event: new Subject(),
      };

      await expect(
         new WaitForEvent(eventContext, 'event', { timeout: 300 }).wait(() => {
            return Promise.reject(new Error('oops'));
         })
      ).rejects.toThrow('oops');
   });

   it('will throw an error if trigger throws an error', async () => {
      const eventContext = {
         event: new Subject(),
      };

      await expect(
         new WaitForEvent(eventContext, 'event', { timeout: 300 }).wait(() => {
            throw new Error('oops');
         })
      ).rejects.toThrow('oops');
   });
});
