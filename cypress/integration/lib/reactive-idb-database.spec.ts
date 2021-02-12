import { concatMap, tap } from 'rxjs/operators';
import {
  createReactiveDatabase,
  ReactiveIDBDatabase,
} from '../../../src/lib/reactive-idb-database';

describe('ReactiveIDBDatabase', () => {
  const dbName = 'testDatabase';

  afterEach(() => cy.deleteDatabase(dbName));

  it('should have a name and a version', (done) => {
    createReactiveDatabase({ name: dbName }).subscribe((db) => {
      expect(db.name).to.equal(dbName);
      expect(db.version).to.equal(1);
      done();
    });
  });

  it('should create a database', (done) => {
    createReactiveDatabase({ name: dbName }).subscribe(() => {
      // Check that a database was created
      const onUpgradeNeeded = cy.spy((v) => expect(v.oldVersion).to.equal(0));
      const r = window.indexedDB.open(dbName);
      r.onupgradeneeded = onUpgradeNeeded;
      r.onsuccess = () => {
        expect(r.result.version).to.equal(1);
        expect(onUpgradeNeeded).to.not.have.been.called;
        r.result.close();
      };
      done();
    });
  });

  it('should create stores defined in schemas', (done) => {
    createReactiveDatabase({
      name: dbName,
      schema: [{ version: 1, stores: [{ name: 'testStore' }] }],
    }).subscribe(() => {
      const onUpgradeNeeded = cy.spy((v) => expect(v.oldersion).to.equal(0));
      const r = window.indexedDB.open(dbName);
      r.onupgradeneeded = onUpgradeNeeded;
      r.onsuccess = () => {
        expect(r.result.version).to.equal(1);
        expect(onUpgradeNeeded).to.not.have.been.called;
        expect(r.result.objectStoreNames.contains('testStore')).to.equal(true);
        r.result.close();
      };
      done();
    });
  });

  it('should have a version equal to the highest defined schema', (done) => {
    createReactiveDatabase({
      name: dbName,
      schema: [
        { version: 2, stores: [{ name: 'testStore' }] },
        { version: 1, stores: [{ name: 'testStore2' }] },
      ],
    }).subscribe((db) => {
      expect(db.version).to.equal(2);
      done();
    });
  });

  it('should execute custom onUpgrade', (done) => {
    const onUpgrade = cy.spy(
      (db: IDBDatabase, oldV, newV, trans: IDBTransaction) => {
        expect(oldV).to.equal(0);
        expect(newV).to.equal(2);
        trans.objectStore('testStore').createIndex('test', 'test');
      }
    );

    createReactiveDatabase({
      name: dbName,
      schema: [{ version: 2, stores: [{ name: 'testStore' }] }],
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

  it('should create store indexes', (done) => {
    createReactiveDatabase({
      name: dbName,
      schema: [
        {
          version: 1,
          stores: [
            { name: 'store1', indexes: [{ name: 'index1', keyPath: 'index' }] },
          ],
        },
        {
          version: 2,
          stores: [
            { name: 'store2', indexes: [{ name: 'index2', keyPath: 'index' }] },
          ],
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

  it('should auto-close on version change by default', (done) => {
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
              expect(() => db1.objectStore('store')).to.throw;
              expect(() => db2.objectStore('store2')).to.not.throw;
              done();
            })
          )
        )
      )
      .subscribe();
  });

  it('should close on version change (with addEventListener)', (done) => {
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
              expect(() => db1.objectStore('store')).to.throw;
              expect(() => db2.objectStore('store2')).to.not.throw;
              done();
            })
          )
        )
      )
      .subscribe();
  });

  // it('should return store', () => {
  //   const db = new ReactiveIDBDatabase({
  //     name: dbName,
  //     schema: [
  //       {
  //         version: 1,
  //         stores: [
  //           { name: 'store1', indexes: [{ name: 'index1', keyPath: 'index' }] },
  //         ],
  //       },
  //     ],
  //   });
  //
  //   cy.wrap(db.objectStore('store1').toPromise()).then(
  //     (store: ReactiveIDBObjectStore) => {
  //       expect(store).to.be.instanceOf(ReactiveIDBObjectStore);
  //     }
  //   );
  // });
});
