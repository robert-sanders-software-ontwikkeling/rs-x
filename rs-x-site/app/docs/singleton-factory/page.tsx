import dedent from 'dedent';
import Link from 'next/link';

import { ApiParameterList } from '../../../components/ApiParameterList';
import { SyntaxCodeBlock } from '../../../components/SyntaxCodeBlock';

export const metadata = {
  title: 'SingletonFactory',
  description:
    'Abstract reference-counted factory used by rs-x to create/reuse singleton instances per id.',
};

const apiCode = dedent`
  export abstract class SingletonFactory<
    TId,
    TData extends TIdData,
    TInstance,
    TIdData = TData,
  > implements ISingletonFactory<TId, TData, TInstance, TIdData> {
    create(data: TData): { referenceCount: number; instance: TInstance; id: TId };
    release(id: TId, force?: boolean): { referenceCount: number; instance: TInstance | null };
    getReferenceCount(id: TId): number;
    getOrCreate(data: TData): TInstance;
    getFromId(id: TId): TInstance | undefined;
    getFromData(data: TIdData): TInstance | undefined;

    protected abstract createInstance(data: TData, id: TId): TInstance;
    protected abstract createId(data: TIdData): TId;
    public abstract getId(data: TIdData): TId | undefined;
  }
`;

const usageCode = dedent`
  class ArrayProxyFactory extends SingletonFactory<
    unknown[],
    IArrayProxyData,
    IArrayObserverProxyPair,
    IArrayProxyIdData
  > {
    public override getId(data: IArrayProxyIdData): unknown[] {
      return data.array;
    }

    protected override createId(data: IArrayProxyIdData): unknown[] {
      return data.array;
    }

    protected override createInstance(
      data: IArrayProxyData,
      id: unknown[],
    ): IArrayObserverProxyPair {
      // create proxy/observer once for this id
      // register in IProxyRegistry, wire owner release
      return pair;
    }
  }

  const result1 = factory.create(data); // referenceCount = 1 (new instance)
  const result2 = factory.create(data); // referenceCount = 2 (reused)
  factory.release(result1.id);          // referenceCount = 1
  factory.release(result1.id);          // referenceCount = 0 -> releaseInstance teardown
`;

export default function SingletonFactoryDocsPage() {
  return (
    <main id='content' className='main'>
      <section className='section docsApiSection'>
        <div className='container'>
          <div className='docsApiHeader'>
            <div>
              <p className='docsApiEyebrow'>API Reference</p>
              <h1 className='sectionTitle'>SingletonFactory</h1>
              <p className='sectionLead'>
                Abstract base class in <span className='codeInline'>@rs-x/core</span> for id-based singleton
                instance reuse with built-in reference counting.
              </p>
              <p className='docsApiInterface'>
                Type: <span className='codeInline'>abstract class SingletonFactory&lt;...&gt;</span>
              </p>
            </div>
            <div className='docsApiActions'>
              <Link className='btn btnGhost' href='/docs'>
                Back to Docs <span aria-hidden='true'>→</span>
              </Link>
            </div>
          </div>

          <div className='docsApiGrid'>
            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Description</h2>
              <p className='cardText'>
                Ensures one instance per id and tracks how many owners currently use that instance.
              </p>
              <p className='cardText'>
                When the reference count reaches zero, the instance is removed and teardown hooks run.
              </p>
            </article>

            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Parameters</h2>
              <ApiParameterList
                items={[
                  {
                    name: 'TId',
                    type: 'generic type parameter',
                    description: 'Identifier key used to reuse one instance per id.',
                  },
                  {
                    name: 'TData',
                    type: 'generic type parameter',
                    description: 'Input data required to create or resolve an instance.',
                  },
                  {
                    name: 'TInstance',
                    type: 'generic type parameter',
                    description: 'Managed runtime instance type.',
                  },
                ]}
              />
            </article>

            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Return type</h2>
              <p className='cardText'>
                <span className='codeInline'>create(data)</span> returns
                <span className='codeInline'> {'{ referenceCount, instance, id }'}</span>.
              </p>
              <p className='cardText'>
                <span className='codeInline'>release(id)</span> returns
                <span className='codeInline'> {'{ referenceCount, instance | null }'}</span>.
              </p>
            </article>

            <article className='card docsApiCard'>
              <h2 className='cardTitle'>Usage notes</h2>
              <p className='cardText'>
                <span className='codeInline'>create(data)</span> increments ref count and returns existing or newly
                created instance.
              </p>
              <p className='cardText'>
                <span className='codeInline'>release(id)</span> decrements ref count and triggers cleanup when it reaches
                zero.
              </p>
            </article>

            <aside className='qsCodeCard docsApiCode' aria-label='API and usage'>
              <div className='qsCodeHeader'>
                <div className='qsCodeTitle'>API</div>
              </div>
              <SyntaxCodeBlock code={apiCode} />

              <div className='qsCodeHeader'>
                <div className='qsCodeTitle'>Usage example</div>
              </div>
              <SyntaxCodeBlock code={usageCode} />
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
