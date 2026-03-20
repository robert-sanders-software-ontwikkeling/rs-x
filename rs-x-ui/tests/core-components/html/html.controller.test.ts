import { Type } from '@rs-x/core';
import {
   ObservableMock,
} from '@rs-x/core/testing';
import { createHTMLElementMock, HTMLElementMock } from '../../../lib/testing/html-element.mock';
import { createHTMLTemplateElementMock, HTMLTemplateElementMock } from '../../../lib/testing/html-template-element.mock';
import { HTMLParserMock } from '../../../../rs-x-dom/lib/testing/html-parser.mock';
import { HtmlController } from '../../../lib/core-components/html/html.controller';
import { CustomElementCoreServicesMock } from '../../../lib/testing/custom-element-core-services.mock';
import { CustomElementMock } from '../../../lib/testing/custom-element.mock';
import { ICustomElementControllerPrivate } from '../../../lib/testing/private/custom-element-controller-private.interface';

describe('Html directive controller', () => {
   const html = '<span>hello</span>';
   let template: HTMLTemplateElementMock;
   let htmlParser: HTMLParserMock;
   let customElementCoreServicesMock: CustomElementCoreServicesMock;
   let customElement: CustomElementMock;
   let controller: HtmlController;
   let parsedHtml: HTMLElementMock[];
   let bindingObservable: ObservableMock;

   beforeEach(() => {
      template = createTemplate();
      parsedHtml = [createHTMLElementMock(), createHTMLElementMock()];
      htmlParser = new HTMLParserMock(parsedHtml);
      customElement = new CustomElementMock<HtmlController>(template);
      customElementCoreServicesMock = new CustomElementCoreServicesMock(
         template,
         customElement
      );
      bindingObservable = new ObservableMock();
      customElementCoreServicesMock.bindingManager.attachBindings.mockReturnValue(
         bindingObservable
      );
      controller = new HtmlController(
         customElementCoreServicesMock,
         htmlParser
      );
   });

   it('Setting html will parse html and set it as content', () => {
      controller.html = html;

      expect(htmlParser.parse).toHaveBeenCalledTimes(1);
      expect(htmlParser.parse).toHaveBeenCalledWith(html);
      expect(controller.content).toBe(parsedHtml);
   });

   it('Setting html will dispose old content', () => {
      const disposeContentSpy = jest.spyOn(
         Type.cast<ICustomElementControllerPrivate>(controller),
         'disposeContent'
      );

      controller.html = html;

      expect(disposeContentSpy).toHaveBeenCalledTimes(1);
   });

   it('Setting html will not update content if not attached', () => {
      const updateContentSpy = jest.spyOn(
         Type.cast<ICustomElementControllerPrivate>(controller),
         'updateContent'
      );

      controller.html = html;

      expect(updateContentSpy).not.toHaveBeenCalled();
   });

   it('Setting html will update content if  attached', () => {
      const updateContentSpy = jest.spyOn(
         Type.cast<ICustomElementControllerPrivate>(controller),
         'updateContent'
      );

      controller.attach();
      controller.html = html;

      expect(updateContentSpy).toHaveBeenCalledTimes(1);
   });

   it('Parsed html elements will be inserted after the template element', () => {
      controller.attach();
      controller.html = html;

      expect(template.before).toHaveBeenCalledTimes(2);
      expect(template.before).toHaveBeenNthCalledWith(1, parsedHtml[0]);
      expect(template.before).toHaveBeenNthCalledWith(2, parsedHtml[1]);
   });

   it('Setting html elements will bind data', () => {
      controller.attach();
      customElementCoreServicesMock.bindingManager.attachBindings.mockClear();
      controller.html = html;

      expect(
         customElementCoreServicesMock.bindingManager.attachBindings
      ).toHaveBeenCalledTimes(1);

      expect(
         customElementCoreServicesMock.bindingManager.attachBindings
      ).toHaveBeenCalledWith(parsedHtml);
      expect(bindingObservable.subscribe).toHaveBeenCalledTimes(1);
   });

   it('Setting html elements will bind events', () => {
      controller.attach();
      customElementCoreServicesMock.eventManager.bindEvents.mockClear();
      controller.html = html;

      expect(
         customElementCoreServicesMock.eventManager.bindEvents
      ).toHaveBeenCalledTimes(1);
      expect(
         customElementCoreServicesMock.eventManager.bindEvents
      ).toHaveBeenCalledWith(parsedHtml);
   });

   function createTemplate(): HTMLTemplateElementMock {
      const template = createHTMLTemplateElementMock();
      template.parentElement = createHTMLElementMock();
      return template;
   }
});
