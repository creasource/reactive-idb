import {
  createReactiveDatabase,
  ReactiveIDBDatabase,
} from '../../../src/lib/reactive-idb-database';
import { ReactiveIDBTransaction } from '../../../src/lib/reactive-idb-transaction';

describe('ReactiveIDBTransaction', () => {
  let database: ReactiveIDBDatabase;
  let transaction: ReactiveIDBTransaction;

  beforeEach((done) => {
    createReactiveDatabase({
      name: 'testDB',
      schema: [{ version: 1, stores: [{ name: 'store' }] }],
    }).subscribe((db) => {
      database = db;
      transaction = db.transaction('store', 'readwrite');
      done();
    });
  });

  afterEach(() => {
    cy.deleteDatabase('testDB');
  });

  it('should return database', () => {
    expect(transaction.db).to.equal(database);
  });

  it('should return objectStoreNames', () => {
    expect(transaction.objectStoreNames.contains('store')).to.equal(true);
  });

  it('should return mode', () => {
    expect(transaction.mode).to.equal('readwrite');
  });

  it('should abort', (done) => {
    transaction
      .objectStore('store')
      .openCursor()
      .subscribe({
        error: (err) => {
          expect(err).to.be.instanceOf(DOMException);
          done();
        },
      });
    transaction.abort();
  });

  it('should addEventListener', (done) => {
    transaction.addEventListener('abort', (event) => {
      expect(event.type).to.equal('abort');
      done();
    });
    transaction.abort();
  });

  it('should removeEventListener', (done) => {
    const f = cy.spy(() => done(new Error('failure')));
    transaction.addEventListener('abort', f);
    transaction.removeEventListener('abort', f);
    transaction.abort();
    expect(f).to.not.have.been.called;
    done();
  });
});
