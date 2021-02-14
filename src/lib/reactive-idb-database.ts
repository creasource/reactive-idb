import { Observable } from 'rxjs';

import { ReactiveIDBTransaction } from './reactive-idb-transaction';

export interface ReactiveIDBIndexSchema {
  name: string;
  keyPath?: string | string[];
  options?: IDBIndexParameters;
}

export interface ReactiveIDBStoreSchema {
  name: string;
  options?: IDBObjectStoreParameters;
  indexes?: (ReactiveIDBIndexSchema | string)[];
}

export interface ReactiveIDBDatabaseSchema {
  version: number;
  stores: (ReactiveIDBStoreSchema | string)[];
}

/**
 * Options to pass to the ReactiveIDBDatabase constructor
 */
export interface ReactiveIDBDatabaseOptions {
  /**
   * Name of this database
   */
  name: string;

  /**
   * @default `[]`
   */
  schema?: ReactiveIDBDatabaseSchema[];

  /**
   * IDBFactory to use to create the database if different from `window.indexeddb`
   *
   * @default `window.indexeddb`
   */
  factory?: IDBFactory;

  /**
   * Custom onUpgrade method to execute when database version has changed
   *
   * @param database
   * @param versionChangeEvent
   */
  onUpgrade?: (
    database: IDBDatabase,
    oldVersion: number,
    newVersion: number | null,
    transaction: IDBTransaction
  ) => void;

  onBlocked?: (event: Event) => void;

  /**
   * Should the database be closed on version changed
   */
  autoCloseOnVersionChange?: boolean;
}

export class ReactiveIDBDatabase {
  /**
   * Returns the name of the database.
   */
  get name(): string {
    return this.database.name;
  }

  /**
   * Returns a list of the names of object stores in the database.
   */
  get objectStoreNames(): DOMStringList {
    return this.database.objectStoreNames;
  }

  /**
   * Returns the version of the database.
   */
  get version(): number {
    return this.database.version;
  }

  /**
   * @param database
   */
  constructor(private readonly database: IDBDatabase) {}

  /**
   *
   * @param options
   */
  static create(
    options: ReactiveIDBDatabaseOptions
  ): Observable<ReactiveIDBDatabase> {
    return new Observable<ReactiveIDBDatabase>((subscriber) => {
      const opts: Required<ReactiveIDBDatabaseOptions> = {
        schema: [],
        factory: window.indexedDB,
        onUpgrade: () => void 0,
        onBlocked: () => void 0,
        autoCloseOnVersionChange: true,
        ...options,
      };

      const version = Math.max(
        ...opts.schema.map((schema) => schema.version),
        1
      );

      const request = opts.factory.open(opts.name, version);

      request.onupgradeneeded = (versionChange) => {
        const database = request.result;
        opts.schema
          .filter((schema) => schema.version > versionChange.oldVersion)
          .forEach((schema) => {
            const stores = schema.stores;
            stores.forEach((store) => {
              let name, options, indexes: ReactiveIDBIndexSchema[];
              if (typeof store === 'string') {
                name = store;
                options = {};
                indexes = [];
              } else {
                name = store.name;
                options = store.options;
                indexes = (store.indexes || []).map((index) => {
                  return typeof index === 'string'
                    ? { name: index, keyPath: index }
                    : index;
                });
              }
              const objStore = database.createObjectStore(name, options);
              indexes.forEach((index) =>
                objStore.createIndex(
                  index.name,
                  index.keyPath || index.name,
                  index.options
                )
              );
            });
          });
        opts.onUpgrade(
          database,
          versionChange.oldVersion,
          versionChange.newVersion,
          ((versionChange.target as unknown) as { transaction: IDBTransaction })
            .transaction
        );
      };

      request.onsuccess = () => {
        if (opts.autoCloseOnVersionChange) {
          request.result.addEventListener('versionchange', () => {
            request.result.close();
          });
        }
        subscriber.next(new ReactiveIDBDatabase(request.result));
        subscriber.complete();
      };

      if (options.onBlocked) {
        request.onblocked = options.onBlocked;
      }

      request.onerror = (ev) => subscriber.error(ev);
    });
  }

  /**
   * Closes the connection once all running transactions have finished.
   */
  close(): void {
    return this.database.close();
  }

  /**
   * Returns a new transaction with the given mode ("readonly" or "readwrite") and scope which can be a single object store name or an array of names.
   */
  transaction(
    names: string | string[],
    mode?: IDBTransactionMode
  ): ReactiveIDBTransaction {
    return new ReactiveIDBTransaction(
      this.database.transaction(names, mode),
      this
    );
  }

