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
    console.log("im in signupHendler")
    const taskData = {
        work: SIGNUP,
        email: String(req.body.email),
        id: String(req.body.user_id),
        username: req.body.username || "none",
        phone_number: req.body.phone_number || "none"
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
        email: String(req.params.email),
        ref: ref
    };
    addTask(taskData, res);
};


const patchUserHandler = async (req, res, ref) => {

    const taskData = {
        work: PATCH_USER,
        email: req.body.email,
        password: req.body.password,
        phone_number: req.body.phone_number,
        username: req.body.username,
        ref: ref
    };
    addTask(taskData, res);
};


const patchUserAccountSettingsHandler = async (req, res, ref) => {

    const taskData = {
        work: PATCH_USER_ACCOUNT_SETTINGS,
        email: req.body.email,
        username: req.body.username,
        description: req.body.description,
        display_name: req.body.display_name,
        profile_photo: req.body.profile_photo,
        isBusiness: req.body.isBusiness,
        followers: req.body.followers,
        following: req.body.following,
        posts: req.body.posts,
        website: req.body.website,
        ref: ref
    };
    addTask(taskData, res);
};

const deleteObjectFromRefHendler = async (req, res) => {
    console.log("ref == " + req.params.ref);
    const taskData = {
        work: DELETE,
        email: req.params.email
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

 
  export {executeCheckUserNameHandler, signupHendler, loginHendler, getUserHendler, patchUserHandler, patchUserAccountSettingsHandler, deleteObjectFromRefHendler};
