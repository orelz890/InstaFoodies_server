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
            followers_ids: []
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



const patchUser = async (taskData) => {
    const {uid, phone_number, full_name } = taskData;

    db.collection("users").doc(uid).get()
    .then(async doc => {
        if (doc.exists) {
            const jsonData = JSON.stringify(doc.data());
            const data = JSON.parse(jsonData);

            // Create the user data union existing and new data
            const newUserJson = {
                user_id: data.user_id,
                email: data.email,
                phone_number: phone_number || data.phone_number,
                username: data.username,
                full_name: full_name || data.full_name,
                state: data.state,
                date: data.date,
                time: data.time,
                token: data.token
            };

            await db.collection("users").doc(uid).set(newUserJson, { merge: true })
            .then(() => {
                console.log("patchUser: Successfully updated " + "{" + uid + "}", error.type );
                parentPort.postMessage({ success: true, data: "updateUser: Successfully updated "  + " -{" + uid + "}" });
            })
            .catch((error) => {
                console.log("patchUser: Failed to update user {" + uid + "}" ,error);
                parentPort.postMessage({ success: false, error: "patchUser: Failed to update user " , error });
            });
        }
        else {
            console.log('patchUser: Document not found!');
            parentPort.postMessage({ success: false, error: 'Document not found!' });
        }
    }).catch(error => {
        console.log('patchUser: Error getting document:', error);
        parentPort.postMessage({ success: false, error: 'Error getting document:' + error });
    });
}

const patchUserAccountSettings = async (taskData) => {
    const { uid, description, website} = taskData;

    // console.log("in patchUserAccountSettings: " , email, username);
    await db.collection("users_account_settings").doc(uid).get()
    .then(async doc => {
        if (doc.exists) {
            const jsonData = JSON.stringify(doc.data());
            const data = JSON.parse(jsonData);
            // console.log(jsonData);
            const newUserJson = {
                description: description || data.description,
                profile_photo: data.profile_photo,
                isBusiness: data.isBusiness,
                followers: data.followers,
                following: data.following,
                posts: data.posts,
                website: website || data.website,
                following_ids: data.following_ids,
                followers_ids: data.followers_ids
            };

            await db.collection("users_account_settings").doc(uid).set(newUserJson, { merge: true })
            .then(() => {
                console.log("patchUserAccountSettings: Successfully updated " + "{" + uid + "}", error.type );
                parentPort.postMessage({ success: true, data: "updateUser: Successfully updated "  + " -{" + uid + "}" });
            })
            .catch((error) => {
                console.log("patchUserAccountSettings: Failed to update user {" + uid + "}" ,error);
                parentPort.postMessage({ success: false, error: "patchUser: Failed to update user " , error });
            });

            console.log('patchUserAccountSettings: Document updated!');
            parentPort.postMessage({ success: true, error: 'Document updated!' });
        } else {
            console.log('patchUserAccountSettings: Document not found!');
            parentPort.postMessage({ success: false, error: 'Document not found!' });
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
                        settings: settings,
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


const saveRef = async (pathToSaveTo, ref) => {

    var userRef;

    if (ref) {
        userRef = ref ;
    }
    const data = {
        "author": userRef,
    }

    await db.doc(pathToSaveTo).set(data)
    .then(() => {
        console.log("\n\nsaveRef to " + pathToSaveTo +  " - success!\n\n");
    })
    .catch((error) => {
        console.log("\n\nsaveRef - Error: " + error + "\n\n");
    });
}


const getObjectFromRef = async (data) => {

    const authorRef = data.author; // Assuming the author field is a Firestore document reference
    const response = await authorRef.get();

    const jsonData2 = JSON.stringify(response.data());
    console.log(jsonData2);
    
    return response;
}



const updateFollowersFeeds = async (uid, post_id, ref) => {

    let followers_ids = [];
    await db.collection("users_account_settings").doc(uid).get()
    .then(async (doc) => {
        if(doc.exists){
            followers_ids = doc.data().followers_ids; // Replace "fieldName" with the name of the field you want to retrieve
        }
    })
    .catch((error) => {
        console.log("\n\nupdateFollowersFeeds - Error1111: " + error + "\n\n");
        return error;
    });

    followers_ids.push(uid);

    for (let i = 0; i < followers_ids.length; i++) {
        const id = followers_ids[i];
        console.log("id(" + i + "): " + id);
        saveRef("users_feeds/" + id + "/feed/" + post_id, ref);
    }

    return "success";
}


const uploadNewPost = async (taskData) => {

    const {work, receipe,caption,date_created,image_paths, liked,post_id,user_id, tags} = taskData;

    let images = image_paths || [];
    let like_list = liked || [];
    const post = {work, receipe,caption,date_created, images, like_list, post_id,user_id, tags};
    const postRef = db.collection("users_posts").doc(user_id).collection("posts").doc(post_id);
    postRef.set(post).then(() => {
        console.log("\nuploadNewPost - post Added successfully!\n");
        updateFollowersFeeds(user_id, post_id, postRef);
        parentPort.postMessage({ success: true, data: "Success" });
    })
    .catch((error) => {
        console.log("\nuploadNewPost - Error: " + error + "\n");
        parentPort.postMessage({ success: false, error: "Error: " + error });
    });

}




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

  

const getUserFeedPosts = async (taskData) => {

    const { uid } = taskData;

    let posts = [];
    const collectionRef = db.collection("users_feeds").doc(uid).collection("feed");
    const snapshot = await collectionRef.get();
    
    if (!snapshot.empty) {
      snapshot.forEach((doc) => {
        if (doc.exists) {
          const data = doc.data();

          const post = getObjectFromRef(data)
          posts.push(post);
        }
      });
    } else {
      console.log("No posts found in the collection");
    }

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
                        account: settings,
                        posts: posts
                      };
                      const jsonData = JSON.stringify(data);
                      console.log(jsonData);

                      parentPort.postMessage({
                        success: true,
                        data: jsonData
                      });
                } else {
                    console.log('getUserFeedPosts: Account Document not found!');
                    parentPort.postMessage({ success: false, error: "Account Document not found!"});
                }
            }).catch(error => {
                console.log('getUserFeedPosts: Error getting Account document:', error);
                parentPort.postMessage({ success: false, error: "Error: " + error });
            });

        } else {
            console.log('getUserFeedPosts: User Document not found!');
            parentPort.postMessage({ success: false, error: "User Document not found!"});
        }
    }).catch(error => {
        console.log('getUserFeedPosts: Error getting User document:', error);
        parentPort.postMessage({ success: false, error: "Error: " + error });
    });

}    



const getProfileFeedPosts = async (taskData) => {

    const { uid } = taskData;

    let posts = [];
    const collectionRef = db.collection("users_posts").doc(uid).collection("posts");
    const snapshot = await collectionRef.get();
    
    if (!snapshot.empty) {
      snapshot.forEach((doc) => {
        if (doc.exists) {
          const data = doc.data();
          const jsonData = JSON.stringify(data);
          console.log(jsonData + "\n\n");

        //   const post = getObjectFromRef(data)
          posts.push(data);
        }
      });
    } else {
      console.log("No posts found in the collection");
    }

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
                        account: settings,
                        posts: posts
                      };
                      const jsonData = JSON.stringify(data);
                      console.log(jsonData);

                      parentPort.postMessage({
                        success: true,
                        data: jsonData
                      });
                } else {
                    console.log('getProfileFeedPosts: Account Document not found!');
                    parentPort.postMessage({ success: false, error: "Account Document not found!"});
                }
            }).catch(error => {
                console.log('getProfileFeedPosts: Error getting Account document:', error);
                parentPort.postMessage({ success: false, error: "Error: " + error });
            });

        } else {
            console.log('getProfileFeedPosts: User Document not found!');
            parentPort.postMessage({ success: false, error: "User Document not found!"});
        }
    }).catch(error => {
        console.log('getProfileFeedPosts: Error getting User document:', error);
        parentPort.postMessage({ success: false, error: "Error: " + error });
    });

}    
    


