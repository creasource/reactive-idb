import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ReactiveIDBObjectStore } from './reactive-idb-object-store';
import { wrapRequest } from './utils/wrap-request.util';

export class ReactiveIDBIndex<T = unknown> {
  get keyPath(): string | string[] {
    return this.index.keyPath;
  }

  get multiEntry(): boolean {
    return this.index.multiEntry;
  }
  /**
   * Returns the name of the index.
   */
  get name(): string {
    return this.index.name;
  }

  /**
   *
   */
  get unique(): boolean {
    return this.index.unique;
  }

  /**
   *
   * @param index
   * @param objectStore The ReactiveIDBObjectStore this index belongs to.
   */
  constructor(
    private readonly index: IDBIndex,
    readonly objectStore: ReactiveIDBObjectStore<T>
  ) {}

  /**
   * Retrieves the number of records matching the given key or key range in query.
   *
   * If successful, request's result will be the count.
   */
  count$(key?: IDBValidKey | IDBKeyRange): Observable<number> {
    return wrapRequest(() => this.index.count(key));
  }

  /**
   * Retrieves the value of the first record matching the given key or key range in query.
   *
   * If successful, request's result will be the value, or undefined if there was no matching record.
   */
  get$(key: IDBValidKey | IDBKeyRange): Observable<T | undefined> {
    return wrapRequest(() => this.index.get(key)).pipe(
      map((value) =>
        value !== undefined
          ? this.objectStore.transformer.deserialize(value)
          : value
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
    return wrapRequest(() => this.index.getAll(query, count)).pipe(
      map((values) =>
        values.map((v) => this.objectStore.transformer.deserialize(v))
      )
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
    return wrapRequest(() => this.index.getAllKeys(query, count));
  }

  /**
   * Retrieves the key of the first record matching the given key or key range in query.
   *
   * If successful, request's result will be the key, or undefined if there was no matching record.
   */
  getKey$(key: IDBValidKey | IDBKeyRange): Observable<IDBValidKey | undefined> {
    return wrapRequest(() => this.index.getKey(key));
  }

  /**
   * Opens a cursor over the records matching query, ordered by direction. If query is null, all records in index are matched.
   *
   * If successful, request's result will be an IDBCursorWithValue, or null if there were no matching records.
   */
  openCursor$(
    query?: IDBValidKey | IDBKeyRange | null,
    direction?: IDBCursorDirection
  ): Observable<IDBCursorWithValue | null> {
    return wrapRequest(() => this.index.openCursor(query, direction), false);
  }

  /**
   * Opens a cursor with key only flag set over the records matching query, ordered by direction. If query is null, all records in index are matched.
   *
   * If successful, request's result will be an IDBCursor, or null if there were no matching records.
   */
  openKeyCursor$(
    query?: IDBValidKey | IDBKeyRange | null,
    direction?: IDBCursorDirection
  ): Observable<IDBCursor | null> {
    return wrapRequest(() => this.index.openKeyCursor(query, direction), false);
  }
}
