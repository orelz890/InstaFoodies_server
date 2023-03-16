// include the express module using the require methood
const express = require('express')
const { signupHendler, loginHendler, getUserHendler, patchUser, deleteObjectFromRefHendler } = require('./entryController')

const app = express()

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
app.post('/signup', signupHendler)


/**
 * Loging in if user exists
 * @param email the only {@code string}
 * @returns User {@code json}
 */
app.post('/login', loginHendler)


/**
 * Returns a specific user
 * @param email {@code string}
 * @returns User {@code json}
 */
app.get('/getUser/:email', getUserHendler)


/**
 * Updates user info
 * @param email {@code string}
 * @body map {@code Map<String, String>}
 * @returns Void
 */
app.patch('/patchUser/:email', patchUser)


/**
 * Delete an object assosiated with @id from the given reference in firebase. 
 * @param ref the first {@code string}
 * @param email the second {@code string}
 * @returns Void
 */
app.delete('/deleteObjectFromRef/:ref/:email', deleteObjectFromRefHendler)


/* Start to listen
   If planning to deploy this app to cloud application some times the port is not 8080 by defualt so it will take whatever port that is open for there case.
*/
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log("Server is running on PORT " + PORT + ".");
});