const addOrRemovePostLiked = async (taskData) => {   // not working <<<<<<<<<<<<<<<<<<<<<<<<<<<<
    console.log(" ======================== im in addOrRemovePostLiked ==========================\n")

    const { uid, postOwnerId, postId } = taskData;

    const postLikesRef = db.collection("users_posts").doc(postOwnerId).collection("posts").doc(postId);
    const userLikedPostsRef = db.collection("users_liked_posts").doc(uid);

    // If its the first like of this user create the list first
    await userLikedPostsRef.get()
    .then(async doc => {
        if (!doc.exists || doc.exists && !doc.data().Liked) {
            // Document doesn't exist, create it and add the "Liked" array
            await userLikedPostsRef.set({
                Liked: [] // Create the array with the user's ID
            }, { merge: true }); // Use merge: true to avoid overwriting other fields
            console.log('Document and liked reference created successfully.'); 
        }
    });

    postLikesRef.get()
    .then(async doc => {
        if (doc.exists) {

            const likedArray = doc.data().Liked;

            // If its the first like of the post create the list first 
            if (!likedArray){
                console.log("im here please see me");
                // Document doesn't exist, create it and add the "Liked" array
                await postLikesRef.set({
                    Liked: [] // Create the array with the user's ID
                }, { merge: true }); // Use merge: true to avoid overwriting other fields
                console.log('Document and liked reference created successfully.');
            }
            console.log("likedArray = " + likedArray);

            // If the user already liked this post remove his like
            if (likedArray && likedArray.includes(uid)){
                console.log('addOrRemovePostLiked - User already liked this post. Remove like.');
                await postLikesRef.update({ Liked: admin.firestore.FieldValue.arrayRemove(uid) })
                .then(async () => {
                    console.log('addOrRemovePostLiked - User\'s ID removed from the "Liked" array.');
                    await userLikedPostsRef
                    .update({ Liked: admin.firestore.FieldValue.arrayRemove(uid) })
                        .then(() => {
                            console.log('addOrRemovePostLiked - Post removed from the User\'s "Liked" array.');
                            parentPort.postMessage({ success: true, data: false});
                        })
                        .catch(error => {
                            console.log('addOrRemovePostLiked - Error -Post not removed from the User\'s "Liked" array!');
                            parentPort.postMessage({ success: false, error: "Error in addOrRemovePostLiked: " + error });
                        });
                })
                .catch(error => {
                    console.error('addOrRemovePostLiked - Error removing from array:', error);
                    parentPort.postMessage({ success: false, error: "Error in addOrRemovePostLiked: " + error });
                });

            } 
            else // The user is not in the post liked list so add his like
            {
                console.log('addOrRemovePostLiked - User hasn\'t liked this post yet. Add Like');
                await postLikesRef.update({ Liked: admin.firestore.FieldValue.arrayUnion(uid)})
                .then(async () => {
                    console.log('addOrRemovePostLiked - Value set to Firestore document successfully');
                    await userLikedPostsRef.update({ Liked: admin.firestore.FieldValue.arrayUnion(postLikesRef)})
                    .then(() => {
                        console.log('addOrRemovePostLiked - Value set to user liked list Firestore document successfully');
                        parentPort.postMessage({ success: true, data: true});
                    })
                    .catch(error => {
                        console.error('addOrRemovePostLiked - Error setting value to Firestore document22:', error);
                        parentPort.postMessage({ success: false, error: "Error in addOrRemovePostLiked: " + error });
                    });
                })
                .catch(error => {
                    console.error('addOrRemovePostLiked - Error setting value to Firestore document:', error);
                    parentPort.postMessage({ success: false, error: "Error in addOrRemovePostLiked: " + error });
                });
            }
        } 
        else // problem
        {
            console.log('addOrRemovePostLiked: Liked Document not found!');
            parentPort.postMessage({ success: false, error: "Liked Document not found!"});
        }
    }).catch(error => {
        console.error('addOrRemovePostLiked - Error querying document:', error);
        parentPort.postMessage({ success: false, error: "Error: " + error });
    });

    console.log(" ======================== out of addOrRemovePostLiked ==========================\n")
};



while (true) {
    // Wait for a message to be received (sleep until then)
    const message = await new Promise(resolve => {
      parentPort.once('message', resolve);
    });

    // Process the message
    console.log(`Worker received message: ${message.type}`);

    // try {
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
        case 'uploadNewPost':
            result = await uploadNewPost(message.data);
            break;
        case 'getUserFeedPosts':
            result = await getUserFeedPosts(message.data);
            break;
        case 'getProfileFeedPosts':
            result = await getProfileFeedPosts(message.data);
            break;
        case 'addOrRemovePostLiked':
            result = await addOrRemovePostLiked(message.data);
            break;
        default:
          break;
      }
    // } catch (err) {
    //     console.log("user_worker: Error in the switch: " + err);
    // }
  }

