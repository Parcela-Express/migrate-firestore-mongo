const _ = require("lodash");

const config = require("./config");
const admin = require('firebase-admin');
const firebase = require('firebase/app');

const getProductionConnection = (configContent) => {
  const applicationCredentials = _.get(configContent, "firestore.applicationCredentials");
  const serviceAccount = _.get(configContent, "firestore.serviceAccount");
  const privateKey = _.get(configContent, "firestore.privateKey");

  const credentials = JSON.parse(applicationCredentials.replace(/\'/gi, '"'));
  const data = {
    apiKey: credentials.api_key,
    ...credentials,
    ...credentials.api_key,
  };
  delete data.api_key;
  
  firebase.initializeApp(data);

  const serviceUser = JSON.parse(serviceAccount.replace(/\'/gi, '"'));
  serviceUser.private_key = privateKey.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert(serviceUser),
  });

  admin.firestore().settings({
    ignoreUndefinedProperties: true,
  });

  return admin.firestore();
}

const getDevelopmentConnection = (configContent) => {
  const firestoreLocalProjectId = _.get(configContent, "firestore.localProjectId");
  const firestoreLocalApiKey = _.get(configContent, "firestore.localApiKey");
  const firestoreLocalHost = _.get(configContent, "firestore.localHost");

  process.env.GCLOUD_PROJECT = firestoreLocalProjectId;

  if (! firebase.apps || !firebase.apps.length) {
    admin.initializeApp({
      projectId: firestoreLocalProjectId
    });

    const firebaseConfig = {
      apiKey: firestoreLocalApiKey,
      projectId: firestoreLocalProjectId,
    };
    firebase.initializeApp(firebaseConfig);    

    admin.firestore().settings({
      host: firestoreLocalHost,
      ignoreUndefinedProperties: true,
      ssl: false,
    });
  }

  return admin.firestore();
}

module.exports = {
  async connect() {
    const configContent = await config.read();

    const isLocal = _.get(configContent, "firestore.isLocal");

    if (isLocal) {
      return getDevelopmentConnection(configContent);
    }
    return getProductionConnection(configContent);
  }
};
