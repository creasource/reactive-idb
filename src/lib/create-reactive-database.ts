import { Observable } from 'rxjs';

import { ReactiveIDBDatabase } from './reactive-idb-database';

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

export const createReactiveDatabase = (
  options: ReactiveIDBDatabaseOptions
): Observable<ReactiveIDBDatabase> => {
  return new Observable<ReactiveIDBDatabase>((subscriber) => {
    const opts: Required<ReactiveIDBDatabaseOptions> = {
      schema: [],
      factory: window.indexedDB,
      onUpgrade: () => void 0,
      onBlocked: () => void 0,
      autoCloseOnVersionChange: true,
      ...options,
    };

    const version = Math.max(...opts.schema.map((schema) => schema.version), 1);

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
};
