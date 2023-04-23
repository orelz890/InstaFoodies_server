import { parentPort, workerData } from 'worker_threads';
import { app, admin, db } from '../config/firebase.js';
import bcrypt from'bcryptjs';
import { getAuth, sendSignInLinkToEmail } from "firebase/auth";

// import List from 'collections/list'
import HashMap from 'hashmap'
import collections from 'collections';
import { error } from 'console';
const { Queue, List } = collections;


// const int32Array = new Int32Array(new SharedArrayBuffer(4));

const saltRounds = 10;

// function verifyUser(password, hash) {}

function comparePassword(password, hash) {
    // Your code to compare the password hash with the entered password
    // For example, you can use a library like bcryptjs to do this
    // Here's an example using bcryptjs:

    return bcrypt.compareSync(password, hash);
}


function deleteUserAuth(uid){
    admin.auth().deleteUser(uid)
    .then(async () => {
        console.log("deleteUserAuth: deleted");
    })
    .catch((error) => {
        console.log("deleteUserAuth: Failed to delete from auth", error);
        // parentPort.postMessage({ success: false, error: "Failed to delete user from auth: " + error });
    })
}


const signup = async (taskData) => {

    try {
        console.log("im in signup!!");
        const { email, username, password, phone_number} = taskData;

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
                user_id: userResponse.uid,
                username: username,
                email: email,
                passwordHash: hash,
                phone_number: phone_number
            };
    
            const id = email;
            // Add the new user to the users doc in firestore
            await db.collection("users").doc(id).set(newUserJson)
            .then(async () => {

                // console.log("newGuy= ", newUserJson);
                const ref2 = "users_account_settings";
                const newUserAccountSettingsJson = {
                    username: "none",
                    description: "none",
                    display_name: "none",
                    profile_photo: "none",
                    isBusiness: false,
                    followers: 0,
                    following: 0,
                    posts: 0,
                    website: "none",
                };
            
                await db.collection(ref2).doc(id).set(newUserAccountSettingsJson);
                await db.collection(ref2).doc(id).get()
                .then(async () => {
                    await db.collection("users").doc(id).get()
                    .then((userDoc) => {
                        const jsonData = JSON.stringify(userDoc.data());
                        console.log(jsonData);
                        parentPort.postMessage({ success: true, data: jsonData });   
                    })
                    .catch(async (error) => {
                        deleteUserAuth(userResponse.uid);
                        await db.collection("users").doc(id).delete();                        
                        await db.collection("users_account_settings").doc(id).delete();                        
                        console.log('signup: User creation failed', error);
                        parentPort.postMessage({ success: false, error: 'User creation failed pleaase try again' });
                    });
                })
                .catch(async (error) => {
                    deleteUserAuth(userResponse.uid);
                    await db.collection("users").doc(id).delete();                        
                    console.log('signup: User creation failed', error);
                    parentPort.postMessage({ success: false, error: 'User creation failed pleaase try again' });
                });
            }).catch(error =>{
                deleteUserAuth(userResponse.uid);
                console.log('signup: not able to signup set didnt work:', error);
                parentPort.postMessage({ success: false, error: 'Not able to signup try again with diffrent Credentials'});    
            });
            console.log("signup: Client " + id + " signed up");
    
            // Return the new user JSON to the app
            // await db.collection("users").doc(id).get()
            // .then(userDoc => {
            //     if (userDoc.exists) {
            //         const jsonData = JSON.stringify(userDoc.data());
            //         console.log(jsonData);
            //         parentPort.postMessage({ success: true, data: jsonData });
            //     } else {
            //         deleteUserAuth(userResponse.uid);
            //         console.log('signup: User not found!');
            //         parentPort.postMessage({ success: false, error: 'Document not found!' });
            //     }
            // }).catch(error =>{
            //     deleteUserAuth(userResponse.uid);
            //     console.log('signup: not able to signup set didnt work:', error);
            //     parentPort.postMessage({ success: false, error: 'Not able to signup try again with diffrent Credentials'});    
            // });
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
        admin.auth().deleteUser(uid);
        parentPort.postMessage({ success: false, error: 'login: ' + error });
    });
}

// just an example of how to access the users in firestore
const getUserHendler = async (taskData) => {    
    const { email, ref } = taskData;

    console.log("in getUserHendler: " + email);

    db.collection(ref).doc(email).get()
    .then(doc => {
        if (doc.exists) {
            const jsonData = JSON.stringify(doc.data());
            console.log(jsonData);
            parentPort.postMessage({ success: true, data: jsonData });
        } else {
            console.log('getUserHendler: Document not found!');
            parentPort.postMessage({ success: false, error: 'Document not found!' });
        }
    }).catch(error => {
        console.log('getUserHendler: Error getting document:', error);
        parentPort.postMessage({ success: false, error: 'Error getting document:' + error });
    });
};

const updateUser = async (ref,email,data) =>{
    const newUserJson = {
        username: data.username || "none",
        description: data.description || "none",
        display_name: data.display_name || "none",
        profile_photo: data.profile_photo || "none",
        isBusiness: data.isBusiness || false,
        followers: data.followers || 0,
        following: data.following || 0,
        posts: data.posts || 0,
        website: data.website || "none",
    };

    await db.collection(ref).doc(email).set(newUserJson)
    .then(() => {
        console.log("updateUser: Successfully updated " + ref , "{" + email + "}", error.type );
        parentPort.postMessage({ success: true, data: "updateUser: Successfully updated " + ref + " -{" + email + "}" });
    })
    .catch((error) => {
        console.log("updateUser: Failed to update user " + ref , "{" + email + "}" ,error);
        parentPort.postMessage({ success: false, error: "updateUser: Failed to update user ",ref  , error });
    });
    // See the UserRecord reference doc for the contents of userRecord.
    console.log("Successfully updated user", ref ,email);
}


const patchUser = async (taskData) => {
    const {email, password, phone_number, username ,ref} = taskData;

    console.log("in patchUser: " , email, password, username);
    db.collection(ref).doc(email).get()
    .then(async doc => {
        if (doc.exists) {
            const jsonData = JSON.stringify(doc.data());
            const data = JSON.parse(jsonData);
            // console.log(jsonData);

            if(password){
                await admin.auth().updateUser(data.user_id, {password: password})
                .then(async (userRecord) => {
                    const hash = await bcrypt.hash(password, saltRounds);

                    const newUserJson = {
                        passwordHash: hash,
                        user_id: data.user_id,
                        email: data.email,
                        phone_number: phone_number || data.phone_number,
                        username: username || data.username
                    };
                    // console.log("newGuy= ", newUserJson);
                    updateUser(ref,email,newUserJson)
                })
                .catch(function(error) {
                    console.log("Error updating user:", error);
                    parentPort.postMessage({ success: false, error: "patchUser: Error updating user:" + error });
            
                });
            }
            else{
                console.log("\nemail====", data.email);
                const newUserJson = {
                    passwordHash: data.passwordHash,
                    user_id: data.user_id,
                    email: data.email,
                    phone_number: phone_number || data.phone_number,
                    username: username || data.username
                };
                // console.log("newGuy= ", newUserJson);
                updateUser(ref,email,newUserJson)
            }

        } else {
            console.log('patchUser: Document not found!');
            parentPort.postMessage({ success: false, error: 'Document not found!' });
        }
    }).catch(error => {
        console.log('patchUser: Error getting document:', error);
        parentPort.postMessage({ success: false, error: 'Error getting document:' + error });
    });

}

const patchUserAccountSettings = async (taskData) => {
    const {email,username, description, display_name, profile_photo, isBusiness, followers, following,
        posts, website ,ref} = taskData;

    console.log("in patchUserAccountSettings: " , email, username);
    db.collection(ref).doc(email).get()
    .then(async doc => {
        if (doc.exists) {
            const jsonData = JSON.stringify(doc.data());
            const data = JSON.parse(jsonData);
            // console.log(jsonData);
            const newUserJson = {
                username: username || data.username,
                description: description || data.description,
                display_name: display_name || data.display_name,
                profile_photo: profile_photo || data.profile_photo,
                isBusiness: isBusiness || data.isBusiness,
                followers: followers || data.followers,
                following: following || data.following,
                posts: posts || data.posts,
                website: website || data.website,
            };
            // console.log("newGuy= ", newUserJson);
            updateUser(ref,email,newUserJson)
            console.log('patchUserAccountSettings: Document updated!');
            // parentPort.postMessage({ success: true, error: 'Document updated!' });
        } else {
            const newUserJson = {
                username: username || "none",
                description: description || "none",
                display_name: display_name || "none",
                profile_photo: profile_photo || "none",
                isBusiness: isBusiness || false,
                followers: followers || 0,
                following: following || 0,
                posts: posts || 0,
                website: website || "none",
            };
            // console.log("newGuy= ", newUserJson);
            updateUser(ref,email,newUserJson)
            console.log('patchUserAccountSettings: Document updated!');
            // parentPort.postMessage({ success: true, error: 'Document created!' });
        }
    }).catch(error => {
        console.log('patchUserAccountSettings: Error getting document:', error);
        parentPort.postMessage({ success: false, error: 'Error getting document:' + error });
    });

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
                .then(async () => {
                    await db.collection("users_account_settings").doc(id).delete();
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
        case 'getUserData':
        result = await getUserHendler(message.data);
        break;
        case 'patchUser':
          result = await patchUser(message.data);
          break;
        case 'patch_UAS':
            console.log("\ncan u see me?\n");
            result = await patchUserAccountSettings(message.data);
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


// ================ Working but not sleeping until there is work ======== patchUserAccountSettings
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
