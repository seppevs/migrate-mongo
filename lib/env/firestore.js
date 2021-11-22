const _ = require("lodash");
const config = require("./config");
const admin = require('firebase-admin');
const firebase = require('firebase/app');

module.exports = {
  async connect() {
    const configContent = await config.read();
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
};
