import { Inject, Injectable } from '../dependency-injection';
import { ArgumentException } from '../exceptions';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';
import type { IISequenceWithIdData, ISequenceIdFactory, ISequenceWithId } from '../sequence-id/sequence-id-factory.interface';
import { SingletonFactory } from '../singleton-factory/singleton.factory';
import { FunctionCallIndex } from './function-call-index';
import type { IDisposableFunctionCallIndex, IFunctionCallIndexData } from './function-call-index.interface';

@Injectable()
export class FunctionCallIndexFactory
   extends SingletonFactory<IISequenceWithIdData, IFunctionCallIndexData, IDisposableFunctionCallIndex> {
   constructor(
      @Inject(RsXCoreInjectionTokens.ISequenceIdFactory)
      private readonly _sequenceIdFactory: ISequenceIdFactory

   ) {
      super();
   }

   public getId(data: IFunctionCallIndexData): IISequenceWithIdData {
      return this._sequenceIdFactory.get(data.context, data.arguments) as IISequenceWithIdData
   }

   protected createInstance(data: IFunctionCallIndexData, id: ISequenceWithId): IDisposableFunctionCallIndex {
      return new FunctionCallIndex(
         data.context,
         data.functionName, id, {
         canDispose: () => this.getReferenceCount(id) === 1,
         release: () => this.release(id)
      });
   }

   protected createId(data: IFunctionCallIndexData): ISequenceWithId {
      const context = data.context;

      if (!context || typeof context !== 'object') {
         throw new ArgumentException(
            `Expected context to be an object, got ${String(context)}`
         );
      }

      const fn = (context as Record<string, unknown>)[data.functionName];

      return this._sequenceIdFactory.create(fn, data.arguments);
   }

   protected override releaseInstance(_: IDisposableFunctionCallIndex, id: ISequenceWithId): void {
      id.dispose();
   }
}