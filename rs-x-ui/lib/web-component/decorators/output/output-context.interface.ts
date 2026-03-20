import { Subscription } from 'rxjs';
import { IOutputMetadata } from './output-metadata.interface';
import { Listner } from '../../event-manager/listner.type';

export interface IOutputContext {
   getOutputs(object: unknown): IOutputMetadata[];
   getOutputInfo(
      object: unknown,
      eventProperyName: PropertyKey
   ): IOutputMetadata | undefined;
   isOutput(object: unknown, name: PropertyKey): boolean;
   emitEvent(object: unknown, eventName: string, args?: unknown): void;
   subscribeToEvent(
      target: unknown,
      eventName: string,
      handler: Listner
   ): Subscription;
}
