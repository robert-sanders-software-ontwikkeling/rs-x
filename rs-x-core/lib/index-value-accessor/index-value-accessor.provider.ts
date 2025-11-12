import { Inject, Injectable } from '../dependency-injection';
import { UnsupportedException } from '../exceptions/unsupported-exception';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';
import { IArrayIndexAccessor } from './array-index-accessor.type';
import { IIndexValueAccessor } from './index-value-accessor.interface';
import { IIndexValueAccessorProvider } from './index-value-accessor.provider.interface';
import { IMapKeyAccessor } from './map-key-accessor.type';
import { IMethodAccessor } from './method-accessor.type';
import { IObservableAccessor } from './observable-accessor.interface';
import { IPromiseAccessor } from './promise-accessor.interface';
import { IPropertyValueAccessor } from './property-value-accessor.type';
import { ISetKeyAccessor } from './set-key-accessor.type';

@Injectable()
export class IndexValueAccessorProvider implements IIndexValueAccessorProvider {
   private readonly _accessors: IIndexValueAccessor<unknown, unknown>[];

   constructor(
      @Inject(RsXCoreInjectionTokens.IPropertyValueAccessor)
      propertyValueAccessor: IPropertyValueAccessor,
      @Inject(RsXCoreInjectionTokens.IMethodAccessor)
      methodAccessor: IMethodAccessor,
      @Inject(RsXCoreInjectionTokens.IArrayIndexAccessor)
      arrayIndexAccessor: IArrayIndexAccessor,
      @Inject(RsXCoreInjectionTokens.IMapKeyAccessor)
      mapKeyAccessor: IMapKeyAccessor,
      @Inject(RsXCoreInjectionTokens.ISetKeyAccessor)
      setKeyAccessor: ISetKeyAccessor,
      @Inject(RsXCoreInjectionTokens.IObservableAccessor)
      observableAccessor: IObservableAccessor,
      @Inject(RsXCoreInjectionTokens.IPromiseAccessor)
      promiseAccessor: IPromiseAccessor
   ) {
      this._accessors = [
         propertyValueAccessor,
         methodAccessor,
         arrayIndexAccessor,
         mapKeyAccessor,
         setKeyAccessor,
         observableAccessor,
         promiseAccessor,
      ];
   }

   public get(
      context: unknown,
      index: unknown
   ): IIndexValueAccessor<unknown, unknown> {
      const accessor = this._accessors.find((accessor) =>
         accessor.applies(context, index)
      );

      if (!accessor) {
         throw new UnsupportedException(
            `No accessor found for ${context.constructor.name}.${index}`
         );
      }

      return accessor;
   }
}
