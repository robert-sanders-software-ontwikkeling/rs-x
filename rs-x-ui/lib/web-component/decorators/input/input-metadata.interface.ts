export interface IInputMetadata {
   attributeName: string;
   propertyKey: string;
   reflectToAttribute?: boolean;
   defaultValue?: unknown;
   rebuildContentOnChange?: boolean;
   isAttributeBinding?: boolean;
   watchExpression?: string;
   fromString?: <T>(value: string) => T;
   valueToString?: <T>(value: T) => string;
}
