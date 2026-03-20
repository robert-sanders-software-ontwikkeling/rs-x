import {
   IError,
   IErrorLog,
   InjectionContainer,
   Input,
   InvalidOperationException,
   RsXCoreInjectionTokens,
   waitForEvent,
} from '@rs-x/core';
import { Subject } from 'rxjs';
import { RsXUIInjectionTokens } from '../../lib';
import {
   getElement,
   setupWebComponentTests,
   teardownWebComponentTests,
   waitForCustomElementEvent,
} from '../../lib/testing/utility';
import { Component, Output } from '../../lib/web-component/decorators';
import { IEventObserver } from '../../lib/web-component/event-manager/event-observer.interface';
import {
   IWebComponentController,
   IWebComponentElement,
} from '../../lib/web-component/interfaces';
import { WebComponentController } from '../../lib/web-component/web-component-controller';
import { WebComponentElement } from '../../lib/web-component/web-component-element';

interface IMyContent extends IWebComponentElement<IWebComponentController> {
   content: string;
   readonly sayHi: Subject<string>;
}

interface IWithoutSlots extends IWebComponentElement<IWebComponentController> {
   header: string;
   content: string;
   handleSayHi(): void;
}

interface IMyApplication extends IWebComponentElement<IWebComponentController> {
   header: string;
   content: string;
   inputValue: string;
   handleSayHi(sender: IMyContent, message: string, from: string): void;
}

interface IMyHeader extends IWebComponentElement<IWebComponentController> {
   header: string;
}

