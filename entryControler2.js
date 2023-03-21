// import { app, crypto, admin, db } from './config/firebase.js';
// import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
// import bcrypt from 'bcryptjs';
// import {Worker, workerData} from 'worker_threads';
// import Joi from 'joi';
// const saltRounds = 10;
// const SIGNUP = 0;
// const LOGIN = 1;
// const PATCH = 2;
// const DELETE = 3;




// function comparePassword(password, hash) {
//     // Your code to compare the password hash with the entered password
//     // For example, you can use a library like bcryptjs to do this
//     // Here's an example using bcryptjs:

//     return bcrypt.compareSync(password, hash);
//   }

  
// const signupHendler = async (req, res) => {
//     const worker = new Worker('./workers/user_workers/signup_worker.js', {
//                                 workerData: {
//                                     work: SIGNUP,
//                                     email: req.body.email,
//                                     password: req.body.password,
//                                     name: req.body.name
//                                 }});

//     worker.on('message', (data) => {
//         res.status(200).send(data);
//     });
//     worker.on('error', (error) => {
//         res.status(400).send(error);
//     });
// };

// const loginHendler = async (req, res) => {

//     // This is the body of the request. We constructed an object from this data.
//     const email = req.body.email;
//     const password = req.body.password;
//     const id = email;

//     // Return the new user JSON to the app
//     await db.collection("users").doc(id).get()
//     .then(doc => {
//         if (doc.exists) {
//             // Compare the password hash with the entered password
//             console.log("doc: "+ doc);
//             const userData = doc.data();
//             console.log("userData: "+ userData);
//             const hash = userData.passwordHash;
//             console.log("hash: "+ hash + "\npassword: " + password);
//             const isPasswordValid = comparePassword(password, hash);
//             if (isPasswordValid) {
//                 console.log('Password is valid');
//                 const jsonData = JSON.stringify(userData);
//                 console.log(jsonData.id);
//                 return res.status(200).send(jsonData);
//             } else {
//                 console.log('Password is invalid');
//                 return res.status(404).send(null);
//             }
//         } else {
//             console.log('User not found');
//             return res.status(404).send(null);
//         }
//     }).catch(error => {
//         console.log('login: Error found: ' + error);
//         return res.status(404).send(error);

//     });

// };


// // type EntryType = {
// //     title: string,
// //     text: string,
// //   };

// // const signupHendler = async (req, res) => {
// //     try{
// //         // This is the body of the request. We constructed an object from this data.
// //         const id = req.body.email;

// //         const newUserJson = {
// //             name: req.body.name,
// //             email: req.body.email,
// //             password: req.body.password
// //         };
            
// //         // Adding this user to our database
// //         const user = db.collection("users").doc(id).get();
// //         if (!(await user).exists){
// //             const response = await db.collection("users").doc(id).set(newUserJson);
// //             console.log("signup: Client " + req.body.email + " signed up");
// //             return res.status(200).send();
// //         }else {
// //             console.log("signup: User {" + (await user).data().email +  "} already exist..");
// //             return res.status(400).send();

// //         }

// //     } catch(error) {
// //         return res.status(400).send(error);
// //     }
// // };


// // just an example of how to access the users in firestore
// const getUserHendler = async (req, res) => {
    
//     const id = req.params.email;

//     console.log("in getUser: " + id);

//     db.collection("users").doc(id).get()
//     .then(doc => {
//         if (doc.exists) {
//             const jsonData = JSON.stringify(doc.data());
//             console.log(jsonData);
//             return res.status(200).send(jsonData);

//         } else {
//             console.log('getUser: Document not found!');
//         }
//     }).catch(error => {
//         console.log('getUser: Error getting document:', error);
//         return res.status(400).send(error);

//     });
// };


// const patchUser = async (req, res) => {
    
//     const { body, params: { email }} = req;
//     const { uid, name, password } = body;
//     const id = email;
//     console.log("in patchUser: " + email);
//     const hash = await bcrypt.hash(password, saltRounds);

//     const newUserJson = {
//         name: name,
//         id: uid,
//         email: email,
//         passwordHash: hash
//     };

//     console.log("in patchUser");

//     await admin.auth().updateUser(uid, {password: password})
//     .then(function(userRecord) {
//         db.collection("users").doc(id).update(newUserJson)
//         .then(() => {
//             console.log("patchUser: Successfully updated user- {" + id + "}");
//             return res.status(200).send();
//         })
//         .catch((error) => {
//             console.log("patchUser: Failed to update user- {" + id + "}");
//             return res.status(400).send(error);
//         });
//          // See the UserRecord reference doc for the contents of userRecord.
//          console.log("Successfully updated user", userRecord.toJSON());
//     })
//     .catch(function(error) {
//     console.log("Error updating user:", error);
//     });
 

// };


// const deleteObjectFromRefHendler = async (req, res) => {
//     console.log("im in delete");
//     const { params: {ref , email}} = req;
//     const id = email; // get the ID of the document to delete
//     console.log('ref = ' + ref + ', id = ' + id);

//     db.collection("users").doc(id).get()
//     .then(doc => {
//         if (doc.exists){
//         const uid = doc.data().id;
//         admin.auth().deleteUser(uid)
//         .then(() => {
//             db.collection(ref).doc(id).delete()
//             .then(() => {
//                 console.log('Document deleted successfully');
//                 return res.status(200).send();
//             })
//             .catch((error) => {
//                 console.log("patchUser: Failed to delete from users tree",error);
//                 return res.status(400).send();
//             });
//         })
//         .catch((error) => {
//             console.log("patchUser: Failed to delete from auth", error);
//             return res.status(400).send(error);
//         })

//         }
//     })
//     .catch((error) => {
//         console.log("patchUser: Failed to get the user");
//         return res.status(400).send(error);
//     });

//   };

//   export {signupHendler, loginHendler, getUserHendler, patchUser, deleteObjectFromRefHendler};
