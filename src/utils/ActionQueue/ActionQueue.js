/**
 * ActionQueue is a simple implementation of an action queue. It allows you to push actions
 * to the queue and once started, will execute them all synchronously. Any actions pushed
 * after the queue has been started will execute immediately. Stopping the queue will
 * prevent actions from executing immediately. It will instead push the actions to the
 * queue and then execute them once the queue has started.
 *
 * @class ActionQueue
 */
class ActionQueue {
    constructor() {
        this._queue = [];
        this._started = false;
        this._debugLog = [];
    }

    /**
     * Will begin executing actions in the queue. The actions will execute synchronously
     * (even for async operations). Any actions that are pushed after the queue has been
     * started will execute immediately.
     *
     * @memberof ActionQueue
     */
    start() {
        // eslint-disable-next-line no-negated-condition
        if (!this._started) {
            this._started = true;
            this._debugLog.push(`Queue started`);
            while (!this.isEmpty) {
                this.pop();
            }
        }
    }

    /**
     * Will stop the execution of actions. Any actions pushed after the queue
     * was stopped will execute when the queue starts again.
     *
     * @memberof ActionQueue
     */
    stop() {
        this._started = false;
        this._debugLog.push(`Queue stopped`);
    }

    /**
     * Push an action to the action queue for it to be executed. If the queue has
     * already started, then the action will be executed immediately. If the queue
     * is stopped, or has not yet been started, the action will be added to the queue
     * and will be executed once the queue is started. The actions will execute in the
     * order they were pushed.
     *
     * An action pushed to the queue must have 2 properties- an action name and
     * an action (function) to be executed.
     *
     * @param {object} action - the action to be actionually executed
     * @param {string} action.name - the name of the action to be executed
     * @param {function} action.onExecute - the action that will be executed
     * @param {[*]} action.args - any arguments that should be passed into the action when called
     * @memberof ActionQueue
     */
    push(action) {
        if (!action.onExecute) {
            throw new Error('Action must have an onExecute function');
        }
        if (typeof action.onExecute !== 'function') {
            throw new TypeError('onExecute must be a function');
        }
        if (!action.name) {
            throw new Error('action must have a name');
        }
        if (typeof action.name !== 'string') {
            throw new TypeError('action name must be a string');
        }
        if (action.args && typeof action.args !== 'object') {
            throw new TypeError('Args must be in an array');
        }
        this._queue.push(action);
        this._debugLog.push(`${action.name} added`);
        this.pop();
    }

    // Private Functions


    /**
     * This will remove an item from the queue and execute its action as long as the queue has started.
     *
     * @returns
     * @memberof ActionQueue
     */
    pop() {
        if (!this._started) {
            return;
        }
        if (this.size > 0) {
            let e = this._queue.shift();
            this._debugLog.push(`${e.name} removed`);
            if (e.args) {
                e.onExecute(...e.args);
            } else {
                e.onExecute();
            }
        } else {
            throw new Error('Attempt to pop with no actions in queue');
        }
    }

    clear() {
        this._queue = [];
        this._debugLog = [];
        this._debugLog.push('Queue cleared');
    }

    get isEmpty() {
        return this._queue.length === 0;
    }

    get size() {
        return this._queue.length;
    }

    printLog() {
        this._debugLog.forEach(element => {
            console.log(element);  // eslint-disable-line no-console
        });
    }
}

export default ActionQueue;
