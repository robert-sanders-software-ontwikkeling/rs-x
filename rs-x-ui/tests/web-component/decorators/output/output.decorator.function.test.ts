import { ConstructorType, InjectionContainer } from '@rs-x/core';
import { Observable, Subject } from 'rxjs';
import { RsXCoreUIModule } from '../../../../lib/rs-x-core-ui.module';
import { RsXUIInjectionTokens } from '../../../../lib/rx-x-core-ui.injection-tokens';
import { IOutputContext } from '../../../../lib/web-component/decorators/output/output-context.interface';
import { Output } from '../../../../lib/web-component/decorators/output/output.decorator.function';
import { IOutputMetadata } from '../../../../lib/web-component/decorators/output/output-metadata.interface';

describe('Output decorator', () => {
   let TestClass: ConstructorType;
   let DerivedTestClass: ConstructorType;
   let outputContext: IOutputContext;

   function createTestClass(): ConstructorType {
      class WithOutputs {
         public x = 'test';
         private readonly _propertyOutput = new Subject<void>();

         @Output()
         public fieldOutput: Observable<void>;

         @Output('test')
         public outputWithCustomEventName: Observable<void>;

         @Output()
         public get propertyOutput(): Observable<void> {
            return this._propertyOutput;
         }
      }

      return WithOutputs;
   }

   function createDerivedTestClass(): ConstructorType {
      class BaseClassWithOutputs {
         @Output()
         public a1: Observable<void>;
      }

      class DerivedClassWithOutputs extends BaseClassWithOutputs {
         @Output()
         public b1: Observable<void>;
         @Output()
         public b2: Observable<void>;

         @Output('myevent')
         public a1: Observable<void>;
      }

      return DerivedClassWithOutputs;
   }

   beforeAll(async () => {
      await InjectionContainer.load(RsXCoreUIModule);
      TestClass = createTestClass();
      DerivedTestClass = createDerivedTestClass();
      outputContext = InjectionContainer.get(
         RsXUIInjectionTokens.IOutputContext
      );
   });

   afterAll(async () => {
      await InjectionContainer.unload(RsXCoreUIModule);
   });

   it('Default output values', () => {
      const actual = outputContext.getOutputInfo(
         new TestClass(),
         'fieldOutput'
      );
      const expected: IOutputMetadata = {
         eventName: 'fieldOutput.on',
         propertyKey: 'fieldOutput',
      };
      expect(actual).toEqual(expected);
   });

   it('Output with custom event name', () => {
      const actual = outputContext.getOutputInfo(
         new TestClass(),
         'outputWithCustomEventName'
      );
      const expected: IOutputMetadata = {
         eventName: 'test.on',
         propertyKey: 'outputWithCustomEventName',
      };
      expect(actual).toEqual(expected);
   });

   it('Output on property', () => {
      const actual = outputContext.getOutputInfo(
         new TestClass(),
         'fieldOutput'
      );
      const expected: IOutputMetadata = {
         eventName: 'fieldOutput.on',
         propertyKey: 'fieldOutput',
      };
      expect(actual).toEqual(expected);
   });

   it('Output on derived class', () => {
      const actual = outputContext
         .getOutputs(new DerivedTestClass())
         .sort((a, b) => a.propertyKey.localeCompare(b.propertyKey));
      const expected: IOutputMetadata[] = [
         {
            eventName: 'myevent.on',
            propertyKey: 'a1',
         },
         {
            eventName: 'b1.on',
            propertyKey: 'b1',
         },
         {
            eventName: 'b2.on',
            propertyKey: 'b2',
         },
      ];
      expect(actual).toEqual(expected);
   });
});
