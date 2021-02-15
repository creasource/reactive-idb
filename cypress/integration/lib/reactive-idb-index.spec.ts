import { forkJoin } from 'rxjs';
import { concatMap, map, reduce, takeWhile, tap } from 'rxjs/operators';

import { ReactiveIDBDatabase, ReactiveIDBIndex } from '../../../src';

describe('ReactiveIDBIndex', () => {
  let index: ReactiveIDBIndex<{ index: string }>;

  const before = (done) => {
    ReactiveIDBDatabase.create({
      name: 'testDB',
      schema: [{ version: 1, stores: [{ name: 'store', indexes: ['index'] }] }],
    }).subscribe((db) => {
      index = db
        .transaction('store', 'readwrite')
        .objectStore<{ index: string }>('store')
        .index('index');
      done();
    });
  };

  describe('Base methods', () => {
    beforeEach(before);

    afterEach((done) => {
      index.objectStore.transaction.db.clear$().subscribe(() => done());
    });

    it('should have a multiEntry property', () => {
      expect(index.multiEntry).to.equal(false);
    });

    it('should have a unique property', () => {
      expect(index.unique).to.equal(false);
    });

    it('should have a keyPath property', () => {
      expect(index.keyPath).to.equal('index');
    });

    it('should have a name property', () => {
      expect(index.name).to.equal('index');
    });
  });

  describe('Observable API', () => {
    beforeEach(before);

    afterEach((done) => {
      index.objectStore.transaction.db.clear$().subscribe(() => done());
    });

    it('should get$', (done) => {
      index.objectStore
        .add$({ index: 'testValue' }, 'testKey')
        .pipe(concatMap(() => index.get$('testValue')))
        .subscribe((value) => {
          expect(value).to.deep.equal({ index: 'testValue' });
          done();
        });
    });

    it('should count$', (done) => {
      index.objectStore
        .add$({ index: 'testValue' }, 'testKey')
        .pipe(concatMap(() => index.count$()))
        .subscribe((value) => {
          expect(value).to.equal(1);
          done();
        });
    });

    it('should getAll$', (done) => {
      forkJoin([
        index.objectStore.add$({ index: 'testValue' }, 'testKey'),
        index.objectStore.add$({ index: 'testValue2' }, 'testKey2'),
      ])
        .pipe(concatMap(() => index.getAll$(IDBKeyRange.bound('a', 'z'))))
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
        index.objectStore.add$({ index: 'testValue' }, 'testKey'),
        index.objectStore.add$({ index: 'testValue2' }, 'testKey2'),
      ])
        .pipe(concatMap(() => index.getAllKeys$(IDBKeyRange.bound('a', 'z'))))
        .subscribe((values) => {
          expect(values).to.have.length(2);
          expect(values).to.eql(['testKey', 'testKey2']);
          done();
        });
    });

    it('should getKey$', (done) => {
      forkJoin([
        index.objectStore.add$({ index: 'testValue' }, 'testKey'),
        index.objectStore.add$({ index: 'testValue2' }, 'testKey2'),
      ])
        .pipe(concatMap(() => index.getKey$(IDBKeyRange.bound('a', 'z'))))
        .subscribe((key) => {
          expect(key).to.equal('testKey');
          done();
        });
    });

    it('should openCursor$', (done) => {
      forkJoin([
        index.objectStore.add$({ index: 'testValue' }, 'testKey'),
        index.objectStore.add$({ index: 'testValue2' }, 'testKey2'),
      ])
        .pipe(
          concatMap(() =>
            index.openCursor$(IDBKeyRange.bound('a', 'z')).pipe(
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
        index.objectStore.add$({ index: 'testValue' }, 'testKey'),
        index.objectStore.add$({ index: 'testValue2' }, 'testKey2'),
      ])
        .pipe(
          concatMap(() =>
            index.openKeyCursor$(IDBKeyRange.bound('a', 'z')).pipe(
              takeWhile((cursor) => !!cursor),
              tap((cursor) => cursor.continue()),
              map((cursor) => cursor.key),
              reduce((acc, curr) => [...acc, curr], [] as string[])
            )
          )
        )
        .subscribe((results) => {
          expect(results).to.eql(['testValue', 'testValue2']);
          done();
        });
    });
  });
});
