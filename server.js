// include the express module using the require methood
const express = require("express");
const app = express();

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
    
    try{
        // This is the body of the request. We constructed an object from this data.
        const id = req.body.email;

        // console.log("in login");
            
        // Adding this user to our database
        const user = db.collection("users").doc(id).get();
        if ((await user).exists){
            console.log("login: Client " + id + " loged in");
            res.status(200).send(user);
        }else {
            res.status(400).send(user);
            console.log("login: User don't exist..");
        }

    } catch(error) {
        res.status(400).send(error);
    }
});


/**
 * Returns a specific user
 * @param email {@code string}
 * @returns User {@code Response}
 */
app.get('/getUser/:email', async (req, res) => {
    
    try{
        const id = req.params.email;

        console.log("in getUser: " + id);

        const user = db.collection("users").doc(id).get();
        if ((await user).exists){
            // const userData = user.data;
            res.status(200).json(user);
            console.log("getUser: the user name is - {" + user + "}");
        }else {
            res.status(400).send(null);
            console.log("getUser: User don't exist..");
        }

    } catch(error) {
        console.error(error);
        res.status(400).send(error);
    }
});




/**
 * Updates user info
 * @param email {@code string}
 * @body map {@code map<String, String>}
 * @returns User {@code Response}
 */
app.patch('/patchUser/:email', async (req, res) => {
    
    try{
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

    } catch(error) {
        console.error(error);
        res.status(400).send(error);
    }
});




// /**
//  * Delete an object assosiated with @id from the given reference in firebase. 
//  * @param ref the first {@code string}
//  * @param id the second {@code string}
//  * @returns Void
//  */
// app.delete('/deleteObjectFromRef/:ref/:id', async (req, res) => {
//     console.log("im in delete");
//     const ref = req.params.ref; // get the document reference from the URL path parameters
//     const id = req.params.id; // get the ID of the document to delete
  
//     db.collection(ref).doc(id).delete()
//       .then(() => {
//         console.log('Document deleted successfully');
//         res.status(200).send();
//       })
//       .catch((error) => {
//         console.error(error);
//         res.status(400).send();
//       });
//   });


/**
 * Delete an object assosiated with @id from the given reference in firebase. 
 * @param ref the first {@code string}
 * @param id the second {@code string}
 * @returns Void
 */
app.delete('/deleteObjectFromRef/:email', async (req, res) => {
    console.log("im in delete");
    const ref = "users"; // get the document reference from the URL path parameters
    const id = req.params.email; // get the ID of the document to delete
  
    db.collection(ref).doc(id).delete()
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