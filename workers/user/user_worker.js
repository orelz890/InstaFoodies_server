import { Worker, isMainThread, workerData } from 'worker_threads';

const SIGNUP = 0;
const LOGIN = 1;
const PATCH = 2;
const DELETE = 3;

// Worker class
class user_worker {
    constructor() {
        this.worker = new Worker('./workers/user/worker.js');
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
            case PATCH:
                this.worker.postMessage({ type: 'patchUser', data: taskData });
                break;
            case DELETE:
                this.worker.postMessage({ type: 'deleteUser', data: taskData });
                break;
            default:
                break;
        }
        
    }

    // Handle the message from the worker
    handleMessage(result) {
        this.isIdle = true;
        if(result.success){
            this.res.status(200).send(result.data);
        }
        else {
            this.res.status(400).send(result.error);
        }
        // this.taskData.callback(result);
    }
}

export {user_worker};