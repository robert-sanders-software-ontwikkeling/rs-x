import { IDirectiveMetadata } from './directive-metadata.interface';
import { DirectiveDecorator } from './directive.decorator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Directive(directiveMetadata: IDirectiveMetadata) {
   return (_constructor: new (...args: any[]) => unknown) => {
      DirectiveDecorator.instance.decorate(directiveMetadata);
   };
}