  /**
   *
   * @param names
   * @param mode
   */
  transaction$(
    names: string | string[],
    mode?: IDBTransactionMode
  ): Observable<ReactiveIDBTransaction> {
    return new Observable<ReactiveIDBTransaction>((observer) => {
      const transaction = new ReactiveIDBTransaction(
        this.database.transaction(names, mode),
        this
      );
      // transaction.addEventListener('error', (ev) =>
      //   observer.error((ev.target as any).error)
      // );
      // transaction.addEventListener('abort', (ev) =>
      //   observer.error(transaction.error)
      // );
      transaction.addEventListener('complete', () => observer.complete());
      observer.next(transaction);
      return () => {
        try {
          transaction.abort();
          // eslint-disable-next-line no-empty
        } catch (e) {}
      };
    });
  }

  /**
   *
   * @param name
   * @param mode
   * @param transformer
   */
  // objectStore<T>(
  //   name: string,
  //   mode?: IDBTransactionMode,
  //   transformer?: Transformer<T>
  // ): ReactiveIDBObjectStore<T> {
  //   return this.transaction(name, mode).objectStore<T>(name, transformer);
  // }

  /**
   *
   * @param name
   * @param mode
   * @param transformer
   */
  // objectStore$<T>(
  //   name: string,
  //   mode?: IDBTransactionMode,
  //   transformer?: Transformer<T>
  // ): Observable<ReactiveIDBObjectStore<T>> {
  //   return this.transaction$(name, mode).pipe(
  //     concatMap((transaction) => transaction.objectStore$<T>(name, transformer))
  //   );
  // }

  /**
   * Creates a new object store with the given name and options and returns a new IDBObjectStore.
   *
   * Throws a "InvalidStateError" DOMException if not called within an upgrade transaction.
   */
  // createObjectStore(
  //   name: string,
  //   options?: IDBObjectStoreParameters
  // ): ReactiveIDBObjectStore {
  //   return new ReactiveIDBObjectStore(
  //     this.database.createObjectStore(name, options)
  //   );
  // }

  /**
   * Deletes the object store with the given name.
   *
   * Throws a "InvalidStateError" DOMException if not called within an upgrade transaction.
   */
  // deleteObjectStore(name: string): void {
  //   return this.database.deleteObjectStore(name);
  // }

