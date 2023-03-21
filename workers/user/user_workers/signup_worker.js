const { parentPort, workerData } = require('worker_threads');
const { app, admin, db } = require('../../../config/firebase.js');
const bcrypt = require('bcryptjs');

const signup = async () => {
    try {
        const { email, name, passwordHash } = workerData;

        // Make a new user (Authentication)
        const userResponse = await admin.auth().createUser({
            email: email,
            password: passwordHash,
            emailVerified: false,
            disabled: false
        });

        const newUserJson = {
            id: userResponse.uid,
            name: name,
            email: email,
            passwordHash: passwordHash
        };

        const id = email;
        // Add the new user to the users doc in firestore
        await db.collection("users").doc(id).set(newUserJson);
        console.log("signup: Client " + id + " signed up");

        // Return the new user JSON to the app
        const userDoc = await db.collection("users").doc(id).get();
        if (userDoc.exists) {
            const jsonData = JSON.stringify(userDoc.data());
            console.log(jsonData);
            parentPort.postMessage(jsonData);
        } else {
            console.log('signup: User not found!');
            parentPort.error(new Error('User not found!'));
        }
    } catch (error) {
        console.log('signup: Error:', error);
        parentPort.error(error);
    }
};

const login = async () => {
    
}