describe('Web component tests', () => {
   let applicationType: unknown;
   let headerType: unknown;
   let contentType: unknown;
   let panelType: unknown;
   let withoutSlotsType: unknown;
   let eventObserver: IEventObserver;

   beforeAll(async () => {
      @Component({
         selector: 'my-app',
         template: '<slot></slot>',
         dependencies: [],
         controllerFactoryToken: WebComponentController,
      })
      class MyApplication
         extends WebComponentElement<IWebComponentController>
         implements IMyApplication
      {
         public header = 'hi';
         public content = 'Robert';
         public inputValue = 'hello';

         public handleSayHi(): string {
            return 'hi';
         }
      }

      @Component({
         selector: 'my-header',
         template: '<div>[[header]]</div>',
         dependencies: [],
         controllerFactoryToken: WebComponentController,
      })
      class MyHeader
         extends WebComponentElement<IWebComponentController>
         implements IMyHeader
      {
         @Input() public header: string;
      }

      @Component({
         selector: 'my-content',
         template: '<div>[[content]]</div>',
         dependencies: [],
         controllerFactoryToken: WebComponentController,
      })
      class MyContent
         extends WebComponentElement<IWebComponentController>
         implements IMyContent
      {
         @Input({ reflectToAttribute: true })
         public content: string = '';
         @Output('sayhi')
         public readonly sayHi: Subject<string>;
      }

      @Component({
         selector: 'my-panel',
         template: `
            <slot name="header"></slot>
            <slot name="content"></slot>
         `,
         dependencies: [],
         controllerFactoryToken: WebComponentController,
      })
      class MyPanel extends WebComponentElement<IWebComponentController> {}

      @Component({
         selector: 'without-slots',
         template: `
            <table>
               <tr>
                  <td>
                     <my-header header.onetime="header"> </my-header>
                  </td>
                  <td>
                     <my-content
                        sayHi.on="handleSayHi($sender, $event, 'How are you?')"
                        click.on="handleSayHi($sender, $event, 'How are you?')"
                        content.oneway="contentText"
                     >
                     </my-content>
                  </td>
               </tr>

               <tr>
                  <td id="cellWithText">[[contentText]]</td>
                  <td>
                     <input value.twoway="inputValue" />
                  </td>
               </tr>
            </table>
         `,
         dependencies: [],
         controllerFactoryToken: WebComponentController,
      })
      class WithoutSlots extends WebComponentElement<IWebComponentController> {
         public header = 'Fairytale';
         public contentText = 'Once upon a time...';
         public inputValue = 'use your imagination';

         public handleSayHi(): string {
            return 'hi';
         }
      }

      applicationType = MyApplication;
      headerType = MyHeader;
      contentType = MyContent;
      panelType = MyPanel;
      withoutSlotsType = WithoutSlots;

      await setupWebComponentTests();

      eventObserver = InjectionContainer.get(
         RsXUIInjectionTokens.IEventObserver
      );
   });
   afterAll(teardownWebComponentTests);

   afterEach(() => {
      document.body.innerHTML = '';
   });

   describe('update content after bindings change', () => {
      it('two-way binding: set left value will update right  value', async () => {
         await waitForCustomElementEvent(
            [
               {
                  name: 'inputValue',
                  eventName: 'bound',
                  forType: applicationType,
                  execute: () => {
                     return;
                  },
               },
            ],
            `
            <my-app>
                <input value.twoway="inputValue"/>
            </my-app>`
         );

         const applicationComponent = getElement<IMyApplication>('my-app');
         const input = applicationComponent.shadowRoot
            .querySelector('slot')
            .assignedNodes()[1] as HTMLInputElement;
         await rebind(
            () => (input.value = 'Hello Robert'),
            applicationComponent.customElement
         );
         expect(applicationComponent.customElement.inputValue).toEqual(
            'Hello Robert'
         );
      });

      it('Two way binding: setting right value will update left value', async () => {
         await waitForCustomElementEvent(
            [
               {
                  name: 'inputValue',
                  eventName: 'bound',
                  forType: applicationType,
                  execute: () => {
                     return;
                  },
               },
            ],
            `
            <my-app>
                <input value.twoway="inputValue"/>
            </my-app>`
         );

         const applicationComponent = getElement<IMyApplication>('my-app');
         const input = applicationComponent.shadowRoot
            .querySelector('slot')
            .assignedNodes()[1] as HTMLInputElement;
         await rebind(
            () =>
               (applicationComponent.customElement.inputValue = 'Hello Robert'),
            applicationComponent.customElement
         );
         expect(input.value).toEqual('Hello Robert');
      });

      it('Two way binding to value: input event will update left operand value', async () => {
         await waitForCustomElementEvent(
            [
               {
                  name: 'inputValue',
                  eventName: 'bound',
                  forType: applicationType,
                  execute: () => {
                     return;
                  },
               },
            ],
            `
            <my-app>
                <input value.twoway="inputValue"/>
            </my-app>`
         );

         const applicationComponent = getElement<IMyApplication>('my-app');
         const input = applicationComponent.shadowRoot
            .querySelector('slot')
            .assignedNodes()[1] as HTMLInputElement;

         expect(applicationComponent.customElement.inputValue).toEqual('hello');

         await rebind(() => {
            applicationComponent.customElement.controller.bindingManager.disableWatch();
            input.value += 'a';
            applicationComponent.customElement.controller.bindingManager.enableWatch();
            input.dispatchEvent(new Event('change', { bubbles: true }));
         }, applicationComponent.customElement);
         expect(applicationComponent.customElement.inputValue).toEqual(
            'helloa'
         );
      });

      it('one-way-text binding: setting right value will update left value', async () => {
         await waitForCustomElementEvent(
            [
               {
                  name: 'inputValue',
                  eventName: 'bound',
                  forType: applicationType,
                  execute: () => {
                     return;
                  },
               },
            ],
            `
            <my-app>
                <div>[[inputValue]]</div>
            </my-app>`
         );

         const applicationComponent = getElement<IMyApplication>('my-app');
         const input = applicationComponent.shadowRoot
            .querySelector('slot')
            .assignedNodes()[1];
         await rebind(
            () =>
               (applicationComponent.customElement.inputValue = 'Hello Robert'),
            applicationComponent.customElement
         );
         expect(input.textContent).toEqual('Hello Robert');
      });

      it('one-time will not be updated after change', async () => {
         await waitForCustomElementEvent(
            [
               {
                  name: 'inputValue',
                  eventName: 'bound',
                  forType: applicationType,
                  execute: () => {
                     return;
                  },
               },
            ],
            `
            <my-app>
                <input value.onetime="inputValue"/>
            </my-app>`
         );

         const applicationComponent = getElement<IMyApplication>('my-app');
         const input = applicationComponent.shadowRoot
            .querySelector('slot')
            .assignedNodes()[1] as HTMLInputElement;
         const result = await rebind(
            () =>
               (applicationComponent.customElement.inputValue = 'Hello Robert'),
            applicationComponent.customElement
         );
         expect(result).toEqual(false);
         expect(input.value).toBe('hello');
      });
   });

   describe('with slots', () => {
      describe('initializing bindings', () => {
         it('one-time binding will be initialized', async () => {
            const actual = await waitForCustomElementEvent(
               [
                  {
                     name: 'application',
                     forType: applicationType,
                     eventName: 'bound',
                     execute: (
                        component: IWebComponentElement<IWebComponentController>
                     ) => {
                        const slot = Array.from(
                           component.element.shadowRoot.childNodes
                        )[0] as HTMLSlotElement;

                        return slot
                           .assignedNodes()
                           .filter((n) => n.nodeType === Node.ELEMENT_NODE)
                           .map((n) => (n as HTMLElement).outerHTML)
                           .join('')
                           .replace(/>\s+</g, '><') // Removes whitespace between tags
                           .trim();
                     },
                  },
                  {
                     name: 'header',
                     forType: headerType,
                     eventName: 'bound',
                     execute: (
                        component: IWebComponentElement<IWebComponentController>
                     ) => {
                        return component.element.shadowRoot.innerHTML.trim();
                     },
                  },
               ],
               `
            <my-app>
                <my-header header.onetime="header">
                </my-header>
            </my-app>`
            );

            const expected = {
               application: '<my-header header.onetime="header"></my-header>',
               header: '<div>hi</div>',
            };
            expect(actual).toEqual(expected);
         });

         it('one-way binding will be initialized', async () => {
            const actual = await waitForCustomElementEvent(
               [
                  {
                     name: 'application',
                     forType: applicationType,
                     eventName: 'bound',
                     execute: (
                        component: IWebComponentElement<IWebComponentController>
                     ) => {
                        const slot = Array.from(
                           component.element.shadowRoot.childNodes
                        )[0] as HTMLSlotElement;

                        return (
                           slot.assignedNodes()[1] as Element
                        ).outerHTML.replace(/>\s+</g, '><');
                     },
                  },

                  {
                     name: 'content',
                     forType: contentType,
                     eventName: 'bound',
                     execute: (
                        component: IWebComponentElement<IWebComponentController>
                     ) => {
                        return component.element.shadowRoot.innerHTML;
                     },
                  },
               ],
               `
            <my-app>
                <my-content content.oneway="header">
                </my-content>
            </my-app>`
            );

            const expected = {
               application: '<my-content content.oneway="header"></my-content>',
               content: '<div>hi</div>',
            };
            expect(actual).toEqual(expected);
         });

         it('two-way binding will be initialized', async () => {
            const actual = await waitForCustomElementEvent(
               [
                  {
                     name: 'application',
                     forType: applicationType,
                     eventName: 'bound',
                     execute: (
                        component: IWebComponentElement<IWebComponentController>
                     ) => {
                        const slot = Array.from(
                           component.element.shadowRoot.childNodes
                        )[0] as HTMLSlotElement;

                        return slot
                           .assignedNodes()
                           .filter((n) => n.nodeType === Node.ELEMENT_NODE)
                           .map((n) => (n as HTMLElement).outerHTML)
                           .join('')
                           .replace(/>\s+</g, '><') // Removes whitespace between tags
                           .trim();
                     },
                  },
                  {
                     name: 'header',
                     forType: headerType,
                     eventName: 'bound',
                     execute: (
                        component: IWebComponentElement<IWebComponentController>
                     ) => {
                        return component.element.shadowRoot.innerHTML.trim();
                     },
                  },
               ],
               `
            <my-app>
                <my-header header.twoway="header">
                </my-header>
            </my-app> `
            );

            const expected = {
               application: '<my-header header.twoway="header"></my-header>',
               header: '<div>hi</div>',
            };
            expect(actual).toEqual(expected);
         });

         it('text binding binding will be initialized', async () => {
            const actual = await waitForCustomElementEvent(
               [
                  {
                     name: 'application',
                     forType: applicationType,
                     eventName: 'bound',
                     execute: (
                        component: IWebComponentElement<IWebComponentController>
                     ) => {
                        const slot = Array.from(
                           component.element.shadowRoot.childNodes
                        )[0] as HTMLSlotElement;

                        return slot
                           .assignedNodes()
                           .map((n) => n.textContent.trim())
                           .join('');
                     },
                  },
               ],
               `
            <my-app>
                [[header]]
            </my-app>`
            );

            const expected = { application: 'hi' };
            expect(actual).toEqual(expected);
         });

         it('binding for multiple slots will be initialized', async () => {
            const actual = await waitForCustomElementEvent(
               [
                  {
                     name: 'application',
                     forType: applicationType,
                     eventName: 'bound',
                     execute: (
                        component: IWebComponentElement<IWebComponentController>
                     ) => {
                        const slot = Array.from(
                           component.element.shadowRoot.childNodes
                        )[0] as HTMLSlotElement;

                        return slot
                           .assignedNodes()
                           .filter((n) => n.nodeType === Node.ELEMENT_NODE)
                           .map((n) => (n as HTMLElement).outerHTML)
                           .join('')
                           .replace(/>\s+</g, '><') // Removes whitespace between tags
                           .trim();
                     },
                  },
                  {
                     name: 'panel',
                     forType: panelType,
                     eventName: 'bound',
                     execute: (
                        component: IWebComponentElement<IWebComponentController>
                     ) => {
                        const slots = Array.from(
                           component.element.shadowRoot.childNodes
                        ).filter(
                           (e) => e instanceof HTMLSlotElement
                        ) as HTMLSlotElement[];
                        return slots
                           .map((slot) =>
                              slot
                                 .assignedNodes()
                                 .filter(
                                    (n) => n.nodeType === Node.ELEMENT_NODE
                                 )
                                 .map((n) => (n as HTMLElement).outerHTML)
                                 .join('')
                                 .replace(/>\s+</g, '><') // Removes whitespace between tags
                                 .trim()
                           )
                           .join('');
                     },
                  },
                  {
                     name: 'header',
                     forType: headerType,
                     eventName: 'bound',
                     execute: (
                        component: IWebComponentElement<IWebComponentController>
                     ) => {
                        return component.element.shadowRoot.innerHTML.trim();
                     },
                  },
                  {
                     name: 'content',
                     eventName: 'bound',
                     forType: contentType,
                     execute: (
                        component: IWebComponentElement<IWebComponentController>
                     ) => {
                        return component.element.shadowRoot.innerHTML.trim();
                     },
                  },
               ],
               `
            <my-app>
                <my-panel>
                    <my-header slot="header" header.oneway="header">
                    </my-header>
                    <my-content slot="content" content.oneway="content">
                    </my-content>
                </my-panel>
            </my-app>`
            );

            const expected = {
               application:
                  '<my-panel><my-header slot="header" header.oneway="header"></my-header><my-content slot="content" content.oneway="content"></my-content></my-panel>',
               panel: '<my-header slot="header" header.oneway="header"></my-header><my-content slot="content" content.oneway="content"></my-content>',
               header: '<div>hi</div>',
               content: '<div>Robert</div>',
            };
            expect(actual).toEqual(expected);
         });
      });

      describe('events', () => {
         it('Binding to custom events', async () => {
            const result = await waitForCustomElementEvent(
               [
                  {
                     name: 'contentElement',
                     eventName: 'bound',
                     forType: contentType,
                     execute: (
                        component: IWebComponentElement<IWebComponentController>
                     ) => {
                        return component;
                     },
                  },
               ],
               `
               <my-app >
                     <my-panel>
                        <my-content sayHi.on="handleSayHi($sender, $event, 'How are you?')" slot="content" content.oneway="content">
                        </my-content>
                     </my-panel>
               </my-app>`
            );

            const applicationElement = getElement<IMyApplication>('my-app');

            const handleSayHiSpy = jest.spyOn(
               applicationElement.customElement,
               'handleSayHi'
            );

            const actual = await waitForEvent(
               eventObserver,
               'eventHandled',
               () => result.contentElement.sayHi.next('Hi Robert')
            );

            expect(actual).toEqual({
               eventArgs: 'Hi Robert',
               eventName: 'sayhi',
               result: 'hi',
               sender: result.contentElement.element,
            });

            expect(handleSayHiSpy).toHaveBeenCalledTimes(1);
            expect(handleSayHiSpy).toHaveBeenCalledWith(
               result.contentElement.element,
               'Hi Robert',
               'How are you?'
            );
         });

         it('Binding to html events', async () => {
            const result = await waitForCustomElementEvent(
               [
                  {
                     name: 'application',
                     eventName: 'bound',
                     forType: applicationType,
                  },
                  {
                     name: 'contentElement',
                     eventName: 'bound',
                     forType: contentType,
                  },
               ],
               `
               <my-app >
                     <my-panel>
                        <my-content click.on="handleSayHi($sender, $event, 'How are you?')" slot="content" content.oneway="content">
                        </my-content>
                     </my-panel>
               </my-app>`
            );

            const handleSayHiSpy = jest.spyOn(
               result.application,
               'handleSayHi'
            );

            const actual = await waitForEvent(
               eventObserver,
               'eventHandled',
               () => {
                  const event = new Event('click');
                  result.contentElement.element.dispatchEvent(event);
               }
            );

            expect(actual).toEqual({
               eventArgs: expect.any(Event),
               eventName: 'click',
               result: 'hi',
               sender: result.contentElement.element,
            });

            expect(handleSayHiSpy).toHaveBeenCalledTimes(1);
            expect(handleSayHiSpy).toHaveBeenCalledWith(
               result.contentElement.element,
               expect.any(Event),
               'How are you?'
            );
         });
      });
   });

   describe('without slots', () => {
      describe('initializing bindings', () => {
         it('one-time binding will be initialized', async () => {
            const actual = await waitForCustomElementEvent(
               [
                  {
                     name: 'header',
                     forType: headerType,
                     eventName: 'bound',
                     execute: (
                        component: IWebComponentElement<IWebComponentController>
                     ) => {
                        return component.element.shadowRoot.innerHTML.trim();
                     },
                  },
               ],
               `<without-slots ></without-slots>`
            );

            const expected = {
               header: '<div>Fairytale</div>',
            };
            expect(actual).toEqual(expected);
         });

         it('one-way binding will be initialized', async () => {
            const result = await waitForCustomElementEvent(
               [
                  {
                     name: 'content',
                     forType: contentType,
                     eventName: 'bound',
                     execute: (
                        component: IWebComponentElement<IWebComponentController>
                     ) => {
                        return component;
                     },
                  },
               ],
               `<without-slots ></without-slots>`
            );

            expect(result.content.content).toEqual('Once upon a time...');
         });

         it('two-way binding will be initialized', async () => {
            const actual = await waitForCustomElementEvent(
               [
                  {
                     name: 'input',
                     forType: withoutSlotsType,
                     eventName: 'bound',
                     execute: (
                        component: IWebComponentElement<IWebComponentController>
                     ) => {
                        return component.element.shadowRoot.querySelector(
                           'input'
                        );
                     },
                  },
               ],
               `<without-slots ></without-slots>`
            );

            expect(actual.input.value).toEqual('use your imagination');
         });

         it('text binding binding will be initialized', async () => {
            const actual = await waitForCustomElementEvent(
               [
                  {
                     name: 'cellWithTextContent',
                     forType: withoutSlotsType,
                     eventName: 'bound',
                     execute: (
                        component: IWebComponentElement<IWebComponentController>
                     ) =>
                        component.element.shadowRoot.querySelector(
                           '#cellWithText'
                        ).outerHTML,
                  },
                  {
                     name: 'content',
                     forType: contentType,
                     eventName: 'bound',
                     execute: (
                        component: IWebComponentElement<IWebComponentController>
                     ) => component.element.shadowRoot.innerHTML,
                  },
               ],

               `<without-slots ></without-slots>`
            );

            const expected = {
               cellWithTextContent:
                  '<td id="cellWithText">Once upon a time...</td>',
               content: '<div>Once upon a time...</div>',
            };
            expect(actual).toEqual(expected);
         });
      });

      describe('events', () => {
         it('Binding to custom events', async () => {
            const result = await waitForCustomElementEvent(
               [
                  {
                     name: 'withoutSLots',
                     eventName: 'bound',
                     forType: withoutSlotsType,
                  },

                  {
                     name: 'content',
                     eventName: 'bound',
                     forType: contentType,
                  },
               ],
               `<without-slots ></without-slots>`
            );

            const withoutSLots: IWithoutSlots = result.withoutSLots;
            const handleSayHiSpy = jest.spyOn(withoutSLots, 'handleSayHi');

            const actual = await waitForEvent(
               eventObserver,
               'eventHandled',
               () => result.content.sayHi.next('Hi Robert')
            );

            expect(actual).toEqual({
               eventArgs: 'Hi Robert',
               eventName: 'sayhi',
               result: 'hi',
               sender: result.content.element,
            });

            expect(handleSayHiSpy).toHaveBeenCalledTimes(1);
            expect(handleSayHiSpy).toHaveBeenCalledWith(
               result.content.element,
               'Hi Robert',
               'How are you?'
            );
         });

         it('Binding to html events', async () => {
            const result = await waitForCustomElementEvent(
               [
                  {
                     name: 'withoutSLots',
                     eventName: 'bound',
                     forType: withoutSlotsType,
                  },

                  {
                     name: 'content',
                     eventName: 'bound',
                     forType: contentType,
                  },
               ],
               `<without-slots ></without-slots>`
            );

            const handleSayHiSpy = jest.spyOn(
               result.withoutSLots,
               'handleSayHi'
            );

            const actual = await waitForEvent(
               eventObserver,
               'eventHandled',
               () => {
                  const event = new Event('click');
                  result.content.element.dispatchEvent(event);
               }
            );

            expect(actual).toEqual({
               eventArgs: expect.any(Event),
               eventName: 'click',
               result: 'hi',
               sender: result.content.element,
            });
            expect(handleSayHiSpy).toHaveBeenCalledTimes(1);
            expect(handleSayHiSpy).toHaveBeenCalledWith(
               result.content.element,
               expect.any(Event),
               'How are you?'
            );
         });
      });
   });

   describe('set attribute', () => {
      it('setting a attribute that reflect its value to corresponding property  will throw an error when is data bound', async () => {
         const result = await waitForCustomElementEvent(
            [
               {
                  name: 'content',
                  eventName: 'bound',
                  forType: contentType,
               },
            ],
            `
        <my-app >
            <my-panel>
                <my-content slot="content" content.oneway="content">
                </my-content>
            </my-panel>
        </my-app>`
         );
         const errorLog = InjectionContainer.get<IErrorLog>(
            RsXCoreInjectionTokens.IErrorLog
         );

         const actual: IError = await waitForEvent(errorLog, 'error', () =>
            result.content.element.setAttribute('content', 'hi')
         );

         expect(actual).toEqual({
            message: 'attributeChangedCallback failed for attribute content',
            context: result.content.element,
            exception: new InvalidOperationException(
               `Can't set attribute content for custom element MY-CONTENT from ''Robert'' to 'hi' because it is data bound`
            ),
         });
      });

      it('setting a attribute that reflect its value to corresponding property will update the property if not data bound', async () => {
         const result = await waitForCustomElementEvent(
            [
               {
                  name: 'content',
                  eventName: 'bound',
                  forType: contentType,
               },
            ],
            '<my-content></my-content>'
         );

         const actual = await waitForEvent(
            result.content,
            'attributeReflected',
            () => result.content.element.setAttribute('content', 'hi')
         );

         expect(actual).toEqual({
            attributeName: 'content',
            newPropertyValue: 'hi',
            newValue: 'hi',
            oldValue: null,
            propertyName: 'content',
         });
         expect(result.content.content).toEqual('hi');
      });
   });

   function rebind(
      action: () => void,
      component: IWebComponentElement<IWebComponentController>
   ): Promise<boolean> {
      return new Promise((resolve) => {
         const timerId = window.setTimeout(() => {
            subscription.unsubscribe();
            resolve(false);
         }, 1000);
         const subscription = component.bound.subscribe(() => {
            window.clearTimeout(timerId);
            subscription.unsubscribe();
            resolve(true);
         });
         action();
      });
   }
});