  /**
   *
   * @param type
   * @param listener
   * @param options
   */
  addEventListener<K extends keyof IDBDatabaseEventMap>(
    type: K,
    listener: (this: IDBDatabase, ev: IDBDatabaseEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void {
    this.database.addEventListener(type, listener, options);
  }

  /**
   *
   * @param type
   * @param listener
   * @param options
   */
  removeEventListener<K extends keyof IDBDatabaseEventMap>(
    type: K,
    listener: (this: IDBDatabase, ev: IDBDatabaseEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void {
    this.database.removeEventListener(type, listener, options);
  }

  /**
   *
   * @param onBlocked
   */
  clear$(onBlocked?: (event: Event) => void): Observable<void> {
    return new Observable((observer) => {
      this.database.close();
      const request = indexedDB.deleteDatabase(this.name);
      request.onerror = (event) => observer.error(event);
      request.onsuccess = () => {
        observer.next();
        observer.complete();
      };
      if (onBlocked) {
        request.onblocked = onBlocked;
      }
    });
  }

  // getDb(options: ReactiveIDBDatabaseOptions): Observable<IDBDatabase> {
  //   return this.openDB(
  //     options.name,
  //     version,
  //     (db, versionChange: IDBVersionChangeEvent) => {
  //       if (versionChange.oldVersion === 0) {
  //         const entries = db.createObjectStore('entries', { keyPath: 'path' });
  //         entries.createIndex('parents', 'parent');
  //       }
  //       if (versionChange.oldVersion <= 1) {
  //         // const t: IDBTransaction = (versionChange.target as any).transaction;
  //         // t.objectStore('').createIndex('listenedOn', 'listenedOn');
  //       }
  //       // if (versionChange.oldVersion <= 2) {
  //       // }
  //     }
  //   );
  // }

  // open(
  //   stores: string[],
  //   mode: IDBTransactionMode = 'readonly'
  // ): OperatorFunction<IDBDatabase, IDBTransaction> {
  //   const r = (db: IDBDatabase) =>
  //     new Observable<IDBTransaction>((subscriber) => {
  //       const transaction = db.transaction(stores, mode);
  //       transaction.onerror = (ev) =>
  //         subscriber.error((ev.target as IDBTransaction).error);
  //       transaction.oncomplete = (_) => subscriber.complete();
  //       subscriber.next(transaction);
  //     });
  //   return concatMap(r);
  // }
  //
  // open$(
  //   stores: string[],
  //   mode: IDBTransactionMode = 'readonly'
  // ): Observable<IDBTransaction> {
  //   return this.db$.pipe(this.open(stores, mode));
  // }
  //
  // // execute$<T>(
  // //   stores: string[],
  // //   mode: IDBTransactionMode,
  // //   ...transactions: OperatorFunction<IDBTransaction, T>[]
  // // ): Observable<T> {
  // //   return this.db$.pipe(
  // //     this.open(stores, mode),
  // //     publish((m$) => merge(...transactions.map((t) => m$.pipe(t))))
  // //   );
  // // }
  //
  // get<T>(
  //   key: IDBValidKey,
  //   store: string,
  //   index?: string
  // ): OperatorFunction<IDBTransaction, T | undefined> {
  //   return concatMap(
  //     this.wrap((transaction) =>
  //       index
  //         ? transaction.objectStore(store).index(index).get(key)
  //         : transaction.objectStore(store).get(key)
  //     )
  //   );
  // }
  //
  // add(
  //   store: string,
  //   value: any,
  //   key?: IDBValidKey
  // ): OperatorFunction<IDBTransaction, IDBValidKey> {
  //   return concatMap(
  //     this.wrap((transaction) => transaction.objectStore(store).add(value, key))
  //   );
  // }
  //
  // put(
  //   store: string,
  //   value: any,
  //   key?: IDBValidKey
  // ): OperatorFunction<IDBTransaction, IDBValidKey> {
  //   return concatMap(
  //     this.wrap((transaction) => transaction.objectStore(store).put(value, key))
  //   );
  // }
  //
  // update<T>(
  //   store: string,
  //   value: Partial<T>,
  //   key: IDBValidKey
  // ): OperatorFunction<IDBTransaction, IDBValidKey> {
  //   return (obs) =>
  //     obs.pipe(
  //       concatMap((t) =>
  //         this.get<T>(
  //           key,
  //           store
  //         )(of(t)).pipe(
  //           concatMap((obj) =>
  //             obj
  //               ? this.put(store, { ...obj, ...value })(of(t))
  //               : throwError('Could not find key: ' + key)
  //           )
  //         )
  //       )
  //     );
  // }
  //
  // update$<T>(
  //   store: string,
  //   value: Partial<T>,
  //   key: IDBValidKey
  // ): Observable<IDBValidKey> {
  //   return this.open$([store], 'readwrite').pipe(
  //     this.update(store, value, key)
  //   );
  // }
  //
  // delete(
  //   store: string,
  //   key: IDBValidKey | IDBKeyRange
  // ): OperatorFunction<IDBTransaction, undefined> {
  //   return concatMap(
  //     this.wrap((transaction) => transaction.objectStore(store).delete(key))
  //   );
  // }
  //
  // getAll<T>(
  //   store: string,
  //   index?: string,
  //   query?: IDBValidKey | IDBKeyRange | null
  // ): OperatorFunction<IDBTransaction, T[]> {
  //   return concatMap(
  //     this.wrap((transaction) =>
  //       index
  //         ? transaction.objectStore(store).index(index).getAll(query)
  //         : transaction.objectStore(store).getAll(query)
  //     )
  //   );
  // }
  //
  // getAll$<T>(
  //   store: string,
  //   index?: string,
  //   query?: IDBValidKey | IDBKeyRange | null
  // ): Observable<T[]> {
  //   return this.open$([store]).pipe(this.getAll(store, index, query));
  // }
  //
  // getAllValues$<T>(
  //   keys: IDBValidKey[],
  //   store: string,
  //   index?: string
  // ): Observable<T> {
  //   return this.open$([store]).pipe(
  //     concatMap((transaction) =>
  //       keys.map((key) =>
  //         this.exec$(
  //           index
  //             ? transaction.objectStore(store).index(index).get(key)
  //             : transaction.objectStore(store).get(key)
  //         )
  //       )
  //     ),
  //     mergeAll()
  //   );
  // }
  //
  // exec$<T>(request: IDBRequest<T>): Observable<T> {
  //   return new Observable((observer) => {
  //     request.onsuccess = (_) => {
  //       observer.next(request.result);
  //       observer.complete();
  //     };
  //     request.onerror = (ev) => observer.error((ev.target as IDBRequest).error);
  //   });
  // }
  //
  // exec<T>(
  //   action: (_: IDBTransaction) => IDBRequest<T>
  // ): OperatorFunction<IDBTransaction, T> {
  //   return concatMap((t: IDBTransaction) => this.exec$(action(t)));
  // }
  //
  // // walk<T>(store: string): OperatorFunction<IDBTransaction, T> {
  // //   return concatMap((t) => this.walk$<T>(t, store));
  // // }
  //
  // walk$<T>(
  //   transaction: IDBTransaction,
  //   store: string,
  //   index?: string,
  //   query?: IDBValidKey | IDBKeyRange | null,
  //   direction?: IDBCursorDirection,
  //   predicate?: (_: T) => boolean
  // ): Observable<{ value: T; key: IDBValidKey; primaryKey: IDBValidKey }> {
  //   return new Observable((observer) => {
  //     const request = index
  //       ? transaction
  //           .objectStore(store)
  //           .index(index)
  //           .openCursor(query, direction || 'next')
  //       : transaction.objectStore(store).openCursor(query, direction || 'next');
  //     request.onsuccess = (event: any) => {
  //       const cursor: IDBCursorWithValue = event.target.result;
  //       if (cursor && !observer.closed) {
  //         if (!predicate || predicate(cursor.value)) {
  //           observer.next({
  //             value: cursor.value,
  //             key: cursor.key,
  //             primaryKey: cursor.primaryKey,
  //           });
  //         }
  //         cursor.continue();
  //       } else {
  //         observer.complete();
  //       }
  //     };
  //     request.onerror = (ev) => observer.error((ev.target as IDBRequest).error);
  //   });
  // }
  //
  // walkKeys(
  //   store: string,
  //   index?: string
  // ): OperatorFunction<IDBTransaction, IDBValidKey> {
  //   return concatMap((t) => this.walkKeys$(t, store, index));
  // }
  //
  // walkKeys$(
  //   transaction: IDBTransaction,
  //   store: string,
  //   index?: string
  // ): Observable<IDBValidKey> {
  //   return new Observable((observer) => {
  //     const request = index
  //       ? transaction.objectStore(store).index(index).openKeyCursor()
  //       : transaction.objectStore(store).openKeyCursor();
  //     request.onsuccess = (event: any) => {
  //       const cursor: IDBCursor = event.target.result;
  //       if (cursor && !observer.closed) {
  //         observer.next(cursor.key);
  //         cursor.continue();
  //       } else {
  //         observer.complete();
  //       }
  //     };
  //     request.onerror = (ev) => observer.error((ev.target as IDBRequest).error);
  //   });
  // }
  //
  // find$<T>(
  //   transaction: IDBTransaction,
  //   store: string,
  //   predicate: (_: T) => boolean
  // ): Observable<(T & { key: IDBValidKey }) | undefined> {
  //   return new Observable((observer) => {
  //     const request = transaction.objectStore(store).openCursor();
  //     request.onsuccess = (event: any) => {
  //       const cursor: IDBCursorWithValue = event.target.result;
  //       if (cursor && cursor.value && !observer.closed) {
  //         if (predicate(cursor.value)) {
  //           observer.next({
  //             ...(cursor.value as T),
  //             key: cursor.key,
  //           });
  //           observer.complete();
  //         }
  //         cursor.continue();
  //       } else {
  //         observer.next(undefined);
  //         observer.complete();
  //       }
  //     };
  //     request.onerror = (ev) => observer.error((ev.target as IDBRequest).error);
  //   });
  // }
  //
  // add$(store: string, value: any, key?: IDBValidKey): Observable<IDBValidKey> {
  //   return this.db$.pipe(
  //     this.open([store], 'readwrite'),
  //     this.add(store, value, key)
  //   );
  // }
  //
  // put$(store: string, value: any, key?: IDBValidKey): Observable<IDBValidKey> {
  //   return this.db$.pipe(
  //     this.open([store], 'readwrite'),
  //     this.put(store, value, key)
  //   );
  // }
  //
  // get$<T>(
  //   store: string,
  //   key: IDBValidKey,
  //   index?: string
  // ): Observable<T | undefined> {
  //   return this.db$.pipe(
  //     this.open([store], 'readonly'),
  //     this.get<T>(key, store, index)
  //   );
  // }
  //

  //
  // private wrap<T>(
  //   action: (_: IDBTransaction) => IDBRequest<T>
  // ): (_: IDBTransaction) => Observable<T> {
  //   return (transaction: IDBTransaction) =>
  //     new Observable((observer) => {
  //       const request = action(transaction);
  //       request.onsuccess = (_) => {
  //         observer.next(request.result);
  //         observer.complete();
  //       };
  //       request.onerror = (ev) =>
  //         observer.error((ev.target as IDBRequest).error);
  //     });
  // }

  // private openDB(
  //   dbName: string,
  //   dbVersion: number,
  //   onUpgradeNeeded: (
  //     result: IDBDatabase,
  //     versionChangeEvent: IDBVersionChangeEvent
  //   ) => void
  // ): Observable<IDBDatabase> {
  //   return new Observable<IDBDatabase>((subscriber) => {
  //     const request = window.indexedDB.open(dbName, dbVersion);
  //     request.onupgradeneeded = (versionChange) =>
  //       onUpgradeNeeded(request.result, versionChange);
  //     request.onsuccess = () => {
  //       subscriber.next(request.result);
  //       subscriber.complete();
  //     };
  //     request.onerror = (ev) =>
  //       subscriber.error((ev.target as IDBOpenDBRequest).error);
  //   });
  // }
}
