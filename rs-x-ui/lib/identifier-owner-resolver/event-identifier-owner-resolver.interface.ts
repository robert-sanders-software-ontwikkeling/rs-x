import { IIdentifierOwnerResolver } from '@rs-x/expression-parser';


export interface IEventIdentifierOwnerResolver
   extends IIdentifierOwnerResolver {
   $sender: unknown;
   $event: unknown;
}
