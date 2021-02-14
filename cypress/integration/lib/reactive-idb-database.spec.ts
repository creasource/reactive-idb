import { asyncScheduler, merge, TimeoutError } from 'rxjs';
import { concatMap, delay, tap, timeout } from 'rxjs/operators';
import {
  createReactiveDatabase,
  ReactiveIDBDatabase,
  ReactiveIDBObjectStore,
  ReactiveIDBTransaction,
} from '../../../src';

describe('ReactiveIDBDatabase', () => {
  let db: ReactiveIDBDatabase;

  beforeEach((done) => {
    createReactiveDatabase({
      name: 'testDB',
      schema: [
        { version: 1, stores: ['store1'] },
        {
          version: 2,
          stores: [
            {
              name: 'store2',
              options: {
                keyPath: 'idKeyPath',
              },
              indexes: ['index1', { name: 'index2', keyPath: 'indexKeyPath' }],
            },
          ],
        },
      ],
    }).subscribe((database) => {
      db = database;
      done();
    });
  });

  afterEach((done) => {
    db.clear$().subscribe(() => done());
  });

  describe('Base methods', () => {
    it('should have a name property', () => {
      expect(db.name).to.equal('testDB');
    });

    it('should have a version property', () => {
      expect(db.version).to.equal(2);
    });

    it('should have an objectStoreNames property', () => {
      expect(db.objectStoreNames.length).to.equal(2);
      expect(db.objectStoreNames.contains('store1')).to.equal(true);
      expect(db.objectStoreNames.contains('store2')).to.equal(true);
    });

    it('should close', () => {
      db.close();
      cy.wrap(() => db.objectStore('store1')).should('throw');
    });

    it('should create a transaction', () => {
      const t1 = db.transaction('store1');
      expect(t1).to.be.instanceOf(ReactiveIDBTransaction);
      expect(t1.db).to.equal(db);
      expect(t1.mode).to.equal('readonly');

      const t2 = db.transaction('store2', 'readwrite');
      expect(t2.mode).to.equal('readwrite');
    });

    it('should addEventListener', () => {
      const onAbort = cy.spy(() => {});

      const t1 = db.transaction('store1');
      db.addEventListener('abort', onAbort);
      t1.abort();

      cy.wrap(onAbort).should('have.been.calledOnce');
    });

    it('should removeEventListener', (done) => {
      const onAbort = cy.spy(() => done(new Error('failure')));

      const t1 = db.transaction('store1');
      db.addEventListener('abort', onAbort);
      db.removeEventListener('abort', onAbort);
      t1.abort();

      cy.wrap(onAbort)
        .should('not.have.been.called')
        .then(() => done());
    });
  });

  describe('Transaction creation (observable API)', () => {
    it('should open', (done) => {
      db.transaction$('store1').subscribe((transaction) => {
        cy.wrap(transaction)
          .should('be.instanceOf', ReactiveIDBTransaction)
          .then(() => done());
      });
    });

    it('should complete', (done) => {
      db.transaction$('store1', 'readwrite')
        .pipe(
          concatMap((t) =>
            merge(
              t.objectStore('store1').put('key1', 'test'),
              t.objectStore('store1').put('key2', 'test')
            )
          )
        )
        .subscribe({
          error: (err) => done(err),
          complete: () => done(),
        });
    });

    it('should abort', (done) => {
      db.transaction$('store1')
        .pipe(tap((t) => t.abort()))
        .subscribe({
          error: (err) => {
            expect(err.type).to.equal('abort');
            done();
          },
        });
    });

    it('should error (case 1: add same key twice)', (done) => {
      db.transaction$('store1', 'readwrite')
        .pipe(
          concatMap((t) =>
            merge(
              t.objectStore('store1').add('value1', 'key'),
              t.objectStore('store1').add('value2', 'key')
            )
          )
        )
        .subscribe({
          error: (err) => {
            expect(err).to.be.instanceOf(DOMException);
            done();
          },
        });
    });

    it('should error (case 2: async execution)', (done) => {
      db.transaction$('store1', 'readwrite')
        .pipe(
          // transactions operations must be scheduled synchronously!
          delay(0, asyncScheduler),
          concatMap((t) => t.objectStore('store1').add('value', 'key'))
        )
        .subscribe({
          error: (err) => {
            expect(err).to.be.instanceOf(DOMException);
            done();
          },
        });
    });

    it('should abort when unsubscribed', (done) => {
      db.transaction$('store1', 'readwrite')
        .pipe(
          concatMap(
            (t) =>
              merge(
                t.objectStore('store1').put('value', 'key'),
                t.objectStore('store1').put('value', 'key'),
                t.objectStore('store1').put('value', 'key'),
                t.objectStore('store1').put('value', 'key'),
                t.objectStore('store1').put('value', 'key'),
                t.objectStore('store1').put('value', 'key')
              ).pipe(timeout(0, asyncScheduler)) // Unsubscribe asynchronously
          )
        )
        .subscribe({
          error: (err) => {
            expect(err).to.be.instanceOf(TimeoutError);
            // Check that the transaction was indeed aborted
            db.objectStore('store1')
              .get('key')
              .subscribe((value) => {
                expect(value).to.equal(undefined);
                done();
              });
          },
          complete: () => done('complete'),
        });
    });
  });

  describe('Additional methods', () => {
    it('should return an object store', () => {
      const os1 = db.objectStore('store1');
      expect(os1.name).to.equal('store1');
      expect(os1.transaction.mode).to.equal('readonly');
      expect(os1.keyPath).to.equal(null);

      const os2 = db.objectStore('store2', 'readwrite');
      expect(os2.name).to.equal('store2');
      expect(os2.transaction.mode).to.equal('readwrite');
      expect(os2.keyPath).to.equal('idKeyPath');
    });

    it('should return an object store (observable API)', (done) => {
      db.objectStore$('store1').subscribe((store) => {
        cy.wrap(store)
          .should('be.instanceOf', ReactiveIDBObjectStore)
          .then(() => done());
      });
    });
  });
});
