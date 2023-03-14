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
 * @returns User {@code Response}
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
            res.status(200).send(response);
        }else {
            res.status(400).send(user);
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
app.post('/getuser', async (req, res) => {
    
    try{
        const id = req.body.email;

        // console.log("in getuser");

        const user = db.collection("users").doc(id).get();
        if ((await user).exists){
            res.status(200).send(user);
            console.log("getuser: the user set is - {" + id + "}");
        }else {
            res.status(400).send(user);
            console.log("getuser: User don't exist..");
        }

    } catch(error) {
        res.status(400).send(error);
    }
});



/* Start to listen
   If planning to deploy this app to cloud application some times the port is not 8080 by defualt so it will take whatever port that is open for there case.
*/
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log("Server is running on PORT " + PORT + ".");
});