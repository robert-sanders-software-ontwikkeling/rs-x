import {
   ConstructorType,
   ContainerModule,
   Injectable,
   InjectionContainer,
   minifyHTML,
   waitForEvent,
} from '@rs-x/core';
import { InvalidOperationException } from '../../../rs-x-core/lib/error-handling/exceptions/invalid-operation-exception';
import {
   RsXCoreUIModule,
   unloadRsXCoreUIModule,
} from '../../lib/rs-x-core-ui.module';
import { IDirectiveMetadata } from '../../lib/web-component/structural-directives/directive-decorator/directive-metadata.interface';
import { Directive } from '../../lib/web-component/structural-directives/directive-decorator/directive.decorator.function';
import { IStructuralDirectiveFactory } from '../../lib/web-component/structural-directives/repeater/repeater-directive.factory.interface';
import { IStructuralDirective } from '../../lib/web-component/structural-directives/repeater/repeater.directive.interface';
import { StructuralDirectiveRegistry } from '../../lib/web-component/structural-directives/structural-directive-registry';

describe('structural directive registry tests', () => {
   let TestModule: ContainerModule;
   const MessageDirectiveFactoryToken = Symbol('MessageDirectiveFactory');
   const StyleDirectiveFactoryToken = Symbol('StyleDirectiveFactory');
   let MessageDirectiveType: ConstructorType;
   let StyleDirectiveType: ConstructorType;

   beforeAll(async () => {
      await InjectionContainer.load(RsXCoreUIModule);

      @Injectable()
      class MessageDirectiveFactory implements IStructuralDirectiveFactory {
         public readonly priority = 2;

         public create(
            element: Element,
            message: string
         ): IStructuralDirective {
            return new MessageDirective(element, message);
         }
      }

      @Injectable()
      class StyleDirectiveFactory implements IStructuralDirectiveFactory {
         public readonly priority = 1;

         public create(element: Element, style: string): IStructuralDirective {
            return new StyleDirective(element as HTMLElement, style);
         }
      }

      TestModule = new ContainerModule((options) => {
         options
            .bind<IStructuralDirectiveFactory>(MessageDirectiveFactoryToken)
            .to(MessageDirectiveFactory)
            .inSingletonScope();
         options
            .bind<IStructuralDirectiveFactory>(StyleDirectiveFactoryToken)
            .to(StyleDirectiveFactory)
            .inSingletonScope();
      });

      await InjectionContainer.load(TestModule);

      @Directive({
         name: 'message',
         factortyToken: MessageDirectiveFactoryToken,
      })
      class MessageDirective implements IStructuralDirective {
         constructor(
            private readonly _element: Element,
            private readonly _message: string
         ) {}

         public async attach(): Promise<void> {
            this._element.textContent = this._message;
         }
         public detach(): void {
            this._element.textContent = '';
         }
      }

      MessageDirectiveType = MessageDirective;

      @Directive({
         name: 'style',
         factortyToken: StyleDirectiveFactoryToken,
         priority: 2,
      })
      class StyleDirective implements IStructuralDirective {
         constructor(
            private readonly _element: HTMLElement,
            private readonly _style: string
         ) {}

         public async attach(): Promise<void> {
            this._element.style.cssText = this._style;
         }
         public detach(): void {
            this._element.style.cssText = '';
         }
      }
      StyleDirectiveType = StyleDirective;
   });

   afterAll(async () => {
      await InjectionContainer.unload(TestModule);
      await unloadRsXCoreUIModule();
   });

   beforeEach(() => {
      StructuralDirectiveRegistry.instance.registerContext(document.body);
   });

   afterEach(() => {
      StructuralDirectiveRegistry.instance.unregisterContext(document.body);
      document.body.innerHTML = '';
   });

   it('registerDirective will throw an error when directive is allready registered', () => {
      const metadata: IDirectiveMetadata = {
         name: 'test',
         factortyToken: Symbol('test'),
      };
      StructuralDirectiveRegistry.instance.registerDirective(metadata);

      expect(() =>
         StructuralDirectiveRegistry.instance.registerDirective(metadata)
      ).toThrow(
         new InvalidOperationException(
            `Directive ${metadata.name} has already been registered`
         )
      );

      StructuralDirectiveRegistry.instance.unregisterDirective(metadata.name);
   });

   it('registerContext attached the directives', async () => {
      const actualDirecives = await waitForEvent(
         StructuralDirectiveRegistry.instance,
         'attached',
         () => {
            document.body.innerHTML = `
                <div data-message="hello"></div>
                <div data-message="world"></div>

            `;
         }
      );
      const expectedDirectives = Array.from(
         document.body.querySelectorAll('div')
      ).map(
         (element) =>
            new MessageDirectiveType(element, element.textContent.trim())
      );
      const actualHTML = minifyHTML(document.body.innerHTML);

      expect(actualDirecives).toEqual(expectedDirectives);
      expect(actualHTML).toEqual(
         '<div data-message="hello">hello</div><div data-message="world">world</div>'
      );
   });

   it('template content will be ignored', async () => {
      const actualDirecives = await waitForEvent(
         StructuralDirectiveRegistry.instance,
         'attached',
         () => {
            document.body.innerHTML = `
                <div data-message="hello"></div>
                <template>
                    <div data-message="world"></div>
                </template>

            `;
         }
      );

      const expectedDirectives = Array.from(
         document.body.querySelectorAll('div')
      ).map(
         (element) =>
            new MessageDirectiveType(element, element.textContent.trim())
      );

      const actualHTML = minifyHTML(document.body.innerHTML);

      expect(actualDirecives).toEqual(expectedDirectives);
      expect(actualHTML).toEqual(
         '<div data-message="hello">hello</div><template><div data-message="world"></div></template>'
      );
   });

   it('can apply multiple directive to an element and they will be applied in order of priority', async () => {
      const actualDirecives = await waitForEvent(
         StructuralDirectiveRegistry.instance,
         'attached',
         () => {
            document.body.innerHTML = `
                <div data-message="hello" data-style="background-color:red"></div>
            `;
         }
      );

      const expectedDirectives = Array.from(
         document.body.querySelectorAll('div')
      )
         .map((element) => [
            new StyleDirectiveType(element, 'background-color:red'),
            new MessageDirectiveType(element, 'hello'),
         ])
         .reduce((a, b) => a.concat(b), []);

      const actualHTML = minifyHTML(document.body.innerHTML);

      expect(actualDirecives).toEqual(expectedDirectives);
      expect(actualHTML).toEqual(
         '<div data-message="hello" data-style="background-color:red" style="background-color: red;">hello</div>'
      );
   });

   it('directives will detached when belonging element is removed', async () => {
      const messageDirective = (
         await waitForEvent(
            StructuralDirectiveRegistry.instance,
            'attached',
            () => {
               document.body.innerHTML = `
                <div data-message="hello"></div>
            `;
            }
         )
      )[0];
      const detachSpy = jest.spyOn(messageDirective, 'detach');
      const divElement = document.body.querySelector('div');

      const actualDirectives = await waitForEvent(
         StructuralDirectiveRegistry.instance,
         'detached',
         () => {
            document.body.innerHTML = '';
         }
      );

      const expectedDirectives = [
         new MessageDirectiveType(divElement, 'hello'),
      ];

      expect(detachSpy).toHaveBeenCalledTimes(1);

      detachSpy.mockRestore();
      expect(actualDirectives).toEqual(expectedDirectives);
   });

   it('unregisterContext will detach the all directives in the given context', async () => {
      const messageDirective = (
         await waitForEvent(
            StructuralDirectiveRegistry.instance,
            'attached',
            () => {
               document.body.innerHTML = `
                <div data-message="hello"></div>
            `;
            }
         )
      )[0];
      const detachSpy = jest.spyOn(messageDirective, 'detach');
      const divElement = document.body.querySelector('div');

      const actualDirectives = await waitForEvent(
         StructuralDirectiveRegistry.instance,
         'detached',
         () => {
            StructuralDirectiveRegistry.instance.unregisterContext(
               document.body
            );
         }
      );

      const expectedDirectives = [
         new MessageDirectiveType(divElement, 'hello'),
      ];

      expect(detachSpy).toHaveBeenCalledTimes(1);

      detachSpy.mockRestore();
      expect(actualDirectives).toEqual(expectedDirectives);
   });

   it('unregisterContext will stop observing the given context', async () => {
      StructuralDirectiveRegistry.instance.unregisterContext(document.body);

      const actualDirecives = await waitForEvent(
         StructuralDirectiveRegistry.instance,
         'attached',
         () => {
            document.body.innerHTML = `
                <div data-message="hello"></div>
            `;
         }
      );

      const actualHTML = minifyHTML(document.body.innerHTML);

      expect(actualDirecives).toBeNull();
      expect(actualHTML).toEqual('<div data-message="hello"></div>');
   });

   it('unregisterDirective will unregister the directive with given name', async () => {
      StructuralDirectiveRegistry.instance.unregisterDirective('message');

      const actualDirecives = await waitForEvent(
         StructuralDirectiveRegistry.instance,
         'attached',
         () => {
            document.body.innerHTML = `
                <div data-message="hello"></div>
            `;
         }
      );

      StructuralDirectiveRegistry.instance.registerDirective({
         name: 'message',
         factortyToken: MessageDirectiveFactoryToken,
      });

      const actualHTML = minifyHTML(document.body.innerHTML);

      expect(actualDirecives).toBeNull();
      expect(actualHTML).toEqual('<div data-message="hello"></div>');
   });
});
