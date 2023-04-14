import { parentPort, workerData } from 'worker_threads';
import { app, admin, db } from '../../config/firebase.js';
import bcrypt from'bcryptjs';
import { getAuth, sendSignInLinkToEmail } from "firebase/auth";

// import List from 'collections/list'
import HashMap from 'hashmap'
import collections from 'collections';
const { Queue, List } = collections;


// const int32Array = new Int32Array(new SharedArrayBuffer(4));

const saltRounds = 10;

function comparePassword(password, hash) {
    // Your code to compare the password hash with the entered password
    // For example, you can use a library like bcryptjs to do this
    // Here's an example using bcryptjs:

    return bcrypt.compareSync(password, hash);
}


function deleteUserAuth(uid){
    admin.auth().deleteUser(uid)
    .then(() => {
        console.log("deleteUserAuth: deleted");
    })
    .catch((error) => {
        console.log("deleteUserAuth: Failed to delete from auth", error);
        parentPort.postMessage({ success: false, error: "Failed to delete user from auth: " + error });
    })
}


const signup = async (taskData) => {

    try {
        console.log("im in signup!!");
        const { email, name, password } = taskData;

        // Make a new user (Authentication)
        await admin.auth().createUser({
            email: email,
            password: password,
            emailVerified: false,
            disabled: false
        }).then(async userResponse => {

            const hash = await bcrypt.hash(password, saltRounds);
            console.log("signup:\npass= " + password +  " ,type= "+ password.type + ", len= " + password.length +  "\nhash= " + hash + ", type=" + hash.type + ", len= " + hash.length);
    
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
            await db.collection("users").doc(id).get()
            .then(userDoc => {
                if (userDoc.exists) {
                    const jsonData = JSON.stringify(userDoc.data());
                    console.log(jsonData);
                    parentPort.postMessage({ success: true, data: jsonData });
                } else {
                    deleteUserAuth(userResponse.uid);
                    console.log('signup: User not found!');
                    parentPort.postMessage({ success: false, error: 'Document not found!' });
                }
            }).catch(error =>{
                deleteUserAuth(userResponse.uid);
                console.log('signup: not able to signup set didnt work:', error);
                parentPort.postMessage({ success: false, error: 'Not able to signup try again with diffrent Credentials'});    
            });
        }).catch(error => {
            console.log('signup: not able to signup:', error);
            parentPort.postMessage({ success: false, error: 'Not able to signup try again with diffrent Credentials'});
        });

    } catch (error) {
        console.log('signup: Error:', error);
        parentPort.postMessage({ success: false, error: error });
    }
};

const login = async (taskData) => {
    // This is the body of the request. We constructed an object from this data.
    // try{
        const { email, password } = taskData;
        const id = email;

        // Return the new user JSON to the app
        await db.collection("users").doc(id).get()
        .then(doc => {
            if (doc.exists) {
                // Compare the password hash with the entered password
                console.log("doc: " + doc);
                const userData = doc.data();
                console.log("userData: "+ userData.passwordHash);
                const realHash = userData.passwordHash;
                console.log("hash: "+ realHash + "\npassword: " + password + "\npassLen = " + password.length);

                const isPasswordValid = comparePassword(password, realHash);
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
    // } catch (error) {
    //     deleteUser(taskData);
    //     console.log('login: Error:', error);
    //     parentPort.postMessage({ success: false, error: error });
    // }
}


const patchUser = async (taskData) => {
    // try{
        const { uid, email, password } = taskData;

        console.log("in patchUser: " + email);
        // const hash = await bcrypt.hash(password, saltRounds);

        const newUserJson = {
            name: taskData.name || "",
            id: uid,
            email: email,
            // passwordHash: hash,
            isBusiness: taskData.isBusiness || false,
            followers: taskData.followers || null,
            following: taskData.following || null,
            Cart: taskData.Cart || null,
            Likes: taskData.Likes || null,
            myPosts: taskData.myPosts || null,
            myRecipePosts: taskData.myRecipePosts || null
        };
        const id = email;

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
    // } catch (error) {
    //     deleteUser(taskData);
    //     console.log('login: Error:', error);
    //     parentPort.postMessage({ success: false, error: error });
    // }

}



const deleteUser = async (taskData) => {
    const {email} = taskData;

    console.log("im in delete");
    const id = email; // get the ID of the document to delete
    console.log(', id = ' + id);

    db.collection("users").doc(id).get()
    .then(doc => {
        if (doc.exists){
            const uid = doc.data().id;
            admin.auth().deleteUser(uid)
            .then(() => {
                db.collection("users").doc(id).delete()
                .then(() => {
                    console.log('Document deleted successfully');
                    parentPort.postMessage({ success: true, data: 'Document deleted successfully'});
                })
                .catch((error) => {
                    console.log("deleteUser: Failed to delete from users tree",error);
                    parentPort.postMessage({ success: false, error: "Failed to delete user from users tree: " + error });
                });
            })
            .catch((error) => {
                console.log("deleteUser: Failed to delete from auth", error);
                parentPort.postMessage({ success: false, error: "Failed to delete user from auth: " + error });
            })
        }else{
            console.log("deleteUser: User dont exist", error);
        }
    })
    .catch((error) => {
        console.log("deleteUser: Failed to get the user");
        parentPort.postMessage({ success: false, error: "Failed to get the user: " + error });
    });    
}


while (true) {
    // Wait for a message to be received (sleep until then)
    const message = await new Promise(resolve => {
      parentPort.once('message', resolve);
    });

    // Process the message
    console.log(`Worker received message: ${message.type}`);

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
  }


// ================ Working but not sleeping until there is work ========
// // Message handler
// parentPort.on('message', async (message) => {
//     console.log(" im in the worker Message handler and i need to heandle: " + message.data.work)
//     try {
//       let result;
//       switch (message.type) {
//         case 'signup':
//           result = await signup(message.data);
//           break;
//         case 'login':
//           result = await login(message.data);
//           break;
//         case 'patchUser':
//           result = await patchUser(message.data);
//           break;
//         case 'deleteUser':
//           result = await deleteUser(message.data);
//           break;
//         default:
//           break;
//       }
//     } catch (err) {
//         console.log("user_worker: Error in the switch: " + err);
//     }
    
//   });
