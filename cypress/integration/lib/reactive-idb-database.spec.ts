import {
  createReactiveDatabase,
  ReactiveIDBDatabase,
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

  afterEach(() => {
    cy.deleteDatabase('testDB');
  });

  context('Base methods', () => {
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
      expect(() => db.objectStore('store1')).to.throw;
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

  context('Additional methods', () => {
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
  });
});
