import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ReactiveIDBIndex } from './reactive-idb-index';
import { ReactiveIDBTransaction } from './reactive-idb-transaction';
import { wrapRequest } from './utils/wrap-request.util';

export interface Transformer<T> {
  serialize: (obj: T) => unknown;
  deserialize: (value: unknown) => T;
}

export class ReactiveIDBObjectStore<T = unknown> {
  /**
   * Returns true if the store has a key generator, and false otherwise.
   */
  get autoIncrement(): boolean {
    return this.store.autoIncrement;
  }
  /**
   * Returns a list of the names of indexes in the store.
   */
  get indexNames(): DOMStringList {
    return this.store.indexNames;
  }
  /**
   * Returns the key path of the store, or null if none.
   */
  get keyPath(): null | string | string[] {
    return this.store.keyPath;
  }
  /**
   * Returns the name of the store.
   */
  get name(): string {
    return this.store.name;
  }

  /**
   *
   * @param store
   * @param transaction
   * @param transformer
   */
  constructor(
    private readonly store: IDBObjectStore,
    readonly transaction: ReactiveIDBTransaction,
    readonly transformer: Transformer<T> = {
      serialize: (o) => o,
      deserialize: (v) => v as T,
    }
  ) {}

  /**
   * Adds or updates a record in store with the given value and key.
   *
   * If the store uses in-line keys and key is specified a "DataError" DOMException will be thrown.
   *
   * If put() is used, any existing record with the key will be replaced. If add() is used, and if a record with the key already exists the request will fail, with request's error set to a "ConstraintError" DOMException.
   *
   * If successful, request's result will be the record's key.
   */
  add$(value: T, key?: IDBValidKey): Observable<IDBValidKey> {
    return wrapRequest(() =>
      this.store.add(this.transformer.serialize(value), key)
    );
  }

  /**
   * Deletes all records in store.
   */
  clear$(): Observable<undefined> {
    return wrapRequest(() => this.store.clear());
  }

  /**
   * Retrieves the number of records matching the given key or key range in query.
   */
  count$(key?: IDBValidKey | IDBKeyRange): Observable<number> {
    return wrapRequest(() => this.store.count(key));
  }

  /**
   * Creates a new index in store with the given name, keyPath and options and returns a new IDBIndex. If the keyPath and options define constraints that cannot be satisfied with the data already in store the upgrade transaction will abort with a "ConstraintError" DOMException.
   *
   * Throws an "InvalidStateError" DOMException if not called within an upgrade transaction.
   */
  // createIndex(
  //   name: string,
  //   keyPath: string | string[],
  //   options?: IDBIndexParameters
  // ): IDBIndex {
  //   return this.store.createIndex(name, keyPath, options);
  // }

  /**
   * Deletes records in store with the given key or in the given key range in query.
   *
   * If successful, request's result will be undefined.
   */
  delete$(key: IDBValidKey | IDBKeyRange): Observable<undefined> {
    return wrapRequest(() => this.store.delete(key));
  }

  /**
   * Deletes the index in store with the given name.
   *
   * Throws an "InvalidStateError" DOMException if not called within an upgrade transaction.
   */
  // deleteIndex(name: string): void {
  //   this.store.deleteIndex(name);
  // }

  /**
   * Retrieves the value of the first record matching the given key or key range in query.
   *
   * If successful, request's result will be the value, or undefined if there was no matching record.
   */
  get$(query: IDBValidKey | IDBKeyRange): Observable<T | undefined> {
    return wrapRequest(() => this.store.get(query)).pipe(
      map((value) =>
        value !== undefined ? this.transformer.deserialize(value) : value
      )
    );
  }

  /**
   * Retrieves the values of the records matching the given key or key range in query (up to count if given).
   *
   * If successful, request's result will be an Array of the values.
   */
  getAll$(
    query?: IDBValidKey | IDBKeyRange | null,
    count?: number
  ): Observable<T[]> {
    return wrapRequest(() => this.store.getAll(query, count)).pipe(
      map((values) => values.map((v) => this.transformer.deserialize(v)))
    );
  }

  /**
   * Retrieves the keys of records matching the given key or key range in query (up to count if given).
   *
   * If successful, request's result will be an Array of the keys.
   */
  getAllKeys$(
    query?: IDBValidKey | IDBKeyRange | null,
    count?: number
  ): Observable<IDBValidKey[]> {
    return wrapRequest(() => this.store.getAllKeys(query, count));
  }
  /**
   * Retrieves the key of the first record matching the given key or key range in query.
   *
   * If successful, request's result will be the key, or undefined if there was no matching record.
   */
  getKey$(
    query: IDBValidKey | IDBKeyRange
  ): Observable<IDBValidKey | undefined> {
    return wrapRequest(() => this.store.getKey(query));
  }

  index(name: string): ReactiveIDBIndex<T> {
    return new ReactiveIDBIndex<T>(this.store.index(name), this);
  }

  /**
   * Opens a cursor over the records matching query, ordered by direction. If query is null, all records in store are matched.
   *
   * If successful, request's result will be an IDBCursorWithValue pointing at the first matching record, or null if there were no matching records.
   */
  openCursor$(
    query?: IDBValidKey | IDBKeyRange | null,
    direction?: IDBCursorDirection
  ): Observable<IDBCursorWithValue | null> {
    return wrapRequest(() => this.store.openCursor(query, direction), false);
  }

  /**
   * Opens a cursor with key only flag set over the records matching query, ordered by direction. If query is null, all records in store are matched.
   *
   * If successful, request's result will be an IDBCursor pointing at the first matching record, or null if there were no matching records.
   */
  openKeyCursor$(
    query?: IDBValidKey | IDBKeyRange | null,
    direction?: IDBCursorDirection
  ): Observable<IDBCursor | null> {
    return wrapRequest(() => this.store.openKeyCursor(query, direction), false);
  }

  /**
   * Adds or updates a record in store with the given value and key.
   *
   * If the store uses in-line keys and key is specified a "DataError" DOMException will be thrown.
   *
   * If put() is used, any existing record with the key will be replaced. If add() is used, and if a record with the key already exists the request will fail, with request's error set to a "ConstraintError" DOMException.
   *
   * If successful, request's result will be the record's key.
   */
  put$(value: T, key?: IDBValidKey): Observable<IDBValidKey> {
    return wrapRequest(() =>
      this.store.put(this.transformer.serialize(value), key)
    );
  }
}
