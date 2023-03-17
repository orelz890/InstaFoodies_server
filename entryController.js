import { crypto, admin, db } from './config/firebase.js';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const loginHendler = async (req, res) => {

    // This is the body of the request. We constructed an object from this data.
    const id = req.body.email;
    const password = req.body.password;
    const email = id;

    const auth = getAuth();

    signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // User signed in successfully
      const user = userCredential.user;
      console.log(user);
    })
    .catch((error) => {
      // Handle sign-in errors here
      console.error(error);
    });




    // const auth = getAuth();
    // try {
    //     const userCredential = await signInWithEmailAndPassword(auth, email, password);
    //     const user = userCredential.user;
    //     console.log("Signed in user:", user.uid);
    //     // Add your logic for handling a successful sign-in here
    //   } catch (error) {
    //     console.log("Error signing in user:", error);
    //     // Add your logic for handling a failed sign-in here
    //   }



    // try {
    //     // const { email, password } = req.body;
    //     const userRecord = await admin.auth().getUserByEmail(email);
    //     const uid = userRecord.uid;
    //     const hashedPassword = userRecord.customClaims?.hashedPassword;
    //     const salt = userRecord.customClaims?.salt;
    //     const passwordWithSalt = password + salt;
    //     const hash = crypto.createHash('sha256').update(passwordWithSalt).digest('hex');
        
    //     if (hashedPassword === hash) {
    //       console.log('User is authenticated.');
    //       // return a success response to the client
    //       return res.status(200).json({ message: 'User is authenticated.' });
    //     } else {
    //       console.log('Invalid email or password.');
    //       // return an error response to the client
    //       return res.status(401).json({ message: 'Invalid email or password.' });
    //     }
    //   } catch (error) {
    //     console.log(`Error verifying user: ${error}`);
    //     // return an error response to the client
    //     return res.status(500).json({ message: 'Error verifying user.' });
    //   }








    // admin.auth().getUserByEmail(id)
    // .then((userRecord) => {
    //     // User is found, verify their password
    //     const uid = userRecord.uid;
    //     const hashedPassword = userRecord.customClaims && userRecord.customClaims.hashedPassword;
    //     const salt = userRecord.customClaims && userRecord.customClaims.salt;
    //     const passwordWithSalt = password + salt;
    
    //     const hash = crypto.createHash('sha256');
    //     hash.update(passwordWithSalt);
    
    //     if (hashedPassword === hash.digest('hex')) {
    //       // Passwords match, user is authenticated
    //       console.log('User is authenticated.');
    //     } else {
    //       // Passwords do not match, user is not authenticated
    //       console.log('Invalid email or password.');
    //     }
    //   })
    //   .catch((error) => {
    //     // Handle errors
    //     console.log(`Error verifying user: ${error}`);
    //   });



    // console.log("email: "+ (await admin.auth().getUserByEmail(id)).email);
    // // Adding this user to our database
    // const user = db.collection("users").doc(id).get()
    // .then(doc => {
    //     if (doc.exists) {
    //         const jsonData = JSON.stringify(doc.data());
    //         console.log(jsonData);
    //         return res.status(200).send(jsonData);

    //     } else {
    //         console.log('login: Document not found!');
    //         return res.status(400).send(null);
    //     }
    // }).catch(error => {
    //     console.log('login: Error getting document:', error);
    //     return res.status(400).send(error);

    // });
};


// type EntryType = {
//     title: string,
//     text: string,
//   };

// const signupHendler = async (req, res) => {
//     try{
//         // This is the body of the request. We constructed an object from this data.
//         const id = req.body.email;

//         const newUserJson = {
//             name: req.body.name,
//             email: req.body.email,
//             password: req.body.password
//         };
            
//         // Adding this user to our database
//         const user = db.collection("users").doc(id).get();
//         if (!(await user).exists){
//             const response = await db.collection("users").doc(id).set(newUserJson);
//             console.log("signup: Client " + req.body.email + " signed up");
//             return res.status(200).send();
//         }else {
//             console.log("signup: User {" + (await user).data().email +  "} already exist..");
//             return res.status(400).send();

//         }

//     } catch(error) {
//         return res.status(400).send(error);
//     }
// };


const signupHendler = async (req, res) => {
    const id = req.body.email;

    // Make a new user (Authentication)
        const userResponse = await admin.auth().createUser({
        email: req.body.email,
        password: req.body.password,
        emailVerified: false,
        disabled: false
        
    })
    .then(doc => {
        const newUserJson = {
            name: "baruch",
            email: id
        };

        // Add the new user to the users doc in firestore
        db.collection("users").doc(id).set(newUserJson)
        .then(doc2 => {
            console.log("signup: Client " + id + " signed up");
            // Return the new user json to the app
            db.collection("users").doc(id).get()
            .then(userDoc => {
                if (userDoc.exists) {
                    const jsonData = JSON.stringify(userDoc.data());
                    console.log(jsonData);
                    return res.status(200).send(jsonData);
                }else {
                    console.log('signup: user not found!');
                    return res.status(400).send(null);
                }
            }).catch(error => {
                console.log('signup: Error getting document:', error);
                return res.status(400).send(error);
            });
        }).catch(error => {
            console.log('signup: Set Document was unsuccessful!', error);
            return res.status(400).send(error);
    
        });
    }).catch(error => {
        console.log('signup: Error signup:', error);
        return res.status(400).send(error);

    });
};






const getUserHendler = async (req, res) => {
    
    const id = req.params.email;

    console.log("in getUser: " + id);

    db.collection("users").doc(id).get()
    .then(doc => {
        if (doc.exists) {
            const jsonData = JSON.stringify(doc.data());
            console.log(jsonData);
            return res.status(200).send(jsonData);

        } else {
            console.log('getUser: Document not found!');
        }
    }).catch(error => {
        console.log('getUser: Error getting document:', error);
        return res.status(400).send(error);

    });
};


const patchUser = async (req, res) => {
    
    const { body, params: {email}} = req;
    const { name } = body;
    const id = email;
    console.log("in patchUser: " + email);

    const newUserJson = {
        name: name
    };

    console.log("in patchUser");

    await db.collection("users").doc(id).update(newUserJson)
    .then(() => {
        console.log("patchUser: Successfully updated user- {" + id + "}");
        return res.status(200).send();
    })
    .catch((error) => {
        console.log("patchUser: Failed to update user- {" + id + "}");
        return res.status(400).send(error);
    });
};



const deleteObjectFromRefHendler = async (req, res) => {
    console.log("im in delete");
    const { params: {ref , email}} = req;
    const id = email; // get the ID of the document to delete
    console.log('ref = ' + ref + ', id = ' + id);

    await db.collection(ref).doc(id).delete()
      .then(() => {
        console.log('Document deleted successfully');
        return res.status(200).send();
      })
      .catch((error) => {
        console.error(error);
        return res.status(400).send();
      });
  };

  export {signupHendler, loginHendler, getUserHendler, patchUser, deleteObjectFromRefHendler};
