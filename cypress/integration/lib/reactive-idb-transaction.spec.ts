import {
  createReactiveDatabase,
  ReactiveIDBDatabase,
  ReactiveIDBTransaction,
} from '../../../src';

describe('ReactiveIDBTransaction', () => {
  let database: ReactiveIDBDatabase;
  let transaction: ReactiveIDBTransaction;

  describe('Base methods', () => {
    beforeEach((done) => {
      createReactiveDatabase({
        name: 'testDB',
        schema: [{ version: 1, stores: [{ name: 'store' }] }],
      }).subscribe((db) => {
        database = db;
        transaction = db.transaction('store', 'readonly');
        done();
      });
    });

    afterEach(() => {
      cy.deleteDatabase('testDB');
    });

    it('should have a db property', () => {
      expect(transaction.db).to.equal(database);
    });

    it('should have an objectStoreNames property', () => {
      expect(transaction.objectStoreNames.contains('store')).to.equal(true);
    });

    it('should have a mode property', () => {
      expect(transaction.mode).to.equal('readonly');
    });

    it('should have an error property', () => {
      expect(transaction.error).to.equal(null);
      transaction.objectStore('store').clear();
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
});
