import { IInputMetadata } from '../web-component/decorators/input/input-metadata.interface';


export class InputMetadataMock implements IInputMetadata {
   constructor(properties?: Partial<IInputMetadata>) {
      Object.assign(this, properties);
   }

   public attributeName!: string;
   public propertyKey!: string;
   public reflectToAttribute?: boolean;
   public defaultValue?: unknown;
   public watchExpression?: string;
   public rebuildContentOnChange?: boolean;
   public isAttributeBinding?: boolean;
   public fromString!: <T>(value: string) => T;
   public valueToString?: <T>(value: T) => string;
}
