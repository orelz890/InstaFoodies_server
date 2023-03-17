// include the express module using the ES6 import syntax
import express from 'express';
const app = express();

import admin from 'firebase-admin';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import credentials from './key.json' assert { type: "json" };

// Init the application using the 'credentials
admin.initializeApp({
    credential: admin.credential.cert(credentials),
    projectId: credentials.project_id

});

// Init the database 
const db = admin.firestore();

// POST will have a body of type json so we need to enable json in express.
app.use(express.json());

app.use(express.urlencoded({extended: true}));


/**
 * Creating a new user if don't exist already.
 * When singing up the app will send a post request to the server.
 * It will get the route and the call back func that will be exacuted when any request to this route comes.
 * @param name the first {@code string}
 * @param email the second {@code string}
 * @param password the third {@code string}
 * @returns Void
 */
app.post('/signup', async (req, res) => {

    try{
        // This is the body of the request. We constructed an object from this data.
        const id = req.body.email;


        // console.log("in signup");

        const newUserJson = {
            name: req.body.name,
            email: req.body.email,
            password: req.body.password
        };
            
        // Adding this user to our database
        const user = db.collection("users").doc(id).get();
        if (!(await user).exists){
            const response = await db.collection("users").doc(id).set(newUserJson);
            console.log("signup: Client " + req.body.email + " signed up");
            res.status(200).send();
        }else {
            res.status(400).send();
            console.log("signup: User {" + (await user).data().email +  "} already exist..");
        }

    } catch(error) {
        res.status(400).send(error);
    }
});



/**
 * Loging in if user exists
 * @param email the only {@code string}
 * @returns User {@code Response}
 */
app.post('/login', async (req, res) => {
    
    // This is the body of the request. We constructed an object from this data.
    const id = req.body.email;

    // console.log("in login");
        
    // Adding this user to our database
    const user = db.collection("users").doc(id).get()
    .then(doc => {
        if (doc.exists) {
            const jsonData = JSON.stringify(doc.data());
            console.log(jsonData);
            res.status(200).send(jsonData);

        } else {
            console.log('login: Document not found!');
        }
    }).catch(error => {
        console.log('login: Error getting document:', error);
        res.status(400).send(error);

    });
});



/**
 * Returns a specific user
 * @param email {@code string}
 * @returns User {@code Response}
 */
app.get('/getUser/:email', async (req, res) => {
    
    const id = req.params.email;

    console.log("in getUser: " + id);

    db.collection("users").doc(id).get()
    .then(doc => {
        if (doc.exists) {
            const jsonData = JSON.stringify(doc.data());
            console.log(jsonData);
            res.status(200).send(jsonData);

        } else {
            console.log('getUser: Document not found!');
        }
    }).catch(error => {
        console.log('getUser: Error getting document:', error);
        res.status(400).send(error);

    });
});




/**
 * Updates user info
 * @param email {@code string}
 * @body map {@code map<String, String>}
 * @returns User {@code Response}
 */
app.patch('/patchUser/:email', async (req, res) => {
    
    const { body, params: {email}} = req;
    const { password } = body;
    const id = email;
    console.log("in patchUser: " + email);

    const newUserJson = {
        password: password
    };

    console.log("in patchUser");

    await db.collection("users").doc(id).update(newUserJson)
    .then(() => {
        res.status(200).send();
        console.log("patchUser: Successfully updated user- {" + id + "}");
        })
    .catch((error) => {
        res.status(400).send();
        console.log("patchUser: Failed to update user- {" + id + "}");
    });
});


/**
 * Delete an object assosiated with @id from the given reference in firebase. 
 * @param ref the first {@code string}
 * @param id the second {@code string}
 * @returns Void
 */
app.delete('/deleteObjectFromRef/:ref/:email', async (req, res) => {
    console.log("im in delete");
    const { params: {ref , email}} = req;
    const id = email; // get the ID of the document to delete
    console.log('ref = ' + ref + ', id = ' + id);

    await db.collection(ref).doc(id).delete()
      .then(() => {
        console.log('Document deleted successfully');
        res.status(200).send();
      })
      .catch((error) => {
        console.error(error);
        res.status(400).send();
      });
  });



/* Start to listen
   If planning to deploy this app to cloud application some times the port is not 8080 by defualt so it will take whatever port that is open for there case.
*/
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log("Server is running on PORT " + PORT + ".");
});