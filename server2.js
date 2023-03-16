// const functions = require('firebase-functions')
const express = require('express')
const { signupHendler, loginHendler, getUserHendler, patchUser, deleteObjectFromRefHendler } = require('./entryController')

const app = express()

// POST will have a body of type json so we need to enable json in express.
app.use(express.json());

app.use(express.urlencoded({extended: true}));


app.post('/signup', signupHendler)
app.post('/login', loginHendler)
app.get('/getUser/:email', getUserHendler)
app.patch('/patchUser/:email', patchUser)
app.delete('/deleteObjectFromRef/:ref/:email', deleteObjectFromRefHendler)

// exports.app = functions.https.onRequest(app)

/* Start to listen
   If planning to deploy this app to cloud application some times the port is not 8080 by defualt so it will take whatever port that is open for there case.
*/
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log("Server is running on PORT " + PORT + ".");
});