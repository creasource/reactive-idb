# reactive-idb

A reactive wrapper to IndexedDB using Rxjs, written in TypeScript.

[![license](https://badgen.net/github/license/creasource/reactive-idb)](https://github.com/CreaSource/reactive-idb/blob/main/LICENSE)
[![npm version](https://badgen.net/npm/v/@creasource/reactive-idb)](https://www.npmjs.com/package/@creasource/reactive-idb)
[![size](https://badgen.net/bundlephobia/minzip/@creasource/reactive-idb)](https://bundlephobia.com/result?p=@creasource/reactive-idb)
[![tree-shaking](https://badgen.net/bundlephobia/tree-shaking/@creasource/reactive-idb)](https://bundlephobia.com/result?p=@creasource/reactive-idb)
[![Build & Test](https://github.com/CreaSource/reactive-idb/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/CreaSource/reactive-idb/actions/workflows/test.yml)
[![cypress](https://img.shields.io/endpoint?url=https://dashboard.cypress.io/badge/detailed/93mszd&style=flat&logo=cypress)](https://dashboard.cypress.io/projects/93mszd/runs)
---

# Table of Contents
  
- **[Installation](#installation)**
  
- **[Usage](#usage)**
  
  - **[1. Databases](#1-databases)**
    
    - [Get a reactive database from an existing IDBDatabase](#get-a-reactive-database-from-an-existing-idbdatabase)
    - [Create an empty database from scratch](#create-an-empty-database-from-scratch)
    - [Define a schema for stores and indexes](#define-a-schema-for-stores-and-indexes)
    - [Upgrade a database](#upgrade-a-database)
    - [Use a custom `onUpgrade` function](#use-a-custom-onupgrade-function)
    - [Delete a database](#delete-a-database)
    
  - **[2. Transactions](#2-transactions)**
    
    - [Obtain a transaction](#obtain-a-transaction)
    - [Transactions lifecycle](#transactions-lifecycle)
    
  - **[3. Object stores and indexes](#3-object-stores-and-indexes)**
    
    - [Base object stores](#base-object-stores)
    - [Typed object stores](#typed-object-stores)
    - [Working with cursors](#working-with-cursors)
  
- **[Contribute](#contribute)**
  
- **[License](#license)**

---

# Installation

**reactive-idb** is available both on the npm and the github registry.

```shell
$ npm install @creasource/reactive-idb
# Or
$ yarn add @creasource/reactive-idb
```

---

# Usage

## 1. Databases

### Get a reactive database from an existing IDBDatabase

```typescript
import { ReactiveIDBDatabase } from '@creasource/reactive-idb';

// Say you have an existing IDBDatabase
let db: IDBDatabase;

// Simply use the ReactiveIDBDatabase constructor
const reactiveDb = new ReactiveIDBDatabase(db)
```

### Create an empty database from scratch

```typescript
import { ReactiveIDBDatabase } from '@creasource/reactive-idb';

const db$ = ReactiveIDBDatabase.create({ name: 'myDatabase' })

// Effectively creates an empty database named "myDatabase"
db$.subscribe();
```

### Define a schema for stores and indexes

```typescript
import { ReactiveIDBDatabase } from '@creasource/reactive-idb';

// Creates a database with two stores
ReactiveIDBDatabase.create({ 
  name: 'myDatabase',
  schema: [{ version: 1, stores: ['myStore1', 'myStore2'] }]
}).subscribe();

// Complete example, creates a store with options and indexes
ReactiveIDBDatabase.create({
  name: 'myOtherDatabase',
  schema: [
    {
      version: 1,
      stores: [
        {
          // Creates a store named myStore
          name: 'myStore',
          // Pass IDBObjectStoreParameters
          options: { autoIncrement: true },
          indexes: [
            // Creates an index named "myIndex" with a keyPath of "myIndex"
            'myIndex',
            {
              // Specify the name and keyPath of this index explicitly
              name: 'index',
              keyPath: 'path',
              // Pass IDBIndexParameters
              options: { unique: true },
            },
          ],
        },
      ],
    },
  ],
}).subscribe();
```

### Upgrade a database

```typescript
import { ReactiveIDBDatabase } from '@creasource/reactive-idb';

// If current db version is 0 this will create 4 stores.
// If current db version is 1 this will create 2 additional stores.
// Final database version will be 2.
ReactiveIDBDatabase.create({ 
  name: 'myDatabase',
  schema: [
    { version: 1, stores: ['myStore1', 'myStore2'] },
    { version: 2, stores: ['myStore3', 'myStore4'] }
  ],
}).subscribe();
```

### Use a custom `onUpgrade` function

```typescript
import { ReactiveIDBDatabase } from '@creasource/reactive-idb';

// You can pass an onUpgrade function for more control over the upgrade process
ReactiveIDBDatabase.create({ 
  name: 'myDatabase',
  schema: [
    { version: 1, stores: ['myStore1', 'myStore2'] },
    { version: 2, stores: ['myStore3', 'myStore4'] }
  ],
  onUpgrade: (
    database: IDBDatabase,
    oldVersion: number,
    newVersion: number | null,
    transaction: IDBTransaction
  ) => {
    if (oldVersion < 2) {
      transaction.objectStore('myStore1').createIndex('index', 'keyPath');
    }
  }
}).subscribe();
```

### Delete a database

```typescript
import { ReactiveIDBDatabase } from '@creasource/reactive-idb';
import { concatMap, shareReplay } from 'rxjs/operators';

// Create a database
const db$ = ReactiveIDBDatabase.create({ name: 'myDatabase' }).pipe(
  shareReplay(1)
);

// Do something with it
db$.subscribe(db => console.log(db));

// Later... delete the database
db$.pipe(concatMap(db => db.clear$())).subscribe();
```

## 2. Transactions

### Obtain a transaction

```typescript
import { ReactiveIDBDatabase } from '@creasource/reactive-idb';
import { concatMap } from 'rxjs/operators';

const db$ = ReactiveIDBDatabase.create({
  name: 'myDatabase',
  schema: [{ version: 1, stores: ['myStore1', 'myStore2'] }],
});

// Use the observable API to get a transaction by calling `transaction$` on the database
db$.pipe(
  // Get a transaction with our two stores in scope in readwrite mode
  concatMap(db => db.transaction$(['myStore1', 'myStore2'], 'readwrite')),
  concatMap(transaction => merge(
    // Do some operations
    transaction.objectStore('myStore1').add$('value1', 'key1'),
    transaction.objectStore('myStore2').add$('value2', 'key2'),
  ))
).subscribe({
  next: (key) => console.log(key), // Logs "key1" and "key2"
  error: (err) => console.error(err),
  complete: () => console.log('Transaction was successful')
});
```

### Transactions lifecycle

You must be careful to schedule the transaction operations in a synchronous scheduler.

```typescript
import { ReactiveIDBDatabase } from '@creasource/reactive-idb';
import { asyncScheduler } from 'rxjs';
import { concatMap } from 'rxjs/operators';

const db$ = ReactiveIDBDatabase.create({
  name: 'myDatabase',
  schema: [{ version: 1, stores: ['myStore1'] }],
});

// Following code will log an error.
db$.pipe(
  concatMap(db => db.transaction$('myStore1')),
  // Schedule following operations asynchronously (don't do this)
  delay(0, asyncScheduler),
  concatMap(transaction => transaction.objectStore('myStore1').add$('value1', 'key1'))
).subscribe({
  error: (err) => console.error(err), // Logs an InvalidStateError (transaction has finished)
});
```

## 3. Object stores and indexes

### Base object stores

```typescript
import { ReactiveIDBDatabase } from '@creasource/reactive-idb';
import { concatMap } from 'rxjs/operators';

const db$ = ReactiveIDBDatabase.create({
  name: 'myDatabase',
  schema: [{ version: 1, stores: ['myStore1'] }],
});

db$.pipe(
  concatMap(db => db.transaction$('myStore1', 'readwrite')),
  map(transaction => transaction.objectStore('myStore1')),
  concatMap(objectStore => merge(
    objectStore.add$('value', 'key1'),
    objectStore.put$('value', 'key2'),
    objectStore.delete$('key3'),
    objectStore.count$(),
  ))
).subscribe({
  next: (value) => console.log(value),
});
```

### Typed object stores

```typescript
import { ReactiveIDBDatabase } from '@creasource/reactive-idb';
import { concatMap } from 'rxjs/operators';

interface User {
  id: number;
  name: string
}

const db$ = ReactiveIDBDatabase.create({
  name: 'myDatabase',
  schema: [{ version: 1, stores: ['users'] }],
});

db$.pipe(
  concatMap(db => db.transaction$('users', 'readwrite')),
  map(transaction => transaction.objectStore<User>('users')),
  concatMap(objectStore => 
    // You can only add Users to this store
    objectStore.add$({ id: 1, name: 'John Doe' }, 'key1').pipe(
      concatMap(key => objectStore.get$(key)),
      map(user => user.name) // 'user' is typed as User
    )
  ),
).subscribe({
  next: (value) => console.log(value), // Logs "John Doe"
});
```

### Working with cursors

```typescript
import { ReactiveIDBDatabase } from './reactive-idb-database';

let db$: ReactiveIDBDatabase;

db$.pipe(
  concatMap(db => db.transaction$('myStore1', 'readwrite')),
  concatMap(transaction =>
    transaction.objectStore('myStore1').openCursor$().pipe(
      takeWhile(cursor => !!cursor),
      tap(cursor => cursor.continue()),
      map(cursor => cursor.value),
    )
  )
).subscribe({
  next: (value) => console.log(value), // Logs all objects in store
});
```

---

# Contribute

They are many ways you can contribute to **reactive-idb** !

* Star the project
* Report a bug
* Open a pull request
* Start a discussion to share your ideas
* Become a sponsor

---

# License

MIT License

Copyright (c) 2019 Thomas Gambet

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
