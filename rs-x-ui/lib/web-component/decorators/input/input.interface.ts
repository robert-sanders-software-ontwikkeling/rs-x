export interface IInput {
   attributeName?: string;
   reflectToAttribute?: boolean;
   defaultValue?: unknown;
   observeAttribute?: boolean;
   rebuildContentOnChange?: boolean;
   fromString?: <T>(value: string) => T;
   valueToString?: <T>(value: T) => string;
   trim?: boolean;
   normalize?: <VT, RT>(value: VT) => RT;
   oneTimeOnly?: boolean;
}
