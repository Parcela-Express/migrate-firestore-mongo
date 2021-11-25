# Migrate Firestore Mongo

migrate-firestore-mongo is a database migration tool for MongoDB running in Node.js 
    
## Installation
````bash
$ npm install -g @parcelaexpress/migrate-firestore-mongo
````

## CLI Usage
````
$ migrate-firestore-mongo
Usage: migrate-firestore-mongo [options] [command]


  Commands:

    init                  initialize a new migration project
    create [description]  create a new database migration with the provided description
    run [options]          run all unapplied database migrations    
    status [options]      print the changelog of the database

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
````

## Basic Usage
### Initialize a new project
Make sure you have [Node.js](https://nodejs.org/en/) 10 (or higher) installed.  

Create a directory where you want to store your migrations for your mongo database (eg. 'albums' here) and cd into it
````bash
$ mkdir albums-migrations
$ cd albums-migrations
````

Initialize a new migrate-firestore-mongo project
````bash
$ migrate-firestore-mongo init
Initialization successful. Please edit the generated migrate-firestore-mongo-config.js file
````

The above command did two things: 
1. create a sample 'migrate-firestore-mongo-config.js' file and 
2. create a 'migrations' directory

Edit the migrate-firestore-mongo-config.js file. An object or promise can be returned. Make sure you change the mongodb url: 
````javascript
// In this file you can configure migrate-firestore-mongo

module.exports = {
  firestore: {
    applicationCredentials: 'YOURFIREBASEAPPLICATIONCREDENTIALS',
    serviceAccount: 'YOURFIREBASESERVICEACCOUNT',
    privateKey: 'YOURFIREBASEPRIVATEKEY'
  },
  mongodb: {
    // TODO Change (or review) the url to your MongoDB:
    url: "mongodb://localhost:27017",

    // TODO Change this to your database name:
    databaseName: "YOURDATABASENAME",

    options: {
      useNewUrlParser: true // removes a deprecation warning when connecting
      //   connectTimeoutMS: 3600000, // increase connection timeout to 1 hour
      //   socketTimeoutMS: 3600000, // increase socket timeout to 1 hour
    }
  },

  // The migrations dir, can be an relative or absolute path. Only edit this when really necessary.
  migrationsDir: "migrations",

  // The mongodb collection where the applied changes are stored. Only edit this when really necessary.
  importsCollectionName: "changelog",

  // The file extension to create migrations and search for in migration dir 
  migrationFileExtension: ".js"

  // Enable the algorithm to create a checksum of the file contents and use that in the comparison to determin
  // if the file should be run.  Requires that scripts are coded to be run multiple times.
  useFileHash: false
};
````

Alternatively, you can also encode your database name in the url (and leave out the `databaseName` property):
````
        url: "mongodb://localhost:27017/YOURDATABASE",
````

### Creating a new migration script
To create a new database migration script, just run the ````migrate-firestore-mongo create [description]```` command.

For example:
````bash
$ migrate-firestore-mongo create blacklist_the_beatles
Created: migrations/20160608155948-blacklist_the_beatles.js
````

A new migration file is created in the 'migrations' directory:
````javascript
module.exports = {
  search(firestoreConnection) {
    // TODO write your migration here. Return a stream
  },

  insert(mongodbConnection) {
    // TODO write the insert statements to mongo
  }
};
````

#### Example: Return a stream
````javascript
module.exports = {
  async search(firestoreConnection) {
    return db.collection('albums').stream();
  },

  async insert(rows, mongodbConnection) {
    return mongodbConnection.collection('albums').updateOne({artist: 'The Beatles'}, {$set: {blacklisted: false}});
  }
};
````

#### Overriding the sample migration
To override the content of the sample migration that will be created by the `create` command, 
create a file **`sample-migration.js`** in the migrations directory.

### Checking the status of the migrations
At any time, you can check which migrations are applied (or not)

````bash
$ migrate-firestore-mongo status
┌─────────────────────────────────────────┬────────────┐
│ Filename                                │ Applied At │
├─────────────────────────────────────────┼────────────┤
│ 20160608155948-blacklist_the_beatles.js │ PENDING    │
└─────────────────────────────────────────┴────────────┘

````


### Migrate up
This command will apply all pending migrations
````bash
$ migrate-firestore-mongo up
MIGRATED UP: 20160608155948-blacklist_the_beatles.js
````

If an an error occurred, it will stop and won't continue with the rest of the pending migrations

If we check the status again, we can see the last migration was successfully applied:
````bash
$ migrate-firestore-mongo status
┌─────────────────────────────────────────┬──────────────────────────┐
│ Filename                                │ Applied At               │
├─────────────────────────────────────────┼──────────────────────────┤
│ 20160608155948-blacklist_the_beatles.js │ 2016-06-08T20:13:30.415Z │
└─────────────────────────────────────────┴──────────────────────────┘
````

## Advanced Features

### Using a custom config file
All actions (except ```init```) accept an optional ````-f```` or ````--file```` option to specify a path to a custom config file.
By default, migrate-firestore-mongo will look for a ````migrate-firestore-mongo-config.js```` config file in of the current directory.

#### Example:

````bash
$ migrate-firestore-mongo status -f '~/configs/albums-migrations.js'
┌─────────────────────────────────────────┬────────────┐
│ Filename                                │ Applied At │
├─────────────────────────────────────────┼────────────┤
│ 20160608155948-blacklist_the_beatles.js │ PENDING    │
└─────────────────────────────────────────┴────────────┘

````

### Using npm packages in your migration scripts
You can use use Node.js modules (or require other modules) in your migration scripts.
It's even possible to use npm modules, just provide a `package.json` file in the root of your migration project:

````bash
$ cd albums-migrations
$ npm init --yes
````

Now you have a package.json file, and you can install your favorite npm modules that might help you in your migration scripts.
For example, one of the very useful [promise-fun](https://github.com/sindresorhus/promise-fun) npm modules.

### Using a file hash algorithm to enable re-running updated files
There are use cases where it may make sense to not treat scripts as immutable items.  An example would be a simple collection with lookup values where you just can wipe and recreate the entire collection all at the same time.

```javascript
useFileHash: true
```

Set this config value to will enable tracking a hash of the file contents and will run a file with the same name again as long as the file contents have changes.  Setting this flag changes the behavior for every script and if this is enabled each script needs to be written in a manner where it can be re-run safefly.  A script of the same name and hash will not be executed again, only if the hash changes.

Now the status will also include the file hash in the output

```bash
┌────────────────────────────────────────┬──────────────────────────────────────────────────────────────────┬──────────────────────────┐
│ Filename                               │ Hash                                                             │ Applied At               │
├────────────────────────────────────────┼──────────────────────────────────────────────────────────────────┼──────────────────────────┤
│ 20160608155948-blacklist_the_beatles.js│ 7625a0220d552dbeb42e26fdab61d8c7ef54ac3a052254588c267e42e9fa876d │ 2021-03-04T15:40:22.732Z │
└────────────────────────────────────────┴──────────────────────────────────────────────────────────────────┴──────────────────────────┘

```

### Version
To know which version of migrate-firestore-mongo you're running, just pass the `version` option:

````bash
$ migrate-firestore-mongo version
````

## API Usage

```javascript
const {
  init,
  create,
  database,
  config,
  importData,  
  status
} = require('migrate-firestore-mongo');
```

### `init() → Promise`

Initialize a new migrate-firestore-mongo project
```javascript
await init();
```

The above command did two things: 
1. create a sample `migrate-firestore-mongo-config.js` file and 
2. create a `migrations` directory

Edit the `migrate-firestore-mongo-config.js` file. Make sure you change the mongodb url.

### `create(description) → Promise<fileName>`

For example:
```javascript
const fileName = await create('blacklist_the_beatles');
console.log('Created:', fileName);
```

A new migration file is created in the `migrations` directory.

### `database.connect() → Promise<{db: MongoDb, client: MongoClient}>`

Connect to a mongo database using the connection settings from the `migrate-firestore-mongo-config.js` file.

```javascript
const { db, client } = await database.connect();
```

### `config.read() → Promise<JSON>`

Read connection settings from the `migrate-firestore-mongo-config.js` file.

```javascript
const mongoConnectionSettings = await config.read();
```

### `config.set(yourConfigObject)`

Tell migrate-firestore-mongo NOT to use the `migrate-firestore-mongo-config.js` file, but instead use the config object passed as the first argument of this function.
When using this feature, please do this at the very beginning of your program.

Example:
```javascript
const { config, importData } = require('../lib/migrate-firestore-mongo');

const myConfig = {
    firestore: {
      applicationCredentials: 'YOURFIREBASEAPPLICATIONCREDENTIALS',
      serviceAccount: 'YOURFIREBASESERVICEACCOUNT',
      privateKey: 'YOURFIREBASEPRIVATEKEY'
    },
    mongodb: {
        url: "mongodb://localhost:27017/mydatabase",
        options: { useNewUrlParser: true }
    },
    migrationsDir: "migrations",
    importsCollectionName: "changelog",
    migrationFileExtension: ".ts"
};

config.set(myConfig);

// then, use the API as you normally would, eg:
await importData();
```