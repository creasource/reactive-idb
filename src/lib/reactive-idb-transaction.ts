import { ReactiveIDBDatabase } from './reactive-idb-database';
import { ReactiveIDBObjectStore } from './reactive-idb-object-store';

export class ReactiveIDBTransaction {
  /**
   * Returns the transaction's connection.
   */
  readonly db: ReactiveIDBDatabase;

  /**
   * If the transaction was aborted, returns the error (a DOMException) providing the reason.
   */
  // error: DOMException | null;

  /**
   * Returns the mode the transaction was created with ("readonly" or "readwrite"), or "versionchange" for an upgrade transaction.
   */
  readonly mode: IDBTransactionMode;

  /**
   * Returns a list of the names of object stores in the transaction's scope. For an upgrade transaction this is all object stores in the database.
   */
  readonly objectStoreNames: DOMStringList;

  constructor(
    private readonly transaction: IDBTransaction,
    database: ReactiveIDBDatabase
  ) {
    this.db = database;
    // this.error = transaction.error;
    this.mode = transaction.mode;
    this.objectStoreNames = transaction.objectStoreNames;
  }

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
    return new ReactiveIDBObjectStore(this.transaction.objectStore(name));
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
