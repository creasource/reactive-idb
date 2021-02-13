import { concatMap, tap } from 'rxjs/operators';
import { createReactiveDatabase } from '../../../src';

describe('createReactiveDatabase', () => {
  const dbName = 'createTestDatabase';

  afterEach(() => cy.deleteDatabase(dbName));

  it('should not create a database if not subscribed', (done) => {
    createReactiveDatabase({ name: dbName });

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
    createReactiveDatabase({ name: dbName }).subscribe(() => {
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
    createReactiveDatabase({
      name: dbName,
      schema: [{ version: 1, stores: ['testStore'] }],
    }).subscribe(() => {
      const onUpgradeNeeded = cy.spy((v) => expect(v.oldersion).to.equal(0));
      const r = window.indexedDB.open(dbName);
      r.onupgradeneeded = onUpgradeNeeded;
      r.onsuccess = () => {
        expect(r.result.version).to.equal(1);
        expect(onUpgradeNeeded).to.not.have.been.called;
        expect(r.result.objectStoreNames.contains('testStore')).to.equal(true);
        r.result.close();
        done();
      };
    });
  });

  it('should accept several versioned schemas', (done) => {
    createReactiveDatabase({
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

    createReactiveDatabase({
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
    createReactiveDatabase({
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
    createReactiveDatabase({
      name: dbName,
      schema: [{ version: 1, stores: [{ name: 'store' }] }],
    }).subscribe((db) => {
      db.close();
      expect(() => db.objectStore('store')).to.throw;
      done();
    });
  });

  it('should create a database that auto-closes on version change', (done) => {
    // noinspection DuplicatedCode
    createReactiveDatabase({
      name: dbName,
      schema: [{ version: 1, stores: [{ name: 'store' }] }],
    })
      .pipe(
        concatMap((db1) =>
          createReactiveDatabase({
            name: dbName,
            schema: [
              { version: 1, stores: [{ name: 'store' }] },
              { version: 2, stores: [{ name: 'store2' }] },
            ],
          }).pipe(
            tap((db2) => {
              expect(db1.version).to.equal(1);
              expect(db2.version).to.equal(2);
              expect(() => db1.objectStore('store')).to.throw;
              expect(() => db2.objectStore('store2')).to.not.throw;
              done();
            })
          )
        )
      )
      .subscribe();
  });

  it('should accept an autoCloseOnVersionChange option', (done) => {
    // noinspection DuplicatedCode
    createReactiveDatabase({
      name: dbName,
      schema: [{ version: 1, stores: [{ name: 'store' }] }],
      autoCloseOnVersionChange: false,
    })
      .pipe(
        tap((db) => db.addEventListener('versionchange', () => db.close())),
        concatMap((db1) =>
          createReactiveDatabase({
            name: dbName,
            schema: [
              { version: 1, stores: [{ name: 'store' }] },
              { version: 2, stores: [{ name: 'store2' }] },
            ],
          }).pipe(
            tap((db2) => {
              expect(db1.version).to.equal(1);
              expect(db2.version).to.equal(2);
              expect(() => db1.objectStore('store')).to.throw;
              expect(() => db2.objectStore('store2')).to.not.throw;
              done();
            })
          )
        )
      )
      .subscribe();
  });

  it('should accept an onBlocked option', (done) => {
    // noinspection DuplicatedCode
    createReactiveDatabase({
      name: dbName,
      schema: [{ version: 1, stores: [{ name: 'store' }] }],
      autoCloseOnVersionChange: false,
    })
      .pipe(
        concatMap((db1) => {
          const onBlocked = cy.spy(() => db1.close());

          return createReactiveDatabase({
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
