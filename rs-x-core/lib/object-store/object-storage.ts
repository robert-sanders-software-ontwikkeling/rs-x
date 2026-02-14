import { lastValueFrom, Observable, Observer, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { RsXCoreInjectionTokens } from '../rs-x-core.injection-tokens';
import { Inject, Injectable } from '../dependency-injection';
import { IObjectStorage } from './object-storage.interface';

const indexedDbName = 'objectStore_6a46e952c07d42629cd8fca03b21ce30';
const storeName = 'objects';

@Injectable()
export class ObjectStorage implements IObjectStorage {
   private _database!: IDBDatabase|undefined;

   constructor(
      @Inject(RsXCoreInjectionTokens.IDBFactory)
      private readonly _indexedDB: IDBFactory
   ) {}

   public get<T>(key: string): Promise<T> {
      return lastValueFrom(this.open().pipe(
         mergeMap(() => {
            return new Observable<T>((observer: Observer<T>) => {
               const transaction = this._database!.transaction(
                  [storeName],
                  'readonly'
               );
               const store = transaction.objectStore(storeName);
               const getRequest = store.get(key);
               transaction.oncomplete = () => {
                  observer.next(getRequest.result as T);
                  observer.complete();
               };
               transaction.onerror = () => observer.error(transaction.error);
            });
         })
      ));
   }
   public set<T>(key: string, value: T): Promise<void> {
      return lastValueFrom( this.open().pipe(
         mergeMap(() => {
            return new Observable((observer: Observer<void>) => {
               const transaction = this._database!.transaction(
                  storeName,
                  'readwrite'
               );
               const store = transaction.objectStore(storeName);
               store.put(value, key);
               transaction.oncomplete = () => {
                  observer.next();
                  observer.complete();
               };
               transaction.onerror = () => observer.error(transaction.error);
            });
         })
      ));
   }

   public close(): void {
      if (this._database) {
         this._database.close();
         this._database = undefined;
      }
   }

   private open(): Observable<IDBDatabase> {
      if (this._database) {
         return of(this._database);
      } else {
         return new Observable((observer) => {
            const request = this._indexedDB.open(indexedDbName, 1);
            request.onupgradeneeded = () => {
               request.result.createObjectStore(storeName);
            };
            request.onsuccess = () => {
               this._database = request.result;
               observer.next(this._database);
               observer.complete();
            };
            request.onerror = () => observer.error(request.error);
         });
      }
   }
}
