import { app, crypto, admin, db } from './config/firebase.js';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import bcrypt from 'bcryptjs';
import { Worker, isMainThread, workerData } from 'worker_threads';
import Joi from 'joi';
import { user_worker } from './workers/user/user_worker.js';
const saltRounds = 10;
const SIGNUP = 0;
const LOGIN = 1;
const PATCH = 2;
const DELETE = 3;


const NUM_WORKERS = 4;

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
  taskQueue.push(task);
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

// Start processing the task queue
setInterval(processTaskQueue, 100);



const signupHendler = async (req, res) => {
    console.log("im in signupHendler")
    const taskData = {
        work: SIGNUP,
        email: String(req.body.email),
        password: String(req.body.password),
        name: String(req.body.name)
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

    const taskData = {
        work: PATCH,
        uid: String(req.body.uid),
        name: req.body.name,
        email: String(req.body.email),
        // password: String(req.body.password),
        isBusiness: req.body.isBusiness || false,
        followers: req.body.followers || null,
        following: req.body.following || null,
        Cart: req.body.Cart || null,
        Likes: req.body.Likes || null,
        myPosts: req.body.myPosts || null,
        myRecipePosts: req.body.myRecipePosts || null
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

 
  export {signupHendler, loginHendler, getUserHendler, patchUser, deleteObjectFromRefHendler};
