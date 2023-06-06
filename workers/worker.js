import { parentPort, workerData } from 'worker_threads';
import { bucket, app, admin, db } from '../config/firebase.js';
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

    const { email, username, full_name ,phone_number, id, following_ids, state, date, time} = taskData;
    const newUserJson = {
        user_id: id,
        username: username,
        full_name: full_name,
        email: email,
        phone_number: phone_number,
        state: state,
        date: date,
        time: time,
    };

    // Add the new user to the users doc in firestore
    await db.collection("users").doc(id).set(newUserJson)
    .then(async () => {
        // console.log("newGuy= ", newUserJson);
        const ref2 = "users_account_settings";
        const newUserAccountSettingsJson = {
            description: "none",
            profile_photo: "none",
            isBusiness: false,
            followers: 0,
            following: 0,
            posts: 0,
            website: "none",
            following_ids: [],
        };
    
        await db.collection(ref2).doc(id).set(newUserAccountSettingsJson);
        await db.collection(ref2).doc(id).get()
        .then(async () => {
            await db.collection("users").doc(id).get()
            .then((userDoc) => {
                const jsonData = JSON.stringify(userDoc.data());
                console.log(jsonData);
                console.log("signup: Client " + id + " signed up");
                parentPort.postMessage({ success: true, data: jsonData });   
            })
            .catch(async (error) => {
                await db.collection("users").doc(id).delete();                        
                await db.collection("users_account_settings").doc(id).delete();                        
                console.log('signup: User creation failed', error);
                parentPort.postMessage({ success: false, error: 'User creation failed pleaase try again' });
            });
        })
        .catch(async (error) => {
            await db.collection("users").doc(id).delete();                        
            console.log('signup: User creation failed', error);
            parentPort.postMessage({ success: false, error: 'User creation failed pleaase try again' });
        });
    }).catch(error =>{
        console.log('signup: not able to signup set didnt work:', error);
        parentPort.postMessage({ success: false, error: 'Not able to signup try again with diffrent Credentials'});    
    });
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
    const { uid, ref } = taskData;

    console.log("in getUserHendler: " + uid);

    db.collection(ref).doc(uid).get()
    .then(doc => {
        // console.log("ref= " + ref)
        // console.log("log= " + !doc.exists)
        // console.log("collection= " + doc.data())

        if (doc.exists) {
            const jsonData = JSON.stringify(doc.data());
            // console.log(jsonData);
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

const updateUser = async (ref,uid,data) =>{
    const newUserJson = {
        user_id: data.user_id,
        email: data.email,
        phone_number: phone_number || data.phone_number,
        username: data.username || "none",
        full_name: data.full_name || "none",
        state: state || data.state,
        date: date || data.date,
        time: time || data.time
    };

    console.log("ref = " + ref);
    await db.collection(ref).doc(uid).set(newUserJson)
    .then(() => {
        console.log("updateUser: Successfully updated " + ref , "{" + uid + "}", error.type );
        parentPort.postMessage({ success: true, data: "updateUser: Successfully updated " + ref + " -{" + uid + "}" });
    })
    .catch((error) => {
        console.log("updateUser: Failed to update user " + ref , "{" + uid + "}" ,error);
        parentPort.postMessage({ success: false, error: "updateUser: Failed to update user ",ref  , error });
    });
    // See the UserRecord reference doc for the contents of userRecord.
    console.log("Successfully updated user", ref ,uid);
}


const patchUser = async (taskData) => {
    const {email, uid, password, phone_number, username, full_name, state, date, time ,ref} = taskData;

    console.log("in patchUser: " , email, password, username);
    db.collection(ref).doc(uid).get()
    .then(async doc => {
        if (doc.exists) {
            const jsonData = JSON.stringify(doc.data());
            const data = JSON.parse(jsonData);
            // console.log(jsonData);

            await admin.auth().updateUser(data.user_id, {password: password})
            .then(async (userRecord) => {
                const hash = await bcrypt.hash(password, saltRounds);

                const newUserJson = {
                    user_id: data.user_id,
                    email: data.email,
                    phone_number: phone_number || data.phone_number,
                    username: username || data.username,
                    full_name: full_name || data.full_name,
                    state: state || data.state,
                    date: date || data.date,
                    time: time || data.time
                };
                // console.log("newGuy= ", newUserJson);
                updateUser(ref,data.user_id,newUserJson)
            })
            .catch(function(error) {
                console.log("Error updating user:", error);
                parentPort.postMessage({ success: false, error: "patchUser: Error updating user:" + error });
        
            });

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
    const {email, uid, description, profile_photo, isBusiness, followers, following,
        posts, website, following_ids ,ref} = taskData;

    // console.log("in patchUserAccountSettings: " , email, username);
    await db.collection(ref).doc(uid).get()
    .then(async doc => {
        if (doc.exists) {
            const jsonData = JSON.stringify(doc.data());
            const data = JSON.parse(jsonData);
            // console.log(jsonData);
            const newUserJson = {
                description: description || data.description,
                profile_photo: profile_photo || data.profile_photo,
                isBusiness: isBusiness || data.isBusiness,
                followers: followers || data.followers,
                following: following || data.following,
                posts: posts || data.posts,
                website: website || data.website,
                following_ids: following_ids || data.following_ids
            };
            // console.log("newGuy= ", newUserJson);
            updateUser(ref,email,newUserJson)
            console.log('patchUserAccountSettings: Document updated!');
            // parentPort.postMessage({ success: true, error: 'Document updated!' });
        } else {
            const newUserJson = {
                description: description || "none",
                profile_photo: profile_photo || "none",
                isBusiness: isBusiness || false,
                followers: followers || 0,
                following: following || 0,
                posts: posts || 0,
                website: website || "none",
                following_ids: following_ids
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
    const {uid} = taskData;

    console.log("im in delete");
    const id = uid; // get the ID of the document to delete
    console.log(', id = ' + id);

    db.collection("users").doc(id).get()
    .then(async doc => {
        if (doc.exists){
            const uid = doc.data().user_id;
            await admin.auth().deleteUser(uid)
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


const checkUsername = async (taskData) => {
    const {username} = taskData;
    let notInUseFlag = true;
    console.log("im in checkUsername: ", username);
    await db.collection("users").get()
    .then(async (usersSnapshot) => {
        usersSnapshot.forEach((user) => {
            if(user.data().username === username) {
                notInUseFlag = false;
                // parentPort.postMessage({ success: true, data: false});                
                console.log("checkUsername: 111111");
                parentPort.postMessage({ success: true, data: notInUseFlag});                
                return false;
            }
        });
    })
    .catch((error) => {
        console.log("checkUsername: Failed while checking the username", error);
        parentPort.postMessage({ success: false, error: "Failed while checking the username: " + error });
    });

    if (notInUseFlag){
        console.log("checkUsername: 222222");
        parentPort.postMessage({ success: true, data: notInUseFlag});
    }
}



// ======================================= Chat ===================================

const createNewChatGroup = async (taskData) => {
    console.log("Im in worker-createNewChatGroup");
    const {uid, name} = taskData;
    const Group = {
        string: name
      };
    await db.collection("Chat").doc(uid).collection("Groups").doc(name).set(Group)
    .then(async () => {
        console.log("createNewChatGroup: Success!");
        parentPort.postMessage({ success: true, data: "success"});
    })
    .catch((error) => {
        console.log("createNewChatGroup: Error: ", error);
        parentPort.postMessage({ success: false, error: "Error: " + error });
    });
}


const getUserChatGroups = async (taskData) => {
    const { uid } = taskData;
    const groups = [];
    await db.collection("Chat").doc(uid).collection("Groups").get()
    .then(async (groupsSnapshot) => {
        groupsSnapshot.forEach((doc) => {
            const group = doc.data();
            groups.push(group.string);
        });
        //   console.log("All groups:", groups);
          parentPort.postMessage({ success: true, data: groups});
    })
    .catch((error) => {
        console.log("getUserChatGroups: Error: ", error);
        parentPort.postMessage({ success: false, error: "Error: " + error });
    });
};


const getFollowings = async (taskData) => {
    const { uid ,ref} = taskData;
    const followings_list_ids = [];
    const followings_list = [];
    console.log("in getFollowings, uid = " + uid);

    await db.collection("users_account_settings").doc(uid).get()
    .then(doc => {
        // console.log("ref= " + ref)
        // console.log("following_ids= " + doc.data().following_ids)
        if (doc.exists) {
            doc.data().following_ids.forEach(element => {
                followings_list_ids.push(element);
                // console.log("element = " + element)
            });
        } else {
            console.log('getUserHendler: Document not found!');
        }
    }).catch(error => {
        console.log('getUserHendler: Error getting document:', error);
    });

    // const jsonData = JSON.stringify(followings_list);
    // const data = JSON.parse(jsonData);
    // console.log("followings_list = " + jsonData);

    // Iterate over the elements using a for loop
    for (let i = 0; i < followings_list_ids.length; i++) {
        const id = followings_list_ids[i];
        // console.log("id(" + i + "): " + id);

        await db.collection(ref).doc(id).get()
        .then(doc => {
            // console.log("ref= " + ref)
            // console.log("collection= " + doc.data())
            if (doc.exists) {
                followings_list.push(doc.data())
            } else {
                console.log('getUserHendler: Document not found!');
            }
        }).catch(error => {
            console.log('getUserHendler: Error getting document:', error);
        });
    }

    parentPort.postMessage({ success: true, data: followings_list });
};


const getContacts = async (taskData) => {
    const {uid} = taskData;
    const contacts_list = [];

    console.log("in getContacts, uid = "+ uid);

    const db = admin.database();
    const ref = db.ref('Contacts').child(uid);
    
    await ref.once('value')
        .then((snapshot) => {
            // console.log('snapshot = ' + snapshot.val())
        snapshot.forEach((childSnapshot) => {
            const id = childSnapshot.key.slice();;
            // console.log("id?? = " + id);
            contacts_list.push(id);
        });
    })
    .catch((error) => {
      console.error('Error fetching data:', error);
    });

    // console.log("contacts_list = " + contacts_list)
    
    const task = {
        following_ids: contacts_list,
        uid: uid,
        ref: taskData.ref
    };

    getFollowings(task);
};



const getRequests = async (taskData) => {
    console.log(" ======================== im in getRequests ==========================\n")
    const { uid } = taskData;
    const requests_list_ids = [];
    const requestTypes = [];
    const users = [];
    const accountSettings = [];

    const dbReal = admin.database();
    const ref = dbReal.ref('Chat Requests').child(uid);
    
    await ref.once('value')
        .then((snapshot) => {
            console.log('getRequests snapshot = ' + snapshot.val())
        snapshot.forEach((childSnapshot) => {
            const id = childSnapshot.key.slice();
            const value = childSnapshot.val();
            const nestedType = value.request_type;
            console.log("getRequests id?? = " + id);
            console.log("getRequests type?? = " + nestedType);
            requests_list_ids.push(id);
            requestTypes.push(nestedType);
        });
    })
    .catch((error) => {
      console.error('Error fetching data:', error);
    });

    for (let i = 0; i < requests_list_ids.length; i++) {
        const id = requests_list_ids[i];
        console.log("id(" + i + "): " + id);

        await db.collection("users").doc(id).get()
        .then(async doc => {
            console.log("User collection= " + doc.data())
            if (doc.exists) {
                users.push(doc.data())
                await db.collection("users_account_settings").doc(id).get()
                .then(doc => {
                    console.log("Settings collection= " + doc.data())
                    if (doc.exists) {
                        accountSettings.push(doc.data())
                        
                    } else {
                        console.log('getRequests: Account Document not found!');
                    }
                }).catch(error => {
                    console.log('getRequests: Error getting Account document:', error);
                });

            } else {
                console.log('getRequests: User Document not found!');
            }
        }).catch(error => {
            console.log('getRequests: Error getting User document:', error);
        });
    }

    // console.log("\n\n" + users[0].full_name + "\n\n");
    
    const data = {
        success: true,
        users: users,
        accountSettings: accountSettings,
        responseTypes: requestTypes
      };

    const jsonData = JSON.stringify(data);
    console.log(jsonData);


    parentPort.postMessage({
        success: true,
        data: jsonData
      });

    console.log(" ======================== out of getRequests ==========================\n")
};


const getContactsUsersAndSettings = async (taskData) => {
    console.log(" ======================== im in getContactsUsersAndSettings ==========================\n")
    const { uid } = taskData;
    const requests_list_ids = [];
    const users = [];
    const accountSettings = [];

    const dbReal = admin.database();
    const ref = dbReal.ref('Contacts').child(uid);
    
    await ref.once('value')
        .then((snapshot) => {
            console.log('getContactsUsersAndSettings snapshot = ' + snapshot.val())
        snapshot.forEach((childSnapshot) => {
            const id = childSnapshot.key.slice();
            requests_list_ids.push(id);
        });
    })
    .catch((error) => {
      console.error('Error fetching data:', error);
    });

    for (let i = 0; i < requests_list_ids.length; i++) {
        const id = requests_list_ids[i];
        console.log("id(" + i + "): " + id);

        await db.collection("users").doc(id).get()
        .then(async doc => {
            console.log("User collection= " + doc.data())
            if (doc.exists) {
                users.push(doc.data())
                await db.collection("users_account_settings").doc(id).get()
                .then(doc => {
                    console.log("Settings collection= " + doc.data())
                    if (doc.exists) {
                        accountSettings.push(doc.data())
                        
                    } else {
                        console.log('getContactsUsersAndSettings: Account Document not found!');
                    }
                }).catch(error => {
                    console.log('getContactsUsersAndSettings: Error getting Account document:', error);
                });

            } else {
                console.log('getContactsUsersAndSettings: User Document not found!');
            }
        }).catch(error => {
            console.log('getContactsUsersAndSettings: Error getting User document:', error);
        });
    }

    // console.log("\n\n" + users[0].full_name + "\n\n");
    
    const data = {
        success: true,
        users: users,
        accountSettings: accountSettings,
      };

    const jsonData = JSON.stringify(data);
    console.log(jsonData);


    parentPort.postMessage({
        success: true,
        data: jsonData
      });

    console.log(" ======================== out of getContactsUsersAndSettings ==========================\n")

};



const getFollowingUsersAndAccounts = async (taskData) => {
    console.log(" ======================== im in getFollowingUsersAndAccounts ==========================\n")
    const { uid } = taskData;
    const followings_list_ids = [];
    const users = [];
    const accountSettings = [];

    await db.collection("users_account_settings").doc(uid).get()
    .then(doc => {
        if (doc.exists) {
            doc.data().following_ids.forEach(element => {
                followings_list_ids.push(element.replace(/\s/g, ''));
            });
        } else {
            console.log('getFollowingUsersAndAccounts: Document not found!');
        }
    }).catch(error => {
        console.log('getFollowingUsersAndAccounts: Error getting document:', error);
    });

    for (let i = 0; i < followings_list_ids.length; i++) {
        const id = followings_list_ids[i];
        console.log("id(" + i + "): " + id);

        await db.collection("users").doc(id).get()
        .then(async doc => {
            console.log("User collection= " + doc.data())
            if (doc.exists) {
                users.push(doc.data())
                await db.collection("users_account_settings").doc(id).get()
                .then(doc => {
                    console.log("Settings collection= " + doc.data())
                    if (doc.exists) {
                        accountSettings.push(doc.data())
                        
                    } else {
                        console.log('getFollowingUsersAndAccounts: Account Document not found!');
                    }
                }).catch(error => {
                    console.log('getFollowingUsersAndAccounts: Error getting Account document:', error);
                });

            } else {
                console.log('getFollowingUsersAndAccounts: User Document not found!');
            }
        }).catch(error => {
            console.log('getFollowingUsersAndAccounts: Error getting User document:', error);
        });
    }

    // console.log("\n\n" + users[0].full_name + "\n\n");
    
    const data = {
        success: true,
        users: users,
        accountSettings: accountSettings,
      };

    const jsonData = JSON.stringify(data);
    console.log(jsonData);


    parentPort.postMessage({
        success: true,
        data: jsonData
      });

    console.log(" ======================== out of getFollowingUsersAndAccounts ==========================\n")

};



const getBothUserAndHisSettings = async (taskData) => {
    console.log(" ======================== im in getBothUserAndHisSettings ==========================\n")
    const { uid } = taskData;

    await db.collection("users").doc(uid).get()
    .then(async doc => {
        // console.log("User collection= " + doc.data())
        if (doc.exists) {
            const user = doc.data();
            await db.collection("users_account_settings").doc(uid).get()
            .then(doc2 => {
                // console.log("Settings collection= " + doc.data())
                if (doc.exists) {
                    const settings = doc2.data();

                    const data = {
                        success: true,
                        user: user,
                        accountSettings: doc2.data(),
                      };
                      const jsonData = JSON.stringify(data);
                      console.log(jsonData);

                      parentPort.postMessage({
                        success: true,
                        data: jsonData
                      });
                } else {
                    console.log('getBothUserAndHisSettings: Account Document not found!');
                    parentPort.postMessage({ success: false, error: "Account Document not found!"});
                }
            }).catch(error => {
                console.log('getBothUserAndHisSettings: Error getting Account document:', error);
                parentPort.postMessage({ success: false, error: "Error: " + error });
            });

        } else {
            console.log('getBothUserAndHisSettings: User Document not found!');
            parentPort.postMessage({ success: false, error: "User Document not found!"});
        }
    }).catch(error => {
        console.log('getBothUserAndHisSettings: Error getting User document:', error);
        parentPort.postMessage({ success: false, error: "Error: " + error });
    });
    
    console.log(" ======================== out of getBothUserAndHisSettings ==========================\n")

};


const uploadProfilePhoto = async (taskData) => {
    console.log(" ======================== im in uploadProfilePhoto ==========================\n")
    const { uid, image_uri } = taskData;


    await db.collection("users_account_settings").doc(uid).update({profile_photo: image_uri})
    .then(() => {
        console.log('Value set to Firestore document successfully');
        parentPort.postMessage({ success: true, data: "Success"});
    })
    .catch((error) => {
        console.error('Error setting value to Firestore document:', error);
        parentPort.postMessage({ success: false, error: "Error in uploadProfilePhoto: " + error });
    });
 
    console.log(" ======================== out of uploadProfilePhoto ==========================\n")

};


// async function createFolder(folderName) {
//     const folderPath = `${folderName}/`;
//     const file = bucket.file(folderPath);
//     await file.save('', { metadata: { contentType: 'application/x-www-form-urlencoded' } });
//     console.log(`Folder '${folderName}' created in Firebase Storage`);
//   }

async function createFolder(folderName) {
    const folderPath = `${folderName}/`;
    const file = bucket.file(folderPath);
    await file.create();
    console.log(`Folder '${folderName}' created in Firebase Storage`);
  }
  
  
//   async function storeUriInStorage(uri, folder, filename) {
//     try {
//       // Create the folder if it doesn't exist
//       await createFolder(folder);
  
//       const filePath = `${folder}/${filename}`;
//       const file = bucket.file(filePath);
//       var imageBuffer = new Uint8Array(uri);
//       file.save(imageBuffer, { metadata: { contentType: 'image/png' } });
  
//       console.log('URI stored in Firebase Storage successfully');
//       const expiresAt = new Date();
//       expiresAt.setFullYear(expiresAt.getFullYear() + 10); // Set expiration to 10 years from now
      
//       const [downloadUrl] = await file.getSignedUrl({
//         action: 'read',
//         expires: expiresAt
//       });
  
//       console.log('Download URL:', downloadUrl);
  
//       return downloadUrl;
//     } catch (error) {
//       console.error('Error storing URI in Firebase Storage:', error);
//       return null;
//     }
//   }

async function storeByteArrayInStorage(byteArray, folder, filename) {
    try {
      // Create the folder if it doesn't exist
      await createFolder(folder);
  
      const filePath = `${folder}/${filename}`;
      const file = bucket.file( );
  
      // Convert the byte array to a Buffer
      const buffer = Buffer.from(byteArray);
  
      // Upload the Buffer to Firebase Storage
      await file.save(buffer, { metadata: { contentType: 'image/png' } });
  
      console.log('Byte array stored in Firebase Storage successfully');
  
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 10); // Set expiration to 10 years from now
  
      const [downloadUrl] = await file.getSignedUrl({
        action: 'read',
        expires: expiresAt
      });
  
      console.log('Download URL:', downloadUrl);
  
      return downloadUrl;
    } catch (error) {
      console.error('Error storing byte array in Firebase Storage:', error);
      return null;
    }
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
        case 'checkUsername':
            result = await checkUsername(message.data);
            break;
        case 'createNewChatGroup':
            result = await createNewChatGroup(message.data);
            break;
        case 'getUserChatGroups':
            result = await getUserChatGroups(message.data);
            break;
        case 'getFollowings':
            result = await getFollowings(message.data);
            break;
        case 'getContacts':
            result = await getContacts(message.data);
            break;
        case 'getRequests':
            result = await getRequests(message.data);
            break;
        case 'getContactsUsersAndSettings':
            result = await getContactsUsersAndSettings(message.data);
            break;
        case 'getFollowingUsersAndAccounts':
            result = await getFollowingUsersAndAccounts(message.data);
            break;
        case 'getBothUserAndHisSettings':
            result = await getBothUserAndHisSettings(message.data);
            break;
        case 'uploadProfilePhoto':
            result = await uploadProfilePhoto(message.data);
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
