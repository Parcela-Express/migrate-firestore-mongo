const config = {
  firestore: {
    isLocal: false,
    applicationCredentials: process.env.FIREBASE_APPLICATION_CREDENTIALS,
    serviceAccount: process.env.FIREBASE_SERVICE_ACCOUNT,
    privateKey: process.env.FIREBASE_PRIVATE_KEY
  },
  mongodb: {    
    url: process.env.MONGODB_URL,
    databaseName: process.env.MONGODB_DATABASE_NAME,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true      
    }
  },
  migrationsDir: "imports",
  importsCollectionName: "imports",
  migrationFileExtension: ".ts",
  useFileHash: false
};
  
module.exports = config;