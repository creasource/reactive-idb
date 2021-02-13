import { ReactiveIDBDatabase } from './reactive-idb-database';
import { ReactiveIDBObjectStore } from './reactive-idb-object-store';

export class ReactiveIDBTransaction {
  /**
   * Returns the transaction's connection.
   */
  get db(): ReactiveIDBDatabase {
    return this.db_;
  }

  /**
   * If the transaction was aborted, returns the error (a DOMException) providing the reason.
   */
  get error(): DOMException | null {
    return this.transaction.error;
  }

  /**
   * Returns the mode the transaction was created with ("readonly" or "readwrite"), or "versionchange" for an upgrade transaction.
   */
  get mode(): IDBTransactionMode {
    return this.transaction.mode;
  }

  /**
   * Returns a list of the names of object stores in the transaction's scope. For an upgrade transaction this is all object stores in the database.
   */
  get objectStoreNames(): DOMStringList {
    return this.transaction.objectStoreNames;
  }

  constructor(
    private readonly transaction: IDBTransaction,
    private readonly db_: ReactiveIDBDatabase
  ) {}

  /**
   * Aborts the transaction. All pending requests will fail with a "AbortError" DOMException and all changes made to the database will be reverted.
   */
  abort(): void {
    this.transaction.abort();
  }

  /**
   * Returns a ReactiveIDBObjectStore in the transaction's scope.
   */
  objectStore(name: string): ReactiveIDBObjectStore {
    return new ReactiveIDBObjectStore(this.transaction.objectStore(name), this);
  }

  addEventListener<K extends keyof IDBTransactionEventMap>(
    type: K,
    listener: (this: IDBTransaction, ev: IDBTransactionEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void {
    this.transaction.addEventListener(type, listener, options);
  }

  removeEventListener<K extends keyof IDBTransactionEventMap>(
    type: K,
    listener: (this: IDBTransaction, ev: IDBTransactionEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void {
    this.transaction.removeEventListener(type, listener, options);
  }
}
