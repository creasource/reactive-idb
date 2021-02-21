import { Observable } from 'rxjs';

import { ReactiveIDBTransaction } from './reactive-idb-transaction';

export interface ReactiveIDBTransformer<T> {
  serialize: (obj: T) => unknown;
  deserialize: (value: unknown) => T;
}

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
}
