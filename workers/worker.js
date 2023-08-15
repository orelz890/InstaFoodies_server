import { parentPort, workerData } from 'worker_threads';
import { bucket, app, admin, db } from '../config/firebase.js';
import bcrypt from'bcryptjs';
import { getAuth, sendSignInLinkToEmail } from "firebase/auth";

// import List from 'collections/list'
import HashMap from 'hashmap'
import collections from 'collections';
import { error } from 'console';
const { Queue, List } = collections;

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


const saveRef = async (refsToSaveTo, postRef) => {

    // console.log
    const updatePromises = refsToSaveTo.map(async (followerDocRef) => {
        try {
            // Update the follower's document to include the new reference
            await followerDocRef.update({
                posts: admin.firestore.FieldValue.arrayUnion(postRef)
            })
            .catch(async error => {
                const errorMessage = error.toString();
                const parts = errorMessage.split(" ");
                if (parts[2] && parts[2] === 'NOT_FOUND:') {
                    // If the document doesn't exist, create it with the posts array
                    try {
                        // Feed doesn't exist, create it
                        await followerDocRef.set({
                            posts: [postRef]
                        }, { merge: true });
                        console.log('Feed created successfully.');
                    } catch (createError) {
                        console.error(`Error creating document and saving reference in ${followerDocRef.id}: ${createError}`);
                    }
                } else {
                    console.error(`Error saving reference in ${followerDocRef.id}: ${error} , error-code: ${error.code}`);
                }

            });
            console.log(`Reference saved in ${followerDocRef.id}`);
        } catch (error) {
            console.error(`Error saving reference in ${followerDocRef.id}: ${error}`);
        }
    });

    // Wait for all update operations to complete
    await Promise.all(updatePromises);
}


const getObjectFromRef = async (data) => {

    const authorRef = data.author; // Assuming the author field is a Firestore document reference
    const response = await authorRef.get();

    const jsonData2 = JSON.stringify(response.data());
    console.log(jsonData2);
    
    return response;
}



const updateFollowersFeeds = async (uid, ref) => {
    let followersRef = [];
    await db.collection("users_account_settings").doc(uid).get()
    .then(async (doc) => {
        if(doc.exists){
            const followers_ids = doc.data().followers_ids;
            for (let i = 0; i < followers_ids.length; i++) {
                const id = followers_ids[i];
                followersRef.push(db.collection("users_feeds").doc(id))
            }
            saveRef(followersRef , ref);
        }
    })
    .catch((error) => {
        console.log("\n\nupdateFollowersFeeds - Error1111: " + error + "\n\n");
        return error;
    });

    return "success";
}


