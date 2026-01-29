import { Inject, Injectable, PreDestroy } from '../dependency-injection';
import type { IGuidFactory } from '../guid/guid.factory.interface';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';
import { type IDisposableOwner, SingletonFactory } from '../singleton-factory';

import type { ISequenceIdFactory, ISequenceWithId } from './sequence-id-factory.interface';

class RegistryNode {
    public readonly children = new Map<unknown, RegistryNode>();
    public id?: string;
}

export class SequenceWithId implements ISequenceWithId {
    private _isDisposed = false;

    constructor(
        public readonly id: string,
        public readonly sequence: readonly unknown[],
        private readonly _owner: IDisposableOwner
    ) {
    }

    public dispose(): void {
        if (this._isDisposed) {
            return;
        }

        if (this._owner.canDispose?.()) {
            this._isDisposed = true;
        }

        this._owner.release();
    }
}

class ValueSequenceIdRegistry {
    private readonly _root = new RegistryNode();
    private readonly _idToSequence = new Map<string, unknown[]>();

    constructor(private readonly _guidFactory: IGuidFactory) { }

    public getId(sequence: readonly unknown[]): { isNew: boolean, id: string } {
        let node = this._root;

        for (const value of sequence) {
            let next = node.children.get(value);
            if (!next) {

                next = new RegistryNode();
                node.children.set(value, next);
            }
            node = next;
        }

        let isNew = !node.id;
        if (isNew) {
            node.id = this._guidFactory.create();
            this._idToSequence.set(node.id, [...sequence]);
        }

        return { isNew, id: node.id as string };
    }

    public deleteId(id: string): void {
        const sequence = this.getSequence(id);
        if (!sequence) {
            return;
        }

        const stack: { node: RegistryNode; value: unknown }[] = [];

        let node = this._root;

        for (const value of sequence) {
            const next = node.children.get(value);
            if (!next) {
                this._idToSequence.delete(id);
                return;
            }

            stack.push({ node, value });
            node = next;
        }

        delete node.id;

        for (let i = stack.length - 1; i >= 0; i--) {
            const { node: parent, value } = stack[i];
            const child = parent.children.get(value)!;

            if (child.children.size === 0 && !child.id) {
                parent.children.delete(value);
            } else {
                break;
            }
        }

        this._idToSequence.delete(id);
    }

    public getSequence(id: string): readonly unknown[] | undefined {
        return this._idToSequence.get(id);
    }

    public hasSequence(id: string): boolean {
        return this._idToSequence.has(id);
    }
}

class ValueSequenceIdsForContext
    extends SingletonFactory<string, unknown[], ISequenceWithId> {

    private readonly _valueSequenceIdRegistry: ValueSequenceIdRegistry;
    constructor(
        public readonly context: unknown,
        private readonly _guidFactory: IGuidFactory,
        private readonly releaseContext: () => void
    ) {
        super();

        this._valueSequenceIdRegistry = new ValueSequenceIdRegistry(this._guidFactory);
    }

    public override getId(sequence: unknown[]): string {
        return this.createId(sequence);
    }

    protected override createInstance(sequence: unknown[], id: string): ISequenceWithId {
        return new SequenceWithId(
            id,
            sequence,
            {
                canDispose: () => this.getReferenceCount(id) === 1,
                release: () => this.release(id)
            }
        );
    }

    protected override createId(sequence: unknown[]): string {
        return this._valueSequenceIdRegistry.getId(sequence).id;
    }   

    protected override releaseInstance(_: ISequenceWithId, id: string): void {
        this._valueSequenceIdRegistry.deleteId(id);
    }

    protected override onReleased(): void {
        this.releaseContext();
    }
}

class ValueSequenceIdRegistryManager
    extends SingletonFactory<unknown, unknown, ValueSequenceIdsForContext> {

    constructor(private readonly _guidFactory: IGuidFactory) {
        super();
    }

    public override getId(context: unknown): unknown {
        return context;
    }

    protected override createInstance(context: unknown, id: unknown): ValueSequenceIdsForContext {
        return new ValueSequenceIdsForContext(context, this._guidFactory, () => this.release(id));
    }


    public override releaseInstance(instance: ValueSequenceIdsForContext, _id: unknown): void {
        instance.dispose();
    }

    protected override createId(context: unknown): unknown {
        return context;
    }
}

@Injectable()
export class SequenceIdFactory implements ISequenceIdFactory {
    private readonly _valueSequenceIdRegistryManager: ValueSequenceIdRegistryManager;

    constructor(
        @Inject(RsXCoreInjectionTokens.IGuidFactory)
        guidFactory: IGuidFactory,
    ) {
        this._valueSequenceIdRegistryManager = new ValueSequenceIdRegistryManager(guidFactory);
    }


    @PreDestroy()
    public dispose(): void {
        this._valueSequenceIdRegistryManager.dispose();
    }

    public create(context: unknown, sequence: unknown[]): ISequenceWithId {
        return this._valueSequenceIdRegistryManager.create(context).instance.create(sequence).instance;
    }

    public release(context: unknown, id: string): void {
        this._valueSequenceIdRegistryManager.getFromId(context)?.release(id);
    }

    public get(context: unknown, sequence: unknown[]): ISequenceWithId | undefined {
        return this._valueSequenceIdRegistryManager.getFromId(context)?.getFromData(sequence);
    }

    public has(context: unknown, id: string): boolean {
        return !!this._valueSequenceIdRegistryManager.getFromId(context)?.has(id);
    }
}