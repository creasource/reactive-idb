import { Observable } from 'rxjs';

export class ReactiveIDBObjectStore {
  /**
   * Returns true if the store has a key generator, and false otherwise.
   */
  readonly autoIncrement: boolean;
  /**
   * Returns a list of the names of indexes in the store.
   */
  readonly indexNames: DOMStringList;
  /**
   * Returns the key path of the store, or null if none.
   */
  readonly keyPath: null | string | string[];
  /**
   * Returns the name of the store.
   */
  name: string;
  /**
   * Returns the associated transaction.
   */
  readonly transaction: IDBTransaction;

  constructor(private readonly store: IDBObjectStore) {
    this.autoIncrement = store.autoIncrement;
    this.indexNames = store.indexNames;
    this.keyPath = store.keyPath;
    this.name = store.name;
    this.transaction = store.transaction;
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
  add(value: any, key?: IDBValidKey): Observable<IDBValidKey> {
    return this.wrap$(this.store.add(value, key));
  }
  /**
   * Deletes all records in store.
   *
   * If successful, request's result will be undefined.
   */
  clear(): Observable<undefined> {
    return this.wrap$(this.store.clear());
  }
  /**
   * Retrieves the number of records matching the given key or key range in query.
   *
   * If successful, request's result will be the count.
   */
  count(key?: IDBValidKey | IDBKeyRange): Observable<number> {
    return this.wrap$(this.store.count(key));
  }
  /**
   * Creates a new index in store with the given name, keyPath and options and returns a new IDBIndex. If the keyPath and options define constraints that cannot be satisfied with the data already in store the upgrade transaction will abort with a "ConstraintError" DOMException.
   *
   * Throws an "InvalidStateError" DOMException if not called within an upgrade transaction.
   */
  createIndex(
    name: string,
    keyPath: string | string[],
    options?: IDBIndexParameters
  ): IDBIndex {
    return this.store.createIndex(name, keyPath, options);
  }
  /**
   * Deletes records in store with the given key or in the given key range in query.
   *
   * If successful, request's result will be undefined.
   */
  delete(key: IDBValidKey | IDBKeyRange): Observable<undefined> {
    return this.wrap$(this.store.delete(key));
  }
  /**
   * Deletes the index in store with the given name.
   *
   * Throws an "InvalidStateError" DOMException if not called within an upgrade transaction.
   */
  deleteIndex(name: string): void {
    this.store.deleteIndex(name);
  }
  /**
   * Retrieves the value of the first record matching the given key or key range in query.
   *
   * If successful, request's result will be the value, or undefined if there was no matching record.
   */
  get(query: IDBValidKey | IDBKeyRange): Observable<any | undefined> {
    return this.wrap$(this.store.get(query));
  }
  /**
   * Retrieves the values of the records matching the given key or key range in query (up to count if given).
   *
   * If successful, request's result will be an Array of the values.
   */
  getAll(
    query?: IDBValidKey | IDBKeyRange | null,
    count?: number
  ): Observable<any[]> {
    return this.wrap$(this.store.getAll(query, count));
  }
  /**
   * Retrieves the keys of records matching the given key or key range in query (up to count if given).
   *
   * If successful, request's result will be an Array of the keys.
   */
  getAllKeys(
    query?: IDBValidKey | IDBKeyRange | null,
    count?: number
  ): Observable<IDBValidKey[]> {
    return this.wrap$(this.store.getAllKeys(query, count));
  }
  /**
   * Retrieves the key of the first record matching the given key or key range in query.
   *
   * If successful, request's result will be the key, or undefined if there was no matching record.
   */
  getKey(
    query: IDBValidKey | IDBKeyRange
  ): Observable<IDBValidKey | undefined> {
    return this.wrap$(this.store.getKey(query));
  }

  index(name: string): IDBIndex {
    return this.store.index(name);
  }
  /**
   * Opens a cursor over the records matching query, ordered by direction. If query is null, all records in store are matched.
   *
   * If successful, request's result will be an IDBCursorWithValue pointing at the first matching record, or null if there were no matching records.
   */
  openCursor(
    query?: IDBValidKey | IDBKeyRange | null,
    direction?: IDBCursorDirection
  ): Observable<IDBCursorWithValue | null> {
    return this.wrap$(this.store.openCursor(query, direction));
  }
  /**
   * Opens a cursor with key only flag set over the records matching query, ordered by direction. If query is null, all records in store are matched.
   *
   * If successful, request's result will be an IDBCursor pointing at the first matching record, or null if there were no matching records.
   */
  openKeyCursor(
    query?: IDBValidKey | IDBKeyRange | null,
    direction?: IDBCursorDirection
  ): Observable<IDBCursor | null> {
    return this.wrap$(this.store.openKeyCursor(query, direction));
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
  put(value: any, key?: IDBValidKey): Observable<IDBValidKey> {
    return this.wrap$(this.store.put(value, key));
  }

  private wrap$<T>(request: IDBRequest<T>): Observable<T> {
    return new Observable((observer) => {
      request.onsuccess = () => {
        observer.next(request.result);
        observer.complete();
      };
      request.onerror = (ev) => observer.error((ev.target as IDBRequest).error);
    });
  }
}
