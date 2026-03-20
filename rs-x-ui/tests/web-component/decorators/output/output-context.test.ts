import { ConstructorType, InjectionContainer } from '@rs-x/core';
import { Observable } from 'rxjs';
import { IOutputContext } from '../../../../lib/web-component/decorators/output/output-context.interface';
import { Output } from '../../../../lib/web-component/decorators/output/output.decorator.function';
import { RsXCoreUIModule } from '../../../../lib/rs-x-core-ui.module';
import { RsXUIInjectionTokens } from '../../../../lib/rx-x-core-ui.injection-tokens';
import { IOutputMetadata } from '../../../../lib/web-component/decorators/output/output-metadata.interface';

export interface ITestClass {
   output1: Observable<void>;
   output2: Observable<void>;
}

describe('Output context tests', () => {
   let outputContext: IOutputContext;
   let TestClass: ConstructorType<ITestClass>;

   function createTestClass(): ConstructorType<ITestClass> {
      class WithOutputs {
         @Output()
         public output1: Observable<void>;
         @Output()
         public output2: Observable<void>;
      }

      return WithOutputs;
   }

   beforeAll(async () => {
      await InjectionContainer.load(RsXCoreUIModule);
      TestClass = createTestClass();
      outputContext = InjectionContainer.get(
         RsXUIInjectionTokens.IOutputContext
      );
   });

   afterAll(async () => {
      await InjectionContainer.unload(RsXCoreUIModule);
   });

   it('isOutput returns true for an output field', () => {
      const actual = outputContext.isOutput(new TestClass(), 'output1');
      expect(actual).toBeTruthy();
   });

   it('isOutput returns true for an output field when search on event name', () => {
      const actual = outputContext.isOutput(new TestClass(), 'output1.on');
      expect(actual).toBeTruthy();
   });

   it('isOutput returns false for non output field', () => {
      const actual = outputContext.isOutput(new TestClass(), 'x');
      expect(actual).toBeFalsy();
   });

   it('getOuputs retuns all outputs for given target', () => {
      const actual = outputContext.getOutputs(new TestClass());
      const expected: IOutputMetadata[] = [
         {
            propertyKey: 'output1',
            eventName: 'output1.on',
         },
         {
            propertyKey: 'output2',
            eventName: 'output2.on',
         },
      ];
      expect(actual).toEqual(expected);
   });

   it('getOutputInfo return output for given property name', () => {
      const actual = outputContext.getOutputInfo(new TestClass(), 'output2');
      const expected: IOutputMetadata = {
         propertyKey: 'output2',
         eventName: 'output2.on',
      };
      expect(actual).toEqual(expected);
   });

   it('getOutputInfo return output for given event name', () => {
      const actual = outputContext.getOutputInfo(new TestClass(), 'output2.on');
      const expected: IOutputMetadata = {
         propertyKey: 'output2',
         eventName: 'output2.on',
      };
      expect(actual).toEqual(expected);
   });

   it('getOutputInfo return undefined for output that does not exist', () => {
      const actual = outputContext.getOutputInfo(new TestClass(), 'x');
      expect(actual).toBeUndefined();
   });

   it('emitEvent wil emit event on target', () => {
      const target = new TestClass();
      const nextSpy = jest.spyOn(target.output2 as any, 'next');
      const args = { a: 1 };
      outputContext.emitEvent(target, 'output2', args);
      expect(nextSpy).toHaveBeenCalledTimes(1);
      expect(nextSpy).toHaveBeenNthCalledWith(1, args);
   });

   it('emitEvent wil throw an exception when', () => {
      expect(() => outputContext.emitEvent(new TestClass(), 'y')).toThrow(
         `No output found with event or property name 'y'`
      );
   });
});
