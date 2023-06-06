// include the express module using the require methood

import admin from 'firebase-admin';
// import Storage from 'firebase-storage';
// import * as functions from 'firebase-functions';
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
    databaseURL: 'https://instafoodies-b1767-default-rtdb.firebaseio.com',
    storageBucket: "instafoodies-b1767.appspot.com/"
});

// exports.sendNotification = function.database.ref()

// Init the database 
const db = admin.firestore();
const bucket = admin.storage().bucket();


export {bucket, app, crypto, admin, db };
