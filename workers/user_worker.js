import { Worker, isMainThread, workerData } from 'worker_threads';
// import { notify } from './worker';

const SIGNUP = 0;
const LOGIN = 1;
const PATCH_USER = 2;
const DELETE = 3;
const GET_USER_DATA = 4;
const PATCH_USER_ACCOUNT_SETTINGS = 5;
const CHECK_USERNAME = 6;



// Worker class
class user_worker {
    constructor() {
        this.worker = new Worker('./workers/worker.js');
        this.isIdle = true;
        this.taskData = null;
        this.res = null;
        this.worker.on('message', this.handleMessage.bind(this));
    }
  
    // Assign a task to the worker
    assignTask(taskData, res) {
        
        this.isIdle = false;
        console.log("im in assignTask with this task: " + taskData.work);
        this.res = res;
        this.taskData = taskData;
        switch(taskData.work) {
            case SIGNUP:
                this.worker.postMessage({ type: 'signup', data: taskData });
                break;
            case LOGIN:
                this.worker.postMessage({ type: 'login', data: taskData });
                break;
            case GET_USER_DATA:
                this.worker.postMessage({ type: 'getUserData', data: taskData });
                break;
            case PATCH_USER:
                this.worker.postMessage({ type: 'patchUser', data: taskData });
                break;
            case PATCH_USER_ACCOUNT_SETTINGS:
                this.worker.postMessage({ type: 'patch_UAS', data: taskData });
                break;
            case DELETE:
                this.worker.postMessage({ type: 'deleteUser', data: taskData });
                break;
            case CHECK_USERNAME:
                this.worker.postMessage({ type: 'checkUsername', data: taskData });
                break;
            default:
                break;
        }
    }

    // Handle the message from the worker
    handleMessage(result) {
        if(result.success){
            this.res.status(200).send(result.data);
        }
        else {
            this.res.status(400).send(result.error);
        }
        this.isIdle = true;

        // this.taskData.callback(result);
    }
}

export {user_worker};