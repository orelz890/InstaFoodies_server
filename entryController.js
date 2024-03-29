import { app, crypto, admin, db } from './config/firebase.js';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import bcrypt from 'bcryptjs';
import { Worker, isMainThread, workerData } from 'worker_threads';
import Joi from 'joi';
import { user_worker } from './workers/user_worker.js';
import os from 'os';

const saltRounds = 10;
const SIGNUP = 0;
const LOGIN = 1;
const PATCH_USER = 2;
const DELETE = 3;
const GET_USER_DATA = 4;
const PATCH_USER_ACCOUNT_SETTINGS = 5;
const CHECK_USERNAME = 6;
const CREATE_NEW_CHAT_GROUP = 7;
const GET_CHAT_GROUPS = 8;
const GET_FOLLWING = 9;
const GET_CONTACTS = 10;
const GET_REQUESTS = 11;
const GET_CONTACTS_USERS_AND_ACCOUNTS = 12;
const GET_FOLLOWINGS_USERS_AND_ACCOUNTS = 13;
const GET_BOTH_USER_AND_ACCOUNT = 14;
const UPLOAD_PROFILE_PHOTO = 15;
const UPLOAD_POST = 16;
const GET_USER_FEED = 17;
const GET_USER_PROFILE_FEED = 18;
const ADD_OR_REMOVE_POST_LIKE = 19;
const ADD_COMMENT_TO_POST = 20;
const GET_POST_COMMENTS = 21;
const ADD_OR_REMOVE_LIKE_TO_COMMENT = 22;
const ADD_OR_REMOVE_RECIPE_POST_TO_CART = 23;
const GET_LIKED_OR_CART_POSTS = 24;
const DELETE_USER_POST = 25;
const FOLLOW_OR_UNFOLLOW = 26;
const REPORT_ILLEGAL_POST = 27;
const GET_USER_AND_FEED = 28;




const NUM_CPUS = os.cpus().length;
const NUM_WORKERS = NUM_CPUS - 3;
const MAX_QUEUE_SIZE = 1000;

// Create a pool of workers
const workers = [];
for (let i = 0; i < NUM_WORKERS; i++) {
  workers.push(new user_worker());
}

// A queue of tasks to be executed
const taskQueue = [];

// Add a task to the queue
function addTask(taskData, res) {
    console.log("im in addTask")
    const task = {
        taskData: taskData,
        res: res
    }
    if (taskQueue.length < MAX_QUEUE_SIZE) {
        taskQueue.push(task);
    }
    else {
        // Send a 503 (Service Unavailable) response to indicate that the server is busy
        res.status(503).send("Server is busy, please try again later.");
    }
}

// Process the task queue
function processTaskQueue() {
  while (taskQueue.length > 0) {
    // Get the next task from the queue
    const task = taskQueue.shift();
    // Find a free worker
    const worker = workers.find((w) => w.isIdle);
    if (worker) {
        console.log("found a free worker");
      // Assign the task to the worker
      worker.assignTask(task.taskData, task.res);
    } else {
      // No free worker found, put the task back in the queue
      taskQueue.unshift(task);
      break;
    }
  }
}


/* 
By setting up this timer, the function is executed periodically, ensuring 
that tasks are processed and completed in a timely and efficient manner.
Without this timer, the task queue would not be processed unless a new task
is added to the queue. As a result, tasks could potentially wait in the 
queue for a long time, causing delays and increasing the server's response time.
*/ 
setInterval(processTaskQueue, 100);



const signupHendler = async (req, res) => {
    console.log("im in signupHendler " + req.body.full_name) 
    const taskData = {
        work: SIGNUP,
        email: req.body.email,
        id: req.body.user_id,
        username: req.body.username || "none",
        full_name: req.body.full_name || "none",
        phone_number: req.body.phone_number || "-1",
        state: req.body.state || "online",
        date: req.body.date || "",
        time: req.body.time || "",
        paypalClientId: req.body.paypalClientId || "",
    };
    addTask(taskData, res);
};

const loginHendler = async (req, res) => {

    const taskData = {
        work: LOGIN,
        email: String(req.body.email),
        password: String(req.body.password)
    };
    addTask(taskData, res);

};


// just an example of how to access the users in firestore
const getUserHendler = async (req, res, ref) => {
    
    const taskData = {
        work: GET_USER_DATA,
        uid: req.params.uid,
        ref: ref
    };
    addTask(taskData, res);
};


const patchUserHandler = async (req, res, ref) => {

    console.log("\n\nim in patchUserHandler!! \n\n")
    // const taskData = {
    //     work: PATCH_USER,
    //     uid: req.params.uid,
    //     email: req.body.email,
    //     password: req.body.password,
    //     phone_number: req.body.phone_number,
    //     username: req.body.username,
    //     full_name: req.body.full_name,
    //     ref: ref
    // };
    const taskData = {
        work: PATCH_USER,
        uid: req.params.uid,
        phone_number: req.body.phone_number,
        full_name: req.body.full_name,

    };
    addTask(taskData, res);
};


const patchUserAccountSettingsHandler = async (req, res, ref) => {

    const taskData = {
        work: PATCH_USER_ACCOUNT_SETTINGS,
        uid: req.params.uid,
        description: req.body.description,
        website: req.body.website,
        paypalClientId: req.body.paypalClientId,

    };
    addTask(taskData, res);
};

const deleteObjectFromRefHendler = async (req, res) => {
    console.log("ref == " + req.params.ref);
    const taskData = {
        work: DELETE,
        uid: req.params.uid
    };
    addTask(taskData, res);
  };

 
const executeCheckUserNameHandler = async (req, res) => {
    console.log("im in executeCheckUserNameHandler\n");
    const taskData = {
        work: CHECK_USERNAME,
        username: req.params.username
    };
    addTask(taskData, res);
  };


const createNewChatGroupHandler = async (req, res) => {
    console.log("im in createNewChatGroupHandler\n");
    const taskData = {
        work: CREATE_NEW_CHAT_GROUP,
        uid: req.params.uid,
        name: req.params.name
    };
    addTask(taskData, res);
};


const getChatGroupHandler = async (req, res) => {
    console.log("im in getChatGroupHandler\n");
    const taskData = {
        work: GET_CHAT_GROUPS,
        uid: req.params.uid
    };
    addTask(taskData, res);
};

const getFollowingUsersHandler = async (req, res, ref) => {

    let id = req.params.uid;
    console.log("im in getFollowingUsersHandler\n id = " + id);

    const taskData = {
        work: GET_FOLLWING,
        uid: id,
        ref: ref
    };
    addTask(taskData, res);
};

const getContactsHandler = async (req, res, ref) => {
    console.log("im in getContactsHandler\n");

    let uid = req.params.uid;

    console.log("id = " + uid);

    const taskData = {
        work: GET_CONTACTS,
        uid: uid,
        ref: ref
    };
    addTask(taskData, res);
};

const getRequestsHandler = async (req, res) => {
    console.log("im in getContactsHandler\n");

    let uid = req.params.uid;

    console.log("id = " + uid);

    const taskData = {
        work: GET_REQUESTS,
        uid: uid,
    };
    addTask(taskData, res);
};
 
const getContactsUsersAndSettingsHandler = async (req, res) => {
    console.log("im in getContactsUsersAndSettingsHandler\n");

    let uid = req.params.uid;

    console.log("id = " + uid);

    const taskData = {
        work: GET_CONTACTS_USERS_AND_ACCOUNTS,
        uid: uid,
    };
    addTask(taskData, res);
};

const getFollowingUsersAndAccountsHandler = async (req, res) => {
    console.log("im in getFollowingUsersAndAccountsHandler\n");

    let uid = req.params.uid;

    console.log("id = " + uid);

    const taskData = {
        work: GET_FOLLOWINGS_USERS_AND_ACCOUNTS,
        uid: uid,
    };
    addTask(taskData, res);
};


const getBothUserAndHisSettingsHandler = async (req, res) => {
    console.log("im in getBothUserAndHisSettingsHandler\n");

    let uid = req.params.uid;

    console.log("id = " + uid);

    const taskData = {
        work: GET_BOTH_USER_AND_ACCOUNT,
        uid: uid,
    };
    addTask(taskData, res);
};


const uploadProfilePhotoHandler = async (req, res) => {
    console.log("im in uploadProfilePhotoHandler\n");

    let uid = req.params.uid;
    let image_uri = req.params.image_uri

    console.log("id = " + uid);

    const taskData = {
        work: UPLOAD_PROFILE_PHOTO,
        uid: uid,
        image_uri: image_uri
    };
    addTask(taskData, res);
};


const uploadNewPostHandler = async (req, res) => {
    console.log("im in uploadProfilePhotoHandler\n");

    let uid = req.params.uid;

    console.log("id = " + uid);

    const taskData = {
        work: UPLOAD_POST,
        recipe: req.body.recipe || null,
        caption: req.body.caption,
        date_created: req.body.date_created,
        image_paths: req.body.image_paths || [],
        liked_list: req.body.liked_list || [],
        comments_list: req.body.comments_list || [],
        post_id: req.body.post_id,
        user_id: req.body.user_id,
        tags: req.body.tags
    };
    addTask(taskData, res);
};


const getUserFeedPostsHandler = async (req, res) => {
    console.log("im in getUserFeedPostsHandler\n");

    let uid = req.params.uid;

    console.log("id = " + uid);

    const taskData = {
        work: GET_USER_FEED,
        uid: uid
    };
    addTask(taskData, res);
};


const getUserAndHisFeedPostsHandler = async (req, res) => {
    console.log("im in getUserAndHisFeedPostsHandler\n");

    let uid = req.params.uid;

    console.log("id = " + uid);

    const taskData = {
        work: GET_USER_AND_FEED,
        uid: uid
    };
    addTask(taskData, res);
};


const getProfileFeedPostsHandler = async (req, res) => {
    console.log("im in getProfileFeedPostsHandler\n");

    let uid = req.params.uid;

    console.log("id = " + uid);

    const taskData = {
        work: GET_USER_PROFILE_FEED,
        uid: uid
    };
    addTask(taskData, res);
};
 
const addOrRemovePostLikedHandler = async (req, res) => {
    console.log("im in getUserFeedPostsHandler\n");

    const taskData = {
        work: ADD_OR_REMOVE_POST_LIKE,
        uid: req.params.uid,
        postOwnerId: req.params.postOwnerId,
        postId: req.params.postId,
    };
    addTask(taskData, res);
};

const addCommentToPostHandler = async (req, res) => {
    console.log("im in addCommentToPostHandler\n");

    const taskData = {
        work: ADD_COMMENT_TO_POST,
        postOwnerId: req.params.postOwnerId,
        postId: req.params.postId,
        uid: req.params.uid,
        comment: req.params.comment,
        name: req.params.name,
        photo: req.params.photo,
        commentId: req.params.commentId,
    };
    addTask(taskData, res);
};

const getPostCommentsHandler = async (req, res) => {
    console.log("im in getPostCommentsHandler\n");

    const taskData = {
        work: GET_POST_COMMENTS,
        postOwnerId: req.params.postOwnerId,
        postId: req.params.postId,
    };
    addTask(taskData, res);
};

const addOrRemoveLikeToPostCommentHandler = async (req, res) => {
    console.log("im in addOrRemoveLikeToPostCommentHandler\n");

    const taskData = {
        work: ADD_OR_REMOVE_LIKE_TO_COMMENT,
        postOwner: req.params.postOwner,
        postId: req.params.postId,
        uid: req.params.uid,
        position: req.params.position
    };
    addTask(taskData, res);
};

const addOrRemoveCartPostHandler = async (req, res) => {
    console.log("im in addOrRemoveCartPostHandler\n");

    const taskData = {
        work: ADD_OR_REMOVE_RECIPE_POST_TO_CART,
        uid: req.params.uid,
        postOwnerId: req.params.postOwnerId,
        postId: req.params.postId,
    };
    addTask(taskData, res);
};


const getLikedOrCartPostsHandler = async (req, res, collectionName) => {
    console.log("im in getLikedOrCartPostsHandler\n");

    const taskData = {
        work: GET_LIKED_OR_CART_POSTS,
        uid: req.params.uid,
        collectionName: collectionName
    };
    addTask(taskData, res);
};

const deleteProfilePostsHandler = async (req, res) => {
    console.log("im in deleteProfilePostsHandler\n");

    const taskData = {
        work: DELETE_USER_POST,
        uid: req.params.uid,
        PostsId: req.body
    };
    addTask(taskData, res);
};


const followUnfollowHandler = async (req, res) => {
    console.log("im in followUnfollowHandler\n");

    const taskData = {
        work: FOLLOW_OR_UNFOLLOW,
        uid: req.params.uid,
        friendUid: req.params.friendUid,
        followOrNot: req.params.followOrNot,
    };
    addTask(taskData, res);
};


const reportIllegalPostHandler = async (req, res) => {
    console.log("im in reportIllegalPostHandler\n");

    const taskData = {
        work: REPORT_ILLEGAL_POST,
        uid: req.params.uid,
        post_id: req.params.post_id,
    };
    addTask(taskData, res);
};

  export {getUserAndHisFeedPostsHandler, reportIllegalPostHandler, followUnfollowHandler, deleteProfilePostsHandler, getLikedOrCartPostsHandler, addOrRemoveCartPostHandler, addOrRemoveLikeToPostCommentHandler, getPostCommentsHandler, addCommentToPostHandler, addOrRemovePostLikedHandler, getProfileFeedPostsHandler, getUserFeedPostsHandler, uploadNewPostHandler, uploadProfilePhotoHandler, getBothUserAndHisSettingsHandler, getFollowingUsersAndAccountsHandler, getContactsUsersAndSettingsHandler, getRequestsHandler, getContactsHandler, getFollowingUsersHandler, getChatGroupHandler, createNewChatGroupHandler, executeCheckUserNameHandler, signupHendler, loginHendler, getUserHendler, patchUserHandler, patchUserAccountSettingsHandler, deleteObjectFromRefHendler};
