import { createHTMLElementMock, HTMLElementMock } from '../../lib/testing/html-element.mock';
import { createShadowRootMock } from '../../lib/testing/shadow-root.mock';
import { Subject } from 'rxjs';
import { WebComponentCoreServicesMock } from '../../lib/testing/web-component-core-services.mock';
import { CustomElementController } from '../../lib/web-component/custom-element-controller';
import { ICustomElement } from '../../lib/web-component/interfaces';
import { WebComponentController } from '../../lib/web-component/web-component-controller';

describe('Web component controller tests', () => {
   let webComponentController: WebComponentController;
   let webComponentControllerWithoutShadowRoot: WebComponentController;
   let element: HTMLElementMock;
   let elementWithoutShadowRoot: HTMLElement;
   let customElement: ICustomElement<WebComponentController>;
   let webComponentCoreServices: WebComponentCoreServicesMock;
   let webComponentWithoutShadowRootCoreServices: WebComponentCoreServicesMock;

   beforeEach(() => {
      customElement = {} as never;
      element = createHTMLElementMock({ shadowRoot: createShadowRootMock() });
      elementWithoutShadowRoot = createHTMLElementMock();

      webComponentCoreServices = new WebComponentCoreServicesMock(
         element,
         customElement,
         ['.style1 {background-color:gray;}', '.style2 {color:white;}']
      );
      webComponentController = new WebComponentController(
         webComponentCoreServices
      );

      webComponentWithoutShadowRootCoreServices =
         new WebComponentCoreServicesMock(
            elementWithoutShadowRoot,
            customElement,
            ['.style1 {background-color:gray;}', '.style2 {color:white;}']
         );
      webComponentControllerWithoutShadowRoot = new WebComponentController(
         webComponentWithoutShadowRootCoreServices
      );
   });

   it('parent for custom element with shadow root will be resolved correctly', () => {
      const expectedParent = {} as unknown as Element;
      const getParentSpy = jest
         .spyOn(webComponentCoreServices.domQuery, 'getParent')
         .mockReturnValue(expectedParent);

      const actualParent = webComponentController.parent;
      expect(actualParent).toBe(expectedParent);
      expect(getParentSpy).toHaveBeenCalledTimes(1);
      expect(getParentSpy).toHaveBeenNthCalledWith(1, element.shadowRoot.host);
   });

   it('parent for custom element without shadow root will be resolved correctly', () => {
      const expectedParent = {} as unknown as Element;
      const getParentSpy = jest
         .spyOn(webComponentWithoutShadowRootCoreServices.domQuery, 'getParent')
         .mockReturnValue(expectedParent);
      const actualParent = webComponentControllerWithoutShadowRoot.parent;
      expect(actualParent).toBe(expectedParent);
      expect(getParentSpy).toHaveBeenCalledTimes(1);
      expect(getParentSpy).toHaveBeenNthCalledWith(1, elementWithoutShadowRoot);
   });

   it('parent will be cached', () => {
      const expectedParent = {} as unknown as Element;
      const getParentSpy = jest
         .spyOn(webComponentCoreServices.domQuery, 'getParent')
         .mockReturnValue(expectedParent);

      const actualParent1 = webComponentController.parent;
      const actualParent2 = webComponentController.parent;

      expect(actualParent1).toBe(expectedParent);
      expect(actualParent2).toBe(expectedParent);
      expect(getParentSpy).toHaveBeenCalledTimes(1);
   });

   it('contentContainerElement will return shadow root when element has shadow root', () => {
      expect((webComponentController as any).contentContainerElement).toBe(
         element.shadowRoot
      );
   });

   it('contentContainerElement will return element when element has no shadow root', () => {
      expect(
         (webComponentControllerWithoutShadowRoot as any)
            .contentContainerElement
      ).toBe(elementWithoutShadowRoot);
   });

   it('the nodes returned from build content will be added add to the content container', () => {
      const content = [{}, {}] as unknown as Element[];
      jest
         .spyOn(webComponentCoreServices.templateBuilder, 'buildContent')
         .mockReturnValue(content);
      const contentContainerElement = (webComponentController as any)
         .contentContainerElement;
      const appendChildSpy = jest.spyOn(contentContainerElement, 'appendChild');
      webComponentController.buildContent();

      expect(appendChildSpy).toHaveBeenCalledTimes(2);
      expect(appendChildSpy).toHaveBeenNthCalledWith(1, content[0]);
      expect(appendChildSpy).toHaveBeenNthCalledWith(2, content[1]);
   });

   it('buildContent will start watching for change on slots', () => {
      const content: any[] = [
         { nodeType: Node.ELEMENT_NODE },
         { nodeType: Node.ELEMENT_NODE },
      ];

      const startWatchingSpy = jest.spyOn(
         webComponentCoreServices.slotChangeObserver,
         'startWatching'
      );
      webComponentCoreServices.templateBuilder.buildContent.mockReturnValue(
         content
      );

      webComponentController.buildContent();

      expect(startWatchingSpy).toHaveBeenCalledTimes(1);
      expect(startWatchingSpy).toHaveBeenCalledWith(content);
   });

   it('attach will call super.attach', () => {
      const superAttachSpy = jest.spyOn(
         CustomElementController.prototype,
         'attach'
      );
      webComponentController.attach();
      expect(superAttachSpy).toHaveBeenCalledTimes(1);
      superAttachSpy.mockRestore();
   });

   it('calling attach will when already attached will do nothing', () => {
      const superAttachSpy = jest.spyOn(
         CustomElementController.prototype,
         'attach'
      );
      webComponentController.attach();
      webComponentController.attach();
      expect(superAttachSpy).toHaveBeenCalledTimes(1);
      superAttachSpy.mockRestore();
   });

   it('attach will create style', () => {
      const styleElements: any[] = [{}, {}];

      const componentStyle = {
         id: 'componentStyle',
         nextSibling: styleElements[1],
         textContent:
            ':host(.invisible) { display:none;}' +
            '.style1 {background-color:gray;}' +
            '.style2 {color:white;}',
      };
      const themeStyle = {
         id: 'theme',
         textContent: '.blue {background-color:blue};',
      };
      styleElements[0].nextSibling = styleElements[1];
      const createElementSpy = jest
         .spyOn(document, 'createElement')
         .mockReturnValueOnce(styleElements[0])
         .mockReturnValueOnce(styleElements[1]);
      jest
         .spyOn(element.shadowRoot, 'querySelectorAll')
         .mockReturnValueOnce([] as any)
         .mockReturnValueOnce([styleElements[0]] as any);
      jest.spyOn(element.shadowRoot, 'insertBefore');
      const getComponentThemeSpy = jest
         .spyOn(webComponentCoreServices.themeManager, 'getComponentTheme')
         .mockReturnValue('.blue {background-color:blue};');
      jest.spyOn(element.shadowRoot, 'querySelector').mockReturnValue(null);

      webComponentController.attach();

      expect(createElementSpy).toHaveBeenCalledTimes(2);
      expect(getComponentThemeSpy).toHaveBeenCalledTimes(1);
      expect(getComponentThemeSpy).toHaveBeenNthCalledWith(
         1,
         customElement.constructor
      );
      expect(styleElements).toEqual([componentStyle, themeStyle]);

      createElementSpy.mockRestore();
   });

   it('attach will subscribe to change event for theme manager', () => {
      const subsribeSpy = jest.spyOn(
         webComponentCoreServices.themeManager.themeChanged,
         'subscribe'
      );
      webComponentController.attach();
      expect(subsribeSpy).toHaveBeenCalledTimes(1);
   });

   it('detach will call super.detach', () => {
      const superDetachSpy = jest.spyOn(
         CustomElementController.prototype,
         'detach'
      );
      webComponentController.attach();
      webComponentController.detach();
      expect(superDetachSpy).toHaveBeenCalledTimes(1);
      superDetachSpy.mockRestore();
   });

   it('call detach will when already detached will do nothing', () => {
      const superDetachSpy = jest.spyOn(
         CustomElementController.prototype,
         'detach'
      );
      webComponentController.detach();
      expect(superDetachSpy).toHaveBeenCalledTimes(0);
      superDetachSpy.mockRestore();
   });

   it('detach will stop watching for slot changes', () => {
      const subsribeSpy = jest.spyOn(
         webComponentCoreServices.slotChangeObserver,
         'stopWatching'
      );
      webComponentController.attach();
      webComponentController.detach();
      expect(subsribeSpy).toHaveBeenCalledTimes(1);
   });

   it('detach will unsubscribe to change event for theme manager', () => {
      const subscription: any = {
         unsubscribe: jest.fn(),
      };
      const unsubscribeSpy = jest.spyOn(subscription, 'unsubscribe');
      jest
         .spyOn(webComponentCoreServices.themeManager.themeChanged, 'subscribe')
         .mockReturnValue(subscription);

      webComponentController.attach();
      webComponentController.detach();
      expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
   });

   it('detach will stop tracking resizing', () => {
      const stopTrackResizingSpy = jest.spyOn(
         webComponentController,
         'stopTrackResizing'
      );
      webComponentController.attach();
      webComponentController.detach();
      expect(stopTrackResizingSpy).toHaveBeenCalledTimes(1);
   });

   it('emit theme change event will update component theme style', () => {
      const styleElements: any[] = [{}, {}];
      const createElementSpy = jest
         .spyOn(document, 'createElement')
         .mockReturnValueOnce(styleElements[0])
         .mockReturnValueOnce(styleElements[1]);
      jest
         .spyOn(webComponentCoreServices.themeManager, 'getComponentTheme')
         .mockReturnValueOnce('.blue {background-color:blue};')
         .mockReturnValueOnce('.red {background-color:red};');
      webComponentController.attach();

      (
         webComponentCoreServices.themeManager
            .themeChanged as unknown as Subject<void>
      ).next();

      expect(styleElements[1]).toEqual({
         id: 'theme',
         textContent: '.red {background-color:red};',
      });
      createElementSpy.mockRestore();
   });

   it('startTrackResizing will start resize tracking', () => {
      const observeSpy = jest.spyOn(
         webComponentCoreServices.resizeObserverService,
         'observe'
      );
      const subscribeSpy = jest.spyOn(
         webComponentCoreServices.resizeObserverService.resized,
         'subscribe'
      );

      webComponentController.startTrackResizing();
      expect(observeSpy).toHaveBeenCalledTimes(1);
      expect(subscribeSpy).toHaveBeenCalledTimes(1);
      expect(observeSpy).toHaveBeenNthCalledWith(1, element);
   });

   it('stopTrackResizing will stop resize tracking', () => {
      const subscription: any = {
         unsubscribe: jest.fn(),
      };
      jest
         .spyOn(
            webComponentCoreServices.resizeObserverService.resized,
            'subscribe'
         )
         .mockReturnValue(subscription);
      const unsubscribeSpy = jest.spyOn(subscription, 'unsubscribe');
      const unobserveSpy = jest.spyOn(
         webComponentCoreServices.resizeObserverService,
         'unobserve'
      );

      webComponentController.startTrackResizing();
      webComponentController.stopTrackResizing();

      expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
      expect(unobserveSpy).toHaveBeenCalledTimes(1);
      expect(unobserveSpy).toHaveBeenNthCalledWith(1, element);
   });

   it('detach will clear view childs', () => {
      const clearViewChildrenSpy = jest.spyOn(
         webComponentCoreServices.viewChildContext,
         'clearViewChildren'
      );

      webComponentController.attach();
      webComponentController.detach();

      expect(clearViewChildrenSpy).toHaveBeenCalledTimes(1);
      expect(clearViewChildrenSpy).toHaveBeenCalledWith(webComponentController);
   });
});
