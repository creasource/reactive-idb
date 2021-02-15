import { forkJoin } from 'rxjs';
import { concatMap, map, reduce, takeWhile, tap } from 'rxjs/operators';

import { ReactiveIDBDatabase, ReactiveIDBObjectStore } from '../../../src';

describe('ReactiveIDBObjectStore', () => {
  let store: ReactiveIDBObjectStore<{ index: string }>;

  const before = (done) => {
    ReactiveIDBDatabase.create({
      name: 'testDB',
      schema: [{ version: 1, stores: [{ name: 'store', indexes: ['index'] }] }],
    }).subscribe((db) => {
      store = db
        .transaction('store', 'readwrite')
        .objectStore<{ index: string }>('store');
      done();
    });
  };

  describe('Base methods', () => {
    beforeEach(before);

    afterEach((done) => {
      store.transaction.db.clear$().subscribe(() => done());
    });

    it('should have an autoIncrement property', () => {
      expect(store.autoIncrement).to.equal(false);
    });

    it('should have an indexNames property', () => {
      expect(store.indexNames.length).to.equal(1);
      expect(store.indexNames.contains('index')).to.equal(true);
      expect(store.indexNames.contains('unknown')).to.equal(false);
    });

    it('should have a keyPath property', () => {
      expect(store.keyPath).to.equal(null);
    });

    it('should have a name property', () => {
      expect(store.name).to.equal('store');
    });
  });

  describe('Observable API', () => {
    beforeEach(before);

    afterEach((done) => {
      store.transaction.db.clear$().subscribe(() => done());
    });

    it('should add$', (done) => {
      store.add$({ index: 'testValue' }, 'testKey').subscribe((key) => {
        expect(key).to.equal('testKey');
        done();
      });
    });

    it('should get$', (done) => {
      store
        .add$({ index: 'testValue' }, 'testKey')
        .pipe(concatMap((key) => store.get$(key)))
        .subscribe((value) => {
          expect(value).to.deep.equal({ index: 'testValue' });
          done();
        });
    });

    it('should clear$', (done) => {
      store
        .add$({ index: 'testValue' }, 'testKey')
        .pipe(concatMap(() => store.clear$()))
        .pipe(concatMap(() => store.get$('testKey')))
        .subscribe((value) => {
          expect(value).to.be.undefined;
          done();
        });
    });

    it('should count$', (done) => {
      store
        .add$({ index: 'testValue' }, 'testKey')
        .pipe(concatMap(() => store.count$()))
        .subscribe((value) => {
          expect(value).to.equal(1);
          done();
        });
    });

    it('should delete$', (done) => {
      store
        .add$({ index: 'testValue' }, 'testKey')
        .pipe(concatMap((key) => store.delete$(key)))
        .pipe(concatMap(() => store.get$('testKey')))
        .subscribe((value) => {
          expect(value).to.be.undefined;
          done();
        });
    });

    it('should getAll$', (done) => {
      forkJoin([
        store.add$({ index: 'testValue' }, 'testKey'),
        store.add$({ index: 'testValue2' }, 'testKey2'),
      ])
        .pipe(concatMap(() => store.getAll$(IDBKeyRange.bound('a', 'z'))))
        .subscribe((values) => {
          expect(values).to.have.length(2);
          expect(values).to.eql([
            { index: 'testValue' },
            { index: 'testValue2' },
          ]);
          done();
        });
    });

    it('should getAllKeys$', (done) => {
      forkJoin([
        store.add$({ index: 'testValue' }, 'testKey'),
        store.add$({ index: 'testValue2' }, 'testKey2'),
      ])
        .pipe(concatMap(() => store.getAllKeys$(IDBKeyRange.bound('a', 'z'))))
        .subscribe((values) => {
          expect(values).to.have.length(2);
          expect(values).to.eql(['testKey', 'testKey2']);
          done();
        });
    });

    it('should getKey$', (done) => {
      forkJoin([
        store.add$({ index: 'testValue' }, 'testKey'),
        store.add$({ index: 'testValue2' }, 'testKey2'),
      ])
        .pipe(concatMap(() => store.getKey$(IDBKeyRange.bound('a', 'z'))))
        .subscribe((key) => {
          expect(key).to.equal('testKey');
          done();
        });
    });

    it('should put$', (done) => {
      store
        .add$({ index: 'testValue' }, 'testKey')
        .pipe(
          concatMap((key) => store.put$({ index: 'testValue2' }, key)),
          concatMap((key) => store.get$(key))
        )
        .subscribe((value) => {
          expect(value).to.deep.equal({ index: 'testValue2' });
          done();
        });
    });

    it('should openCursor$', (done) => {
      forkJoin([
        store.add$({ index: 'testValue' }, 'testKey'),
        store.add$({ index: 'testValue2' }, 'testKey2'),
      ])
        .pipe(
          concatMap(() =>
            store.openCursor$(IDBKeyRange.bound('a', 'z')).pipe(
              takeWhile((cursor) => !!cursor),
              tap((cursor) => cursor.continue()),
              map((cursor) => cursor.value as { index: string }),
              reduce((acc, curr) => [...acc, curr], [] as { index: string }[])
            )
          )
        )
        .subscribe((results) => {
          expect(results).to.eql([
            { index: 'testValue' },
            { index: 'testValue2' },
          ]);
          done();
        });
    });

    it('should openKeyCursor$', (done) => {
      forkJoin([
        store.add$({ index: 'testValue' }, 'testKey'),
        store.add$({ index: 'testValue2' }, 'testKey2'),
      ])
        .pipe(
          concatMap(() =>
            store.openKeyCursor$(IDBKeyRange.bound('a', 'z')).pipe(
              takeWhile((cursor) => !!cursor),
              tap((cursor) => cursor.continue()),
              map((cursor) => cursor.key),
              reduce((acc, curr) => [...acc, curr], [] as string[])
            )
          )
        )
        .subscribe((results) => {
          expect(results).to.eql(['testKey', 'testKey2']);
          done();
        });
    });
  });
});
