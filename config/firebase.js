// include the express module using the require methood

const admin = require("firebase-admin");
/* Key that tells firebase that we are a reliable src
   How to generate in firebase: 
   Project settings -> Service accounts -> Generate new private key 
                    -> open key.js file -> paste the key generated.
*/
const credentials = require("./key.json");

// Init the application using the 'credentials
admin.initializeApp({
    credential: admin.credential.cert(credentials)
});

// Init the database 
const db = admin.firestore();

module.exports = { admin, db };