import { describe } from 'node:test';

import { of } from 'rxjs';

import { EqualityService } from '../lib/equality-service/equality-service';

describe('EqualityService tests', () => {
   let equalityService: EqualityService;

   beforeEach(() => {
      equalityService = new EqualityService();
   });

   describe('equal', () => {
      it('promises', () => {
         const promise = Promise.resolve(1000);
         const a = {
            x: promise,
         };
         const b = {
            x: promise,
         };

         const actual = equalityService.isEqual(a, b);
         expect(actual).toEqual(true);
      });

      it('observable', () => {
         const observable = of(100);
         const a = {
            x: observable,
         };
         const b = {
            x: observable,
         };

         const actual = equalityService.isEqual(a, b);
         expect(actual).toEqual(true);
      });

      it('objects', () => {
         const a = {
            x: 100,
         };

         const b = {
            x: 100,
         };

         const actual = equalityService.isEqual(a, b);
         expect(actual).toEqual(true);
      });

      it('arrays', () => {
         const a = {
            x: [{ y: 1 }],
         };
         const b = {
            x: [{ y: 1 }],
         };

         const actual = equalityService.isEqual(a, b);
         expect(actual).toEqual(true);
      });

      it('maps', () => {
         const a = {
            x: new Map([['a', { x: 1 }]]),
         };
         const b = {
            x: new Map([['a', { x: 1 }]]),
         };

         const actual = equalityService.isEqual(a, b);
         expect(actual).toEqual(true);
      });

      it('set', () => {
         const a = {
            x: new Set([{ x: 1 }]),
         };
         const b = {
            x: new Set([{ x: 1 }]),
         };

         const actual = equalityService.isEqual(a, b);
         expect(actual).toEqual(true);
      });
   });

   describe('not equal', () => {
      it('promises', () => {
         const a = {
            x: Promise.resolve(1000),
         };
         const b = {
            x: Promise.resolve(1000),
         };

         const actual = equalityService.isEqual(a, b);
         expect(actual).toEqual(false);
      });

      it('observable', () => {
         const a = {
            x: of(100),
         };
         const b = {
            x: of(100),
         };

         const actual = equalityService.isEqual(a, b);
         expect(actual).toEqual(false);
      });

      it('objects', () => {
         const a = {
            x: 100,
         };
         const b = {
            x: 200,
         };

         const actual = equalityService.isEqual(a, b);
         expect(actual).toEqual(false);
      });

      it('arrays', () => {
         const a = {
            x: [{ y: 1 }],
         };
         const b = {
            x: [{ y: 1 }],
         };

         const actual = equalityService.isEqual(a, b);
         expect(actual).toEqual(true);
      });

      it('maps', () => {
         const a = {
            x: new Map([['a', { x: 1 }]]),
         };
         const b = {
            x: new Map([['a', { x: 2 }]]),
         };

         const actual = equalityService.isEqual(a, b);
         expect(actual).toEqual(false);
      });

      it('set', () => {
         const a = {
            x: new Set([{ x: 1 }]),
         };
         const b = {
            x: new Set([{ x: 2 }]),
         };

         const actual = equalityService.isEqual(a, b);
         expect(actual).toEqual(false);
      });
   });
});
