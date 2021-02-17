# reactive-idb

A reactive wrapper to IndexedDB using Rxjs.

[![<ORG_NAME>](https://circleci.com/gh/CreaSource/reactive-idb.svg?style=shield)](https://circleci.com/gh/CreaSource/reactive-idb)

WORK IN PROGRESS

---

# Table of Contents
  
- **[Installation](#installation)**
  
- **[Usage](#usage)**
  
  - **[1. Databases](#1-databases)**
    
    - [Database creation](#database-creation)
      - [Get a reactive database from an existing IDBDatabase](#get-a-reactive-database-from-an-existing-idbdatabase)
      - [Create an empty database from scratch](#create-an-empty-database-from-scratch)
      - [Define a schema for stores and indexes](#define-a-schema-for-stores-and-indexes)
      - [Upgrade a database](#upgrade-a-database)
      - [Use a custom `onUpgrade` function](#use-a-custom-onupgrade-function)
      - [Other creation options](#other-creation-options)
    - [Database deletion](#database-deletion)
    
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

### Database creation

You can create a `ReactiveIDBDatabase` either form an existing `IDBDatabase` or from scratch
by using the static `create` method.

#### Get a reactive database from an existing IDBDatabase

```typescript
import { ReactiveIDBDatabase } from '@creasource/reactive-idb';

// Say you have an existing IDBDatabase
let db: IDBDatabase;

// Simply use the ReactiveIDBDatabase constructor
const reactiveDb = new ReactiveIDBDatabase(db)
```

#### Create an empty database from scratch

```typescript
import { ReactiveIDBDatabase } from '@creasource/reactive-idb';

const db$ = ReactiveIDBDatabase.create({ name: 'myDatabase' })

// Effectively creates an empty database named "myDatabase"
db$.subscribe();
```

#### Define a schema for stores and indexes

#### Upgrade a database

#### Use a custom onUpgrade function

#### Other creation options

### Database deletion

## 2. Transactions

### Obtain a transaction

### Transactions lifecycle

## 3. Object stores and indexes

### Base object stores

### Typed object stores

### Working with cursors

---

# Contribute

They are many ways you can contribute to **reactive-idb** !

* Give the project a star
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
