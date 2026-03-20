import { of } from 'rxjs';
import { BindingContextMock } from '../../../lib/testing/binding/binding-context.mock';
import { createElementMock } from '../../../lib/testing/element.mock';
import { createNodeMock } from '../../../lib/testing/node.mock';
import { BindingQueue } from '../../../lib/web-component/binding/binding-queue';

describe('Binding queue tests', () => {
   let bindingQueue: BindingQueue;
   let bindingConttext1: BindingContextMock;
   let bindingConttext2: BindingContextMock;

   beforeEach(() => {
      bindingConttext1 = new BindingContextMock({
         content: [
            createNodeMock({ nodeType: Node.TEXT_NODE, textContent: 'hi 1' }),
         ],
         eventElements: [createElementMock()],
      });

      bindingConttext1.bindingManager.attachBindings.mockReturnValue(
         of([
            {
               expression: 'a',
               newValue: 1,
               oldValue: 2,
            },
         ])
      );

      bindingConttext2 = new BindingContextMock({
         content: [
            createNodeMock({ nodeType: Node.TEXT_NODE, textContent: 'hi 2' }),
         ],
         eventElements: [createElementMock()],
      });

      bindingConttext2.bindingManager.attachBindings.mockReturnValue(
         of([
            {
               expression: 'b',
               newValue: 3,
               oldValue: 4,
            },
         ])
      );
      bindingQueue = new BindingQueue();

      bindingQueue.push(bindingConttext1);
      bindingQueue.push(bindingConttext2);
   });

   it('will attach all binding ',  () => {
      bindingQueue.bind();

      expect(
         bindingConttext1.bindingManager.attachBindings
      ).toHaveBeenCalledTimes(1);
      expect(
         bindingConttext1.bindingManager.attachBindings
      ).toHaveBeenCalledWith(bindingConttext1.content);

      expect(
         bindingConttext2.bindingManager.attachBindings
      ).toHaveBeenCalledTimes(1);
      expect(
         bindingConttext2.bindingManager.attachBindings
      ).toHaveBeenCalledWith(bindingConttext2.content);
   });

   it('will bind all events ', () => {
      bindingQueue.bind()

      expect(bindingConttext1.eventManager.bindEvents).toHaveBeenCalledTimes(1);
      expect(bindingConttext1.eventManager.bindEvents).toHaveBeenCalledWith(
         bindingConttext1.eventElements
      );

      expect(bindingConttext2.eventManager.bindEvents).toHaveBeenCalledTimes(1);
      expect(bindingConttext2.eventManager.bindEvents).toHaveBeenCalledWith(
         bindingConttext2.eventElements
      );
   });
});
