# reactive-idb

A reactive wrapper to IndexedDB using Rxjs.

[![<ORG_NAME>](https://circleci.com/gh/CreaSource/reactive-idb.svg?style=shield)](https://circleci.com/gh/CreaSource/reactive-idb)

WORK IN PROGRESS

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

```shell
npm install @creasource/reactive-idb rxjs
# Or
yarn add @creasource/reactive-idb rxjs
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
    { version: 2, stores: ['myStore2', 'myStore3'] }
  ],
}).subscribe();
```

### Use a custom onUpgrade function

```typescript
import { ReactiveIDBDatabase } from '@creasource/reactive-idb';

// You can pass an onUpgrade function for more control over the upgrade process
ReactiveIDBDatabase.create({ 
  name: 'myDatabase',
  schema: [
    { version: 1, stores: ['myStore1', 'myStore2'] },
    { version: 2, stores: ['myStore2', 'myStore3'] }
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
const db$ = ReactiveIDBDatabase.create({ name: 'myDatabase' }).pipe(shareReplay(1));

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
  delay(0, asyncScheduler), // Note: using the asapScheduler would have been fine
  concatMap(transaction => transaction.objectStore('myStore1').add$('value1', 'key1'))
).
subscribe({
  error: (err) => console.error(err), // Logs an InvalidStateError (transaction has finished)
});
```

## 3. Object stores and indexes

### Base object stores

TODO

### Typed object stores

TODO

### Working with cursors

TODO

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
