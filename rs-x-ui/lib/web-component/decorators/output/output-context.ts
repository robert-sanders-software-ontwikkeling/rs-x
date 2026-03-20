import { ArgumentException, Injectable } from '@rs-x/core';
import { Subscription } from 'rxjs';
import { IOutputContext } from './output-context.interface';
import { IOutputMetadata } from './output-metadata.interface';
import { outputKey } from './output.decorator.key';
import { Listner } from '../..';

@Injectable()
export class OutputContext implements IOutputContext {
   public getOutputs<T extends object>(object: T): IOutputMetadata[] {
      return object.constructor[outputKey];
   }

   public getOutputInfo<T extends object>(
      target: T,
      eventProperyName: PropertyKey
   ): IOutputMetadata | undefined {
      const outputs = this.getOutputs(target);
      return outputs
         ? outputs.find(
              (o) =>
                 o.propertyKey === eventProperyName ||
                 o.eventName === eventProperyName
           )
         : undefined;
   }

   public isOutput<T extends object>(target: T, name: PropertyKey): boolean {
      const outputs = this.getOutputs(target);
      return (
         outputs &&
         outputs.find((o) => o.eventName === name || o.propertyKey === name) !==
            undefined
      );
   }

   public emitEvent<T extends object>(
      target: T,
      eventName: string,
      eventArgs?: unknown
   ): void {
      const event = this.getOutputInfo(target, eventName);
      if (!event) {
         throw new ArgumentException(
            `No output found with event or property name '${eventName}'`
         );
      }
      target[event.propertyKey].next(eventArgs);
   }

   public subscribeToEvent<T extends object>(
      target: T,
      eventName: string,
      handler: Listner
   ): Subscription {
      const event = this.getOutputInfo(target, eventName);
      if (!event) {
         throw new ArgumentException(
            `No output found with event or property name '${eventName}'`
         );
      }
      return target[event.propertyKey].subscribe(handler);
   }
}