const uploadNewPost = async (taskData) => {

    const {work, recipe, caption, date_created,image_paths, liked_list, comments_list ,post_id, user_id, tags} = taskData;

    const post = {work, recipe, caption, date_created, image_paths, liked_list, comments_list, post_id, user_id, tags};
    const postRef = db.collection("users_posts").doc(user_id).collection("posts").doc(post_id);
    postRef.set(post).then(async () => {
        console.log("\nuploadNewPost - post Added successfully!\n");

        updateFollowersFeeds(user_id, postRef);

        // Increment posts uploaded by 1 in users_account_settings collection
        await db.collection("users_account_settings").doc(user_id).update({posts: admin.firestore.FieldValue.increment(1)})
        .then(() => {
            console.log('posts count updated successfully');
        })
        .catch((error) => {
            console.error('Error setting value to Firestore document:', error);
        });

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
    console.log(" ======================== in of getUserFeedPosts ==========================\n")

    const { uid } = taskData;

    let collectionName = "users_feeds";

    // Fatch all user feed posts refrences
    let postsRefList = [];
    let posts = [];
    console.log("uid - " + uid);

    // Fatch posts of people you follow
    await db.collection(collectionName).doc(uid).get()
    .then((dataSnapshot) => {
        if (dataSnapshot.exists){
            if (dataSnapshot.data() && dataSnapshot.data().posts) {
                dataSnapshot.data().posts
                .forEach((doc) => {
                    postsRefList.push(doc);
                });
            } 
            else {
                console.log("getUserFeedPosts - No posts found in the collection1");
            }
        }
        else {
            console.log("getUserFeedPosts - No posts found in the collection2");
        }
    })
    .catch(error => {
        console.error('Error :', error);

    });


    // Fatch all the user uploaded posts
    const collectionRef = db.collection("users_posts").doc(uid).collection("posts");
    const snapshot = await collectionRef.get();
    
    if (!snapshot.empty) {
        snapshot.forEach((doc) => {
            if (doc.exists) {
                const data = doc.data();
                posts.push(data);
            }
        });
    } else {
        console.log("No posts found in the collection");
    }

    // Fatch all posts using the refrence list (postsRefList)
    fetchDocumentsFromReferences(postsRefList, uid, collectionName)
    .then((documents) => {
        console.log("\npostsList = " + JSON.stringify(documents, null, 2));

        // Add followings posts to the posts array
        posts.concat(documents);

        // console.log("\n\nBefore:\n\n" + JSON.stringify(posts, null , 2));

        // Sort the posts according to their time stamp
        posts.sort((a, b) => {
            console.log("\n\na = " + JSON.stringify(a, null , 2) + "\n\n");
            
            const compare = Date.parse(a.date_created.trim()) - Date.parse(b.date_created.trim())
            console.log("\n\ncompare = " + Date.parse(a.date_created) + " - " + Date.parse(b.date_created) + "== " + compare + "\n\n");

            return compare});

        // console.log("\n\nAfter:\n\n" + JSON.stringify(posts, null , 2));

        // Create the response
        const response = {
            posts: posts
        }

        // Response to android
        parentPort.postMessage({ success: true, data: JSON.stringify(response)});
    })
    .catch((error) => {
        console.error("getUserFeedPosts - fetchDocumentsFromReferences - Error: ", error);
        parentPort.postMessage({ success: false, error: "Error: " + error});

    });

    console.log(" ======================== out of getUserFeedPosts ==========================\n")

}    



const getProfileFeedPosts = async (taskData) => {

    const { uid } = taskData;

    console.log("\n\nuid = " + uid + "\n\n");

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

    console.log("\nposts = " + JSON.stringify(posts, null, 2));


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
    


const addOrRemovePostLiked = async (taskData) => {
    console.log(" ======================== im in addOrRemovePostLiked ==========================\n")

    const { uid, postOwnerId, postId } = taskData;

    const postRef = db.collection("users_posts").doc(postOwnerId).collection("posts").doc(postId);
    const userLikedPostsRef = db.collection("users_liked_posts").doc(uid);

    // If its the first like of this user create the list first
    await userLikedPostsRef.get()
    .then(async doc => {
        if (!doc.exists || doc.exists && !doc.data().liked_list) {
            // Document doesn't exist, create it and add the "Liked" array
            await userLikedPostsRef.set({
                liked_list: [] // Create the array with the user's ID
            }, { merge: true }); // Use merge: true to avoid overwriting other fields
            console.log('Document and liked reference created successfully.'); 
        }
    });

    postRef.get()
    .then(async doc => {
        if (doc.exists) {

            const likedArray = doc.data().liked_list;

            // If its the first like of the post create the list first 
            if (!likedArray){
                console.log("im here please see me");
                // Document doesn't exist, create it and add the "Liked" array
                await postRef.set({
                    liked_list: [] // Create the array with the user's ID
                }, { merge: true }); // Use merge: true to avoid overwriting other fields
                console.log('Document and liked reference created successfully.');
            }
            console.log("likedArray = " + likedArray);

            // If the user already liked this post remove his like
            if (likedArray && likedArray.includes(uid)){
                console.log('addOrRemovePostLiked - User already liked this post. Remove like.');
                await postRef.update({ liked_list: admin.firestore.FieldValue.arrayRemove(uid) })
                .then(async () => {
                    console.log('addOrRemovePostLiked - User\'s ID removed from the "Liked" array.');
                    await userLikedPostsRef
                    .update({ liked_list: admin.firestore.FieldValue.arrayRemove(postRef) })
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
                await postRef.update({ liked_list: admin.firestore.FieldValue.arrayUnion(uid)})
                .then(async () => {
                    console.log('addOrRemovePostLiked - Value set to Firestore document successfully');
                    await userLikedPostsRef.update({ liked_list: admin.firestore.FieldValue.arrayUnion(postRef)})
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
        else // problem - Liked Document not found!
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


const addCommentToPost = async (taskData) => {
    console.log(" ======================== im in addCommentToPost ==========================\n")

    const { postOwnerId, postId, uid, comment, name, photo, commentId } = taskData;

    const currentDate = new Date();
    console.log("Date = " + currentDate);

    const postCommentsRef = db.collection("users_posts").doc(postOwnerId).collection("posts").doc(postId);

    const newComment = {
        date: String(currentDate),
        uid: uid,
        name: name || "Anonimus",
        liked_list: [],
        photo: photo || "",
        comment: comment,
        commentId: commentId
    };

    // Load the new comment to firestore
    await postCommentsRef.update({ comments_list: admin.firestore.FieldValue.arrayUnion(newComment)})
    .then(() => {
        const jsonData = JSON.stringify(newComment);
        console.log('addCommentToPost - Document and liked reference created successfully.'); 
        parentPort.postMessage({ success: true, data: jsonData});
    })
    .catch(error => {
        console.error('addCommentToPost - ', error);
        parentPort.postMessage({ success: false, error: "Error: " + error });
    }); // Use merge: true to avoid overwriting other fields
    
    console.log(" ======================== out of addCommentToPost ==========================\n")
};


const getPostComments = async (taskData) => {
    console.log(" ======================== im in getPostComments ==========================\n")

    const { postOwnerId, postId } = taskData;

    const postRef = db.collection("users_posts").doc(postOwnerId).collection("posts").doc(postId);

    // Load the new comment to firestore
    await postRef.get()
    .then((postSnap) => {
        if (postSnap.exists){
            const jsonData = JSON.stringify(postSnap.data().comments_list);
            console.log('getPostComments - data collected. comments = ' + jsonData);
            parentPort.postMessage({ success: true, data: jsonData});
        }
        else{
            console.log('getPostComments - data collected. postSnap dont exist.'); 
            parentPort.postMessage({ success: false, error: "Error: postSnap dont exist." });

        }
    })
    .catch(error => {
        console.error('getPostComments - ', error);
        parentPort.postMessage({ success: false, error: "Error: " + error });
    });
    
    console.log(" ======================== out of getPostComments ==========================\n")
};



const addOrRemoveLikeToPostComment = async (taskData) => {
    console.log(" ======================== im in addOrRemoveLikeToPostComment ==========================\n")

    const { postOwner, postId, uid, position } = taskData;

    const postRef = db.collection("users_posts").doc(postOwner).collection("posts").doc(postId);

    // Retrive post details
    await postRef.get()
    .then(async (doc) => {
        const jsonData = JSON.stringify(doc.data().comments_list[position].liked_list);
        console.log("doc = " + jsonData);
        let post = doc.data();
        let likedArray = post.comments_list[position].liked_list;

        // If user already liked the comment remove his\hers like
        const indexToRemove = likedArray.indexOf(uid);
        if (indexToRemove !== -1) {
            post.comments_list[position].liked_list.splice(indexToRemove, 1);
            const jsonDataAfter = JSON.stringify(post.comments_list[position].liked_list);
            console.log("doc after remove = " + jsonDataAfter);

            await postRef.set(post, { merge: true }) // Use merge: true to avoid overwriting other fields
            .then(() => {
                console.log("addOrRemoveLikeToPostComment - Liked removed successfully.");
                parentPort.postMessage({ success: true, data: false });
            })
            .catch(error => {
                console.error('addOrRemoveLikeToPostComment - if - error - ', error);
                parentPort.postMessage({ success: false, error: "Error: " + error });
            });
        } 
        else { // User liked the comment so add his like
            console.log('Element not found in the array.');
            post.comments_list[position].liked_list.push(uid);
            await postRef.set(post, { merge: true })
            .then(() => {
                console.log("addOrRemoveLikeToPostComment - Liked added successfully.");
                parentPort.postMessage({ success: true, data: true });
            })
            .catch(error => {
                console.error('addOrRemoveLikeToPostComment - else - error - ', error);
                parentPort.postMessage({ success: false, error: "Error: " + error });
            });
        }
    })
    .catch(error => {
        console.error('addOrRemoveLikeToPostComment - Erorr - ', error);
        parentPort.postMessage({ success: false, error: "Error: " + error });
    });

    
    console.log(" ======================== out of addOrRemoveLikeToPostComment ==========================\n")
};


const addOrRemoveCartPost = async (taskData) => {
    console.log(" ======================== im in addOrRemoveCartPost ==========================\n")

    const { uid, postOwnerId, postId } = taskData;

    const postRef = db.collection("users_posts").doc(postOwnerId).collection("posts").doc(postId);

    const cartRef = db.collection("users_cart_posts").doc(uid);
    
    // If its the first like of this user create the list first
    await cartRef.get()
    .then(async doc => {
        if (!doc.exists || doc.exists && !doc.data().cart_list) {
            // Document doesn't exist, create it and add the "Liked" array
            await cartRef.set({
                cart_list: [] // Create the array with the user's ID
            }, { merge: true }); // Use merge: true to avoid overwriting other fields
            console.log('Document and liked reference created successfully.'); 
        }
    });

    postRef.get()
    .then(async doc => {
        if (doc.exists) {

            const cartArray = doc.data().cart_list;

            // If its the first cart addition create the cart first 
            if (!cartArray){
                console.log("im here please see me");
                // Document doesn't exist, create it.
                await postRef.set({
                    cart_list: []
                }, { merge: true }); // Use merge: true to avoid overwriting other fields
                console.log('Document and cart_list reference created successfully.');
            }
            console.log("cartArray = " + cartArray);

            // If the user already liked this post remove this recipe from cart
            if (cartArray && cartArray.includes(uid)){
                console.log('addOrRemoveCartPost - User already liked this post. Remove like.');
                await postRef.update({ cart_list: admin.firestore.FieldValue.arrayRemove(uid) })
                .then(async () => {
                    console.log('addOrRemoveCartPost - User\'s ID removed from the "cart_list" array.');
                    await cartRef
                    .update({ cart_list: admin.firestore.FieldValue.arrayRemove(postRef) })
                        .then(() => {
                            console.log('addOrRemoveCartPost - Post removed from the User\'s "cart_list" array.');
                            parentPort.postMessage({ success: true, data: false});
                        })
                        .catch(error => {
                            console.log('addOrRemoveCartPost - Error -Post not removed from the User\'s "cart_list" array!');
                            parentPort.postMessage({ success: false, error: "Error in addOrRemoveCartPost: " + error });
                        });
                })
                .catch(error => {
                    console.error('addOrRemoveCartPost - Error removing from array:', error);
                    parentPort.postMessage({ success: false, error: "Error in addOrRemoveCartPost: " + error });
                });

            } 
            else // The recipe is not in the user cart so add it
            {
                console.log('addOrRemoveCartPost - User didnt add this post to cart yet. Add to cart');
                await postRef.update({ cart_list: admin.firestore.FieldValue.arrayUnion(uid)})
                .then(async () => {
                    console.log('addOrRemoveCartPost - Value set to Firestore document successfully');
                    await cartRef.update({ cart_list: admin.firestore.FieldValue.arrayUnion(postRef)})
                    .then(() => {
                        console.log('addOrRemoveCartPost - Value set to user cart_list list Firestore document successfully');
                        parentPort.postMessage({ success: true, data: true});
                    })
                    .catch(error => {
                        console.error('addOrRemoveCartPost - Error setting value to Firestore document22:', error);
                        parentPort.postMessage({ success: false, error: "Error in addOrRemoveCartPost: " + error });
                    });
                })
                .catch(error => {
                    console.error('addOrRemoveCartPost - Error setting value to Firestore document:', error);
                    parentPort.postMessage({ success: false, error: "Error in addOrRemoveCartPost: " + error });
                });
            }
        } 
        else // problem - cart_list Document not found!
        {
            console.log('addOrRemoveCartPost: cart_list Document not found!');
            parentPort.postMessage({ success: false, error: "cart_list Document not found!"});
        }
    }).catch(error => {
        console.error('addOrRemoveCartPost - Error querying document:', error);
        parentPort.postMessage({ success: false, error: "Error: " + error });
    });

    console.log(" ======================== out of addOrRemoveCartPost ==========================\n")
};


// const addOrRemoveCartPost = async (taskData) => {
//     console.log(" ======================== im in addOrRemoveCartPost ==========================\n")

//     const { uid, postOwnerId, postId } = taskData;

//     const postRef = db.collection("users_posts").doc(postOwnerId).collection("posts").doc(postId);

//     const cartRef = db.collection("users_cart_posts").doc(uid);
    
//     // If its the first recipe post added create the cart list
//     await cartRef.get()
//     .then(async doc => {
//         let jsonData = JSON.stringify(doc);
//         console.log("doc = " + jsonData);
//         if (!doc.exists || doc.exists && !doc.data().cart) {
//             // Document doesn't exist, create it and add the "Liked" array
//             await cartRef.set({
//                 cart: [] // Create the array 
//             }, { merge: true }); // Use merge: true to avoid overwriting other fields
//             console.log('Document and cart reference created successfully.'); 
//         }

//         // Check if cart contains the post already
//         let cartArray = [];

//         if (doc.data().cart) {
//             cartArray = doc.data().cart;
//         }

//         console.log("\n\npostRef.posts = " + postRef["_path"]["segments"][3] + "\n\n");

//         // If the user already added this post remove it from his cart
//         if (cartArray && cartArray.some(cartItem => cartItem["_path"]["segments"][3] === postRef["_path"]["segments"][3])){
//             console.log('addOrRemoveCartPost - User already added this post remove it from his cart.');
            
//             await cartRef.update({ cart: admin.firestore.FieldValue.arrayRemove(postRef) })
//             .then(async () => {
//                 console.log('addOrRemoveCartPost - PostRef removed from the "cart" array.');
//                 parentPort.postMessage({ success: true, data: false});
//             })
//             .catch(error => {
//                 console.error('addOrRemoveCartPost - Error removing recipe post from array:', error);
//                 parentPort.postMessage({ success: false, error: "Error: " + error });
//             });
//         }
//         else // User wants to add this recipe post to cart
//         {
//             console.log('addOrRemoveCartPost - User wants to add this recipe post to cart');
//             await cartRef.update({ cart: admin.firestore.FieldValue.arrayUnion(postRef)})
//             .then(async () => {
//                 console.log('addOrRemoveCartPost - Recipe post added to cart successfully');
//                 parentPort.postMessage({ success: true, data: true});
//             })
//             .catch(error => {
//                 console.error('addOrRemoveCartPost - Error - adding recipe post to cart: ', error);
//                 parentPort.postMessage({ success: false, error: "Error: " + error });
//             });
//         }
//     })
//     .catch(error => {
//         console.error('addOrRemoveCartPost - Error - Cart array retrival: ', error);
//         parentPort.postMessage({ success: false, error: "Error: " + error });
//     });

//     console.log(" ======================== out of addOrRemoveCartPost ==========================\n")
// };


const getLikedOrCartPosts = async (taskData) => {
    console.log(" ======================== im in getLikedOrCartPosts ==========================\n")

    const { uid, collectionName } = taskData;

    let Ref = db.collection(collectionName).doc(uid);

    let postsRef = [];

    await Ref.get()
    .then(async (snapshot) => {
        if (!snapshot.empty) {
            let i = 0;

            // Collect All the necessary posts refrences
            if (collectionName === "users_liked_posts"){
                if (snapshot.data() && snapshot.data().liked_list){

                    snapshot.data().liked_list.forEach((doc) => {
                        const jsonData = JSON.stringify(doc);
                        console.log(i++ + ")  " + jsonData);
                        //   const post = getObjectFromRef(data)
                        postsRef.push(doc);
                    });
                }
            }
            else {
                if (snapshot.data() && snapshot.data().cart){
                    snapshot.data().cart.forEach((doc) => {
                        const jsonData = JSON.stringify(doc);
                        console.log(i++ + ")  " + jsonData);
                        postsRef.push(doc);
                    });
                }
            }

            let postJsonData = JSON.stringify(postsRef);
            console.log("\npostRefList = " + postJsonData);
        
            // Fatch all the actual posts simultaneously
            fetchDocumentsFromReferences(postsRef, uid, collectionName)
            .then((documents) => {
                console.log("\npostsList = " + JSON.stringify(documents, null, 2));

                // Create the response
                const response = {
                    posts: documents
                }
            
                // Response for android
                parentPort.postMessage({ success: true, data: JSON.stringify(response)});
            })
            .catch((error) => {
                console.error("getLikedOrCartPosts - fetchDocumentsFromReferences - Error: ", error);
                parentPort.postMessage({ success: false, error: "Error: " + error });
            });
        } 
        else // No posts found in the collection
        {
            console.log("No posts found in the collection");
            parentPort.postMessage({ success: false, data: "No posts found in the collection"});
        }
    })
    .catch(error => {
        console.error('getLikedOrCartPosts - Error - array retrival: ', error);
        parentPort.postMessage({ success: false, error: "Error: " + error });
    });
    
    console.log(" ======================== out of getLikedOrCartPosts ==========================\n")
};

const deleteProfilePosts = async (taskData) => {
    console.log(" ======================== im in deleteProfilePosts ==========================\n")

    const { uid, PostsId } = taskData;

    console.log("\nPostsId = " + JSON.stringify(PostsId, null, 2));

    try {
        // Create a batched write
        const batch = db.batch();

        for (const documentId of PostsId) {
            // Get a reference to the document you want to delete
            const docRef = db.collection("users_posts").doc(uid).collection("posts").doc(documentId);

            // Delete the document reference in the batch
            batch.delete(docRef);
        }

        // Commit the batched write
        await batch.commit();
        console.log('Batch delete successful');

        // Delete individual posts using Promise.all()
        await Promise.all(PostsId.map(async post_id => {
            let postRef = db.collection("users_posts").doc(uid).collection("posts").doc(post_id);
            await postRef.delete();
            console.log("post " + post_id + " deleted successfully");
        }));

        // Decrement the counter value by -1
        const accountSettingsRef = db.collection("users_account_settings").doc(uid);
        await accountSettingsRef.update({
            posts: admin.firestore.FieldValue.increment(-PostsId.length)
        });

        // Send success response back to the client
        parentPort.postMessage({ success: true, data: true });
    } catch (error) {
        // Handle errors
        console.error('Error performing deleteProfilePosts:', error);
        parentPort.postMessage({ success: false, error: "Error: " + error });
    }

    console.log(" ======================== out of deleteProfilePosts ==========================\n");
};


const followUnfollow = async (taskData) => {
    console.log(" ======================== im in followUnfollow ==========================\n")

    const { uid, friendUid, followOrNot } = taskData;

    // console.log("\nPostsId = " + JSON.stringify(PostsId, null, 2));

    const userRef = db.collection("users_account_settings").doc(uid);
    const friendRef = db.collection("users_account_settings").doc(friendUid);

    console.log("\n\nfollowOrNot = " + followOrNot + "\n\n");
    
    // Update the user followings details & friends followers details.
    if (followOrNot){
        await userRef.update({ 
            following_ids: admin.firestore.FieldValue.arrayUnion(friendUid),
            following: admin.firestore.FieldValue.increment(1)
        })
        .then(async () => {
            // Add new following & followers
            await friendRef.update({ 
                followers_ids: admin.firestore.FieldValue.arrayUnion(uid),
                followers: admin.firestore.FieldValue.increment(1)
            })
            .then(() => {
                console.log("followUnfollow - If - All done successfully updated user and friend users_account_settings!");
                parentPort.postMessage({ success: true, data: true });
            })
            .catch(error => {
                console.error('followUnfollow - Error updating friend users_account_settings: ', error);
                parentPort.postMessage({ success: false, data: false , error: "Error: " + error });
            });
        })
        .catch(error => {
            console.error('followUnfollow - Else - Error updating user users_account_settings: ', error);
            parentPort.postMessage({ success: false, data: false,  error: "Error: " + error });
        });
    }
    // Remove following & followers
    else
    {
        await userRef.update({ 
            following_ids: admin.firestore.FieldValue.arrayRemove(friendUid),
            following: admin.firestore.FieldValue.increment(-1)
        })
        .then(async () => {
            // Add new following & followers
            await friendRef.update({ 
                followers_ids: admin.firestore.FieldValue.arrayRemove(uid),
                followers: admin.firestore.FieldValue.increment(-1)
            })
            .then(() => {
                console.log("followUnfollow - Else - All done successfully updated user and friend users_account_settings!");
                parentPort.postMessage({ success: true, data: true });
            })
            .catch(error => {
                console.error('followUnfollow - Else - Error updating friend users_account_settings: ', error);
                parentPort.postMessage({ success: false, data: false , error: "Error: " + error });
            });
        })
        .catch(error => {
            console.error('followUnfollow - Else - Error updating user users_account_settings: ', error);
            parentPort.postMessage({ success: false, data: false,  error: "Error: " + error });
        });
    }
    
    console.log(" ======================== out of followUnfollow ==========================\n");
};



// Function to fetch documents from references
async function fetchDocumentsFromReferences(referenceList, uid, collectionName) {
    try {
        // Fatch all documents
        const fetchPromises = referenceList.map((reference) => reference.get());
        const documentSnapshots = await Promise.all(fetchPromises);

        let problematicIndexes = [];
        const documents = await Promise.all(documentSnapshots.map(async (snapshot, index) => {
            if (snapshot.exists) {
                return snapshot.data();
            } else {
                problematicIndexes.push(index);
                return null;
            }
        }));

        // Remove refrences to null object
        const removePromises = problematicIndexes.map(async (index) => {
            const problematicPostRef = referenceList[index];
            const Ref = db.collection(collectionName).doc(uid);

            if (collectionName === "users_liked_posts") {
                await Ref.update({ liked_list: admin.firestore.FieldValue.arrayRemove(problematicPostRef) });
            }
            else if (collectionName === "users_feeds"){
                await Ref.update({ posts: admin.firestore.FieldValue.arrayRemove(problematicPostRef) });
            }
            else if (collectionName === "users_cart_posts"){
                await Ref.update({ cart: admin.firestore.FieldValue.arrayRemove(problematicPostRef) });
            }

            console.log('fetchDocumentsFromReferences - problematicPostRef removed from the array.');
        });

        await Promise.all(removePromises);

        // Clear the null object collected from collection
        const filteredDocuments = documents.filter((document) => document !== null);
        console.log("\filteredDocuments = " + JSON.stringify(filteredDocuments, null, 2));

        return filteredDocuments;
    } catch (error) {
        console.error("Error fetching documents:", error);
        throw error;
    }
}


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
        case 'addCommentToPost':
            result = await addCommentToPost(message.data);
            break;
        case 'getPostComments':
            result = await getPostComments(message.data);
            break;
        case 'addOrRemoveLikeToPostComment':
            result = await addOrRemoveLikeToPostComment(message.data);
            break;
        case 'addOrRemoveCartPost':
            result = await addOrRemoveCartPost(message.data);
            break;
        case 'getLikedOrCartPosts':
            result = await getLikedOrCartPosts(message.data);
            break;
        case 'deleteProfilePosts':
            result = await deleteProfilePosts(message.data);
            break;
        case 'followUnfollow':
            result = await followUnfollow(message.data);
            break;
        default:
          break;
      }
    // } catch (err) {
    //     console.log("user_worker: Error in the switch: " + err);
    // }
  }

