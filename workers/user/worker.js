import { parentPort, workerData } from 'worker_threads';
import { app, admin, db } from '../../config/firebase.js';
import bcrypt from'bcryptjs';

const saltRounds = 10;

function comparePassword(password, hash) {
    // Your code to compare the password hash with the entered password
    // For example, you can use a library like bcryptjs to do this
    // Here's an example using bcryptjs:

    return bcrypt.compareSync(password, hash);
}

const signup = async (taskData) => {
    console.log("im in signup!!");
    try {
        const { email, name, password } = taskData;

        // Make a new user (Authentication)
        const userResponse = await admin.auth().createUser({
            email: email,
            password: password,
            emailVerified: false,
            disabled: false
        });
        const hash = await bcrypt.hash(password, saltRounds);

        const newUserJson = {
            id: userResponse.uid,
            name: name,
            email: email,
            passwordHash: hash
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
            parentPort.postMessage({ success: true, data: jsonData });
        } else {
            console.log('signup: User not found!');
            parentPort.postMessage({ success: false, error: 'Document not found!' });
        }
    } catch (error) {
        console.log('signup: Error:', error);
        parentPort.postMessage({ success: false, error: error });
    }
};

const login = async (taskData) => {
    // This is the body of the request. We constructed an object from this data.
    const { email, password } = taskData;
    const id = email;

    // Return the new user JSON to the app
    await db.collection("users").doc(id).get()
    .then(doc => {
        if (doc.exists) {
            // Compare the password hash with the entered password
            console.log("doc: " + doc);
            const userData = doc.data();
            console.log("userData: "+ userData);
            const hash = userData.passwordHash;
            console.log("hash: "+ hash + "\npassword: " + password);
            const isPasswordValid = comparePassword(password, hash);
            if (isPasswordValid) {
                console.log('Password is valid');
                const jsonData = JSON.stringify(userData);
                console.log(jsonData.id);
                parentPort.postMessage({ success: true, data: jsonData });
            } else {
                console.log('Password is invalid');
                parentPort.postMessage({ success: false, error: 'Password is invalid' });
            }
        } else {
            console.log('User not found');
            parentPort.postMessage({ success: false, error: 'login: User not found' });
        }
    }).catch(error => {
        console.log('login: Error found: ' + error);
        parentPort.postMessage({ success: false, error: 'login: ' + error });
    });
}


const patchUser = async (taskData) => {
    const { uid, email, name, password } = taskData;
    const id = email;

    console.log("in patchUser: " + email);
    const hash = await bcrypt.hash(password, saltRounds);

    const newUserJson = {
        name: name,
        id: uid,
        email: email,
        passwordHash: hash
    };

    console.log("in patchUser");

    await admin.auth().updateUser(uid, {password: password})
    .then(function(userRecord) {
        db.collection("users").doc(id).update(newUserJson)
        .then(() => {
            console.log("patchUser: Successfully updated user- {" + id + "}");
            parentPort.postMessage({ success: true, data: "patchUser: Successfully updated user- {" + id + "}" });
        })
        .catch((error) => {
            console.log("patchUser: Failed to update user- {" + id + "}");
            parentPort.postMessage({ success: false, error: "patchUser: Failed to update user" + error });
        });
        // See the UserRecord reference doc for the contents of userRecord.
        console.log("Successfully updated user", userRecord.toJSON());
    })
    .catch(function(error) {
        console.log("Error updating user:", error);
        parentPort.postMessage({ success: false, error: "patchUser: Error updating user:" + error });

    });

}



const deleteUser = async (taskData) => {
    const { ref, email} = taskData;

    console.log("im in delete");
    const id = email; // get the ID of the document to delete
    console.log('ref = ' + ref + ', id = ' + id);

    db.collection("users").doc(id).get()
    .then(doc => {
        if (doc.exists){
        const uid = doc.data().id;
        admin.auth().deleteUser(uid)
        .then(() => {
            db.collection(ref).doc(id).delete()
            .then(() => {
                console.log('Document deleted successfully');
                parentPort.postMessage({ success: true, data: 'Document deleted successfully'});
            })
            .catch((error) => {
                console.log("patchUser: Failed to delete from users tree",error);
                parentPort.postMessage({ success: false, error: "Failed to delete user from users tree: " + error });
            });
        })
        .catch((error) => {
            console.log("patchUser: Failed to delete from auth", error);
            parentPort.postMessage({ success: false, error: "Failed to delete user from auth: " + error });
        })

        }
    })
    .catch((error) => {
        console.log("patchUser: Failed to get the user");
        parentPort.postMessage({ success: false, error: "Failed to get the user: " + error });
    });    
}


// Message handler
parentPort.on('message', async (message) => {
    console.log(" im in the worker Message handler and i need to heandle: " + message.data.work)
    try {
      let result;
      switch (message.type) {
        case 'signup':
          result = await signup(message.data);
          break;
        case 'login':
          result = await login(message.data);
          break;
        case 'patchUser':
          result = await patchUser(message.data);
          break;
        case 'deleteUser':
          result = await deleteUser(message.data);
          break;
        default:
          break;
      }
    } catch (err) {
        console.log("user_worker: Error in the switch: " + err);
    }
  });