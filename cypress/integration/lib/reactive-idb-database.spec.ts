import { asyncScheduler, fromEvent, merge, TimeoutError } from 'rxjs';
import { concatMap, delay, publish, tap, timeout } from 'rxjs/operators';

import { ReactiveIDBDatabase, ReactiveIDBTransaction } from '../../../src';

describe('ReactiveIDBDatabase', () => {
  describe('Creation', () => {
    const dbName = 'createTestDatabase';

    afterEach(() => cy.deleteDatabase(dbName));

    it('should not create a database if not subscribed', (done) => {
      ReactiveIDBDatabase.create({ name: dbName });

      // Check that no database was created
      const onUpgradeNeeded = cy.spy((v) => expect(v.oldVersion).to.equal(0));
      const r = window.indexedDB.open(dbName);
      r.onupgradeneeded = onUpgradeNeeded;
      r.onsuccess = () => {
        expect(onUpgradeNeeded).to.have.been.calledOnce;
        r.result.close();
        done();
      };
    });

    it('should create a database when subscribed', (done) => {
      ReactiveIDBDatabase.create({ name: dbName }).subscribe(() => {
        // Check that a database was created
        const onUpgradeNeeded = cy.spy((v) => expect(v.oldVersion).to.equal(0));
        const r = window.indexedDB.open(dbName);
        r.onupgradeneeded = onUpgradeNeeded;
        r.onsuccess = () => {
          expect(onUpgradeNeeded).to.not.have.been.called;
          r.result.close();
          done();
        };
      });
    });

    it('should accept a simple schema', (done) => {
      ReactiveIDBDatabase.create({
        name: dbName,
        schema: [{ version: 1, stores: ['testStore'] }],
      }).subscribe(() => {
        const onUpgradeNeeded = cy.spy((v) => expect(v.oldersion).to.equal(0));
        const r = window.indexedDB.open(dbName);
        r.onupgradeneeded = onUpgradeNeeded;
        r.onsuccess = () => {
          expect(r.result.version).to.equal(1);
          expect(onUpgradeNeeded).to.not.have.been.called;
          expect(r.result.objectStoreNames.contains('testStore')).to.equal(
            true
          );
          r.result.close();
          done();
        };
      });
    });

    it('should accept several versioned schemas', (done) => {
      ReactiveIDBDatabase.create({
        name: dbName,
        schema: [
          { version: 2, stores: ['testStore'] },
          { version: 1, stores: ['testStore2'] },
        ],
      }).subscribe((db) => {
        expect(db.version).to.equal(2);
        done();
      });
    });

    it('should accept a custom onUpgrade', (done) => {
      const onUpgrade = cy.spy(
        (db: IDBDatabase, oldV, newV, trans: IDBTransaction) => {
          expect(oldV).to.equal(0);
          expect(newV).to.equal(2);
          trans.objectStore('testStore').createIndex('test', 'test');
        }
      );

      ReactiveIDBDatabase.create({
        name: dbName,
        schema: [{ version: 2, stores: ['testStore'] }],
        onUpgrade,
      }).subscribe((database) => {
        expect(onUpgrade).to.have.been.calledOnce;
        expect(database.version).to.equal(2);
        expect(
          database
            .transaction('testStore')
            .objectStore('testStore')
            .indexNames.contains('test')
        ).to.equal(true);
        done();
      });
    });

    it('should allow to define store indexes', (done) => {
      ReactiveIDBDatabase.create({
        name: dbName,
        schema: [
          {
            version: 1,
            stores: [
              {
                name: 'store1',
                indexes: [{ name: 'index1', keyPath: 'index' }],
              },
            ],
          },
          {
            version: 2,
            stores: [{ name: 'store2', indexes: [{ name: 'index2' }] }],
          },
        ],
      }).subscribe((database) => {
        expect(database.version).to.equal(2);
        const transaction = database.transaction(['store1', 'store2']);
        expect(
          transaction.objectStore('store1').indexNames.contains('index1')
        ).to.equal(true);
        expect(
          transaction.objectStore('store2').indexNames.contains('index2')
        ).to.equal(true);
        expect(
          transaction.objectStore('store1').index('index1').keyPath
        ).to.equal('index');
        expect(
          transaction.objectStore('store2').index('index2').keyPath
        ).to.equal('index2');
        done();
      });
    });

    it('should close', (done) => {
      ReactiveIDBDatabase.create({
        name: dbName,
        schema: [{ version: 1, stores: [{ name: 'store' }] }],
      }).subscribe((db) => {
        db.close();
        expect(() => db.transaction('store')).to.throw;
        done();
      });
    });

    it('should create a database that auto-closes on version change', (done) => {
      // noinspection DuplicatedCode
      ReactiveIDBDatabase.create({
        name: dbName,
        schema: [{ version: 1, stores: [{ name: 'store' }] }],
      })
        .pipe(
          concatMap((db1) =>
            ReactiveIDBDatabase.create({
              name: dbName,
              schema: [
                { version: 1, stores: [{ name: 'store' }] },
                { version: 2, stores: [{ name: 'store2' }] },
              ],
            }).pipe(
              tap((db2) => {
                expect(db1.version).to.equal(1);
                expect(db2.version).to.equal(2);
                expect(() => db1.transaction('store')).to.throw;
                expect(() => db2.transaction('store2')).to.not.throw;
                done();
              })
            )
          )
        )
        .subscribe();
    });

    it('should accept an autoCloseOnVersionChange option', (done) => {
      // noinspection DuplicatedCode
      ReactiveIDBDatabase.create({
        name: dbName,
        schema: [{ version: 1, stores: [{ name: 'store' }] }],
        autoCloseOnVersionChange: false,
      })
        .pipe(
          tap((db) => db.addEventListener('versionchange', () => db.close())),
          concatMap((db1) =>
            ReactiveIDBDatabase.create({
              name: dbName,
              schema: [
                { version: 1, stores: [{ name: 'store' }] },
                { version: 2, stores: [{ name: 'store2' }] },
              ],
            }).pipe(
              tap((db2) => {
                expect(db1.version).to.equal(1);
                expect(db2.version).to.equal(2);
                expect(() => db1.transaction('store')).to.throw;
                expect(() => db2.transaction('store2')).to.not.throw;
                done();
              })
            )
          )
        )
        .subscribe();
    });

    it('should accept an onBlocked option', (done) => {
      // noinspection DuplicatedCode
      ReactiveIDBDatabase.create({
        name: dbName,
        schema: [{ version: 1, stores: [{ name: 'store' }] }],
        autoCloseOnVersionChange: false,
      })
        .pipe(
          concatMap((db1) => {
            const onBlocked = cy.spy(() => db1.close());

            return ReactiveIDBDatabase.create({
              name: dbName,
              schema: [
                { version: 1, stores: [{ name: 'store' }] },
                { version: 2, stores: [{ name: 'store2' }] },
              ],
              onBlocked,
            }).pipe(
              tap(() => {
                expect(onBlocked).to.have.been.calledOnce;
                done();
              })
            );
          })
        )
        .subscribe();
    });
  });

  describe('Base methods', () => {
    let db: ReactiveIDBDatabase;

    beforeEach((done) => {
      ReactiveIDBDatabase.create({
        name: 'testDB',
        schema: [{ version: 1, stores: ['store1'] }],
      }).subscribe((database) => {
        db = database;
        done();
      });
    });

    afterEach((done) => {
      db.clear$().subscribe(() => done());
    });

    it('should have a name property', () => {
      expect(db.name).to.equal('testDB');
    });

    it('should have a version property', () => {
      expect(db.version).to.equal(1);
    });

    it('should have an objectStoreNames property', () => {
      expect(db.objectStoreNames.length).to.equal(1);
      expect(db.objectStoreNames.contains('store1')).to.equal(true);
    });

    it('should close', () => {
      db.close();
      cy.wrap(() => db.transaction('store1')).should('throw');
    });

    it('should create a transaction', () => {
      const t1 = db.transaction('store1');
      expect(t1).to.be.instanceOf(ReactiveIDBTransaction);
      expect(t1.db).to.equal(db);
      expect(t1.mode).to.equal('readonly');
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

  describe('Transactions (observable API)', () => {
    let db: ReactiveIDBDatabase;

    beforeEach((done) => {
      ReactiveIDBDatabase.create({
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
                indexes: [
                  'index1',
                  { name: 'index2', keyPath: 'indexKeyPath' },
                ],
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
              t.objectStore('store1').put$('key1', 'test'),
              t.objectStore('store1').put$('key2', 'test')
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
        .pipe(
          publish((t$) =>
            merge(
              t$.pipe(
                concatMap((t) => fromEvent(t, 'abort')),
                tap(() => done())
              ),
              t$.pipe(tap((t) => t.abort()))
            )
          )
        )
        .subscribe();
    });

    it('should error (case 1: add same key twice)', (done) => {
      db.transaction$('store1', 'readwrite')
        .pipe(
          concatMap((t) =>
            merge(
              t.objectStore('store1').add$('value1', 'key'),
              t.objectStore('store1').add$('value2', 'key')
            )
          )
        )
        .subscribe({
          error: (err) => {
            expect(err.name).to.equal('ConstraintError');
            done();
          },
        });
    });

    it('should error (case 2: async execution)', (done) => {
      db.transaction$('store1', 'readwrite')
        .pipe(
          // transactions operations must be scheduled synchronously!
          delay(0, asyncScheduler),
          concatMap((t) => t.objectStore('store1').add$('value', 'key'))
        )
        .subscribe({
          error: (err) => {
            expect(err.name).to.equal('InvalidStateError');
            done();
          },
        });
    });

    it.skip('should abort when unsubscribed', (done) => {
      db.transaction$('store1', 'readwrite')
        .pipe(
          concatMap((t) =>
            merge(
              t.objectStore('store1').put$('value', 'key'),
              t.objectStore('store1').put$('value', 'key'),
              t.objectStore('store1').put$('value', 'key'),
              t.objectStore('store1').put$('value', 'key'),
              t.objectStore('store1').put$('value', 'key')
            ).pipe(timeout(0, asyncScheduler))
          )
        )
        .subscribe({
          error: (err) => {
            expect(err).to.be.instanceOf(TimeoutError);
            // Check that the transaction was indeed aborted
            db.transaction('store1')
              .objectStore('store1')
              .get$('key')
              .subscribe((value) => {
                expect(value).to.equal(undefined);
                done();
              });
          },
        });
    });
  });
});
