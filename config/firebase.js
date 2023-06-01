// include the express module using the require methood

import admin from 'firebase-admin';
import crypto from 'crypto';

/* Key that tells firebase that we are a reliable src
   How to generate in firebase: 
   Project settings -> Service accounts -> Generate new private key 
                    -> open key.js file -> paste the key generated.
*/
import credentials from './key.json' assert { type: "json" };

// Init the application using the 'credentials
const app = admin.initializeApp({
    credential: admin.credential.cert(credentials),
    projectId: credentials.project_id,
    databaseURL: 'https://instafoodies-b1767-default-rtdb.firebaseio.com'

});

// Init the database 
const db = admin.firestore();

export { app, crypto, admin, db };