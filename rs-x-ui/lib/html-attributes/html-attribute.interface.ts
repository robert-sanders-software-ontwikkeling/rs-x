export interface IHtmlAttribute {
   attributeName: string;
   propertyKey: string;
   toString: (value: unknown) => unknown;
   fromString: (value: string) => unknown;
}
