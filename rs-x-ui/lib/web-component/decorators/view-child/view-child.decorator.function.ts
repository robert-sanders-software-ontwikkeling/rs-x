import {
   WebComponentControllerConstructor,
   WebComponentElementConstructor,
} from '../../interfaces';
import { ViewChildDecorator } from './view-child.decorator';

type ViewChildInstance =
   | InstanceType<WebComponentElementConstructor>
   | InstanceType<WebComponentControllerConstructor>;

type TypedPropertyDecorator<T extends object> = (
   target: T,
   propertyKey: string | symbol
) => void;

export function ViewChild(name: string): TypedPropertyDecorator<ViewChildInstance> {
   return (target, propertyKey): void => {
      ViewChildDecorator.instance.decorate(target, propertyKey, undefined, name);
   };
}