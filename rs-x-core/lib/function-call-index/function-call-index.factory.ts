import { Inject, Injectable } from '../dependency-injection';
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
      return this._sequenceIdFactory.get(data.context, data.arguments)
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
      return this._sequenceIdFactory.create(data.context[data.functionName], data.arguments);
   }

   protected override releaseInstance(_: IDisposableFunctionCallIndex, id: ISequenceWithId): void {
      id.dispose();
   }
}