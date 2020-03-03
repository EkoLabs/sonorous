import EventEmitter from 'eventemitter3';

/**
 * BufferCacheItem is a generic class that both the DecodedBufferCache and EncodedBufferCache use.
 * The BufferCacheItem contains a task, that when started, will return a promise/resolve into a buffer.
 * It also keeps track of its references and will emit an event when there are no more references to it.
 * It is up to the cache to remove this element when it no longer has any references.
 *
 * @export
 * @class BufferCacheItem
 * @extends {EventEmitter}
 */
export default class BufferCacheItem extends EventEmitter {
    /**
     * Creates an instance of BufferCacheItem. BufferCacheItem extends EventEmitter
     * so it can send events.
     * @param {string} url - the URL associated with the buffer
     * @param {BufferTask} loadingTask - The task that can be started, canceled, and will resolve with a buffer. See DecodeBufferTask or AxiosDownloadTask for the necessary methods/properties.
     * @memberof BufferCacheItem
     */
    constructor(url, loadingTask) {
        super();

        // Param validity checks
        if (!url) {
            throw new Error('Missing required url');
        }

        if (typeof url !== 'string') {
            throw new TypeError('Url must be a string');
        }

        if (!loadingTask) {
            throw new Error('Missing required loading task');
        }

        if (typeof loadingTask.start !== 'function') {
            throw new Error('Expected a start function for task');
        }

        if (typeof loadingTask.cancel !== 'function') {
            throw new Error('Expected a cancel function for task');
        }

        if (typeof loadingTask.bufferPromise !== 'object') {
            throw new Error('Expected a request property for task');
        }

        this._url = url;
        this._buffer = null;
        this._task = loadingTask;
        this._bufferPromise = null;
        this._refCount = 1;
    }

    copyArrayBuffer(buffer) {
        if (buffer && buffer instanceof ArrayBuffer) {
            return buffer.slice(0);
        }
        return buffer;
    }

    /**
     * If we already have the buffer, we will return it. If we don't have the buffer, we will return a promise that will resolve with the buffer.
     *
     * @readonly
     * @memberof BufferCacheItem
     */
    get bufferPromise() {
        if (this._buffer) {
            return Promise.resolve(this.copyArrayBuffer(this._buffer));
        }
        return this._bufferPromise;
    }

    /**
     * Based on the presence of the buffer or the task, we can determine the loading state of this item.
     * The state can be one of 3 values - 'loading', 'loaded', or 'failed'.
     *
     * @readonly
     * @memberof BufferCacheItem
     */
    get state() {
        let retVal = '';
        if (this._buffer === null && this._task === null) {
            retVal = 'failed';
        } else if (this._buffer === null && this._task !== null) {
            retVal = 'pending';
        } else if (this._buffer !== null && this._task === null) {
            retVal = 'loaded';
        }
        return retVal;
    }

    /**
     * Returns the number of references to this cache item
     *
     * @readonly
     * @memberof BufferCacheItem
     */
    get refs() {
        return this._refCount;
    }

    /**
     * This will call start() on the task, and return a promise that will resolve into the buffer
     *
     * @returns
     * @memberof BufferCacheItem
     */
    startTask() {
        if (this._task) {
            this._task.start();
            this._bufferPromise = this._task.bufferPromise
                .then(this.onSuccess.bind(this), this.onFailure.bind(this));
        }
    }

    /**
     * Increment the ref count of this cache item by 1
     *
     * @memberof BufferCacheItem
     */
    addRef() {
        if (this._refCount > 0) {
            this._refCount += 1;
        } else {
            this.emit('error', new Error('Attempted to add refs after item has been released'), this._url);
        }
    }

    /**
     * Decrement the ref count of this cache item by 1. If the ref count hits 0, emit a "nomorerefs" event.
     *
     * @memberof BufferCacheItem
     */
    removeRef() {
        this._refCount -= 1;
        if (this._refCount === 0) {
            if (this._task) {
                this._task.cancel();
            }
            this._buffer = null;
            this._task = null;
            this.emit('nomorerefs', this._url);
        }
    }

    /**
     * Cancel a task if so desired.
     *
     * @memberof BufferCacheItem
     */
    cancel() {
        if (this._task) {
            this._task.cancel();
        }
    }

    /**
     * If the task's promise successfully resolves, store the buffer and nullify the task.
     *
     * @param {*} buf
     * @memberof BufferCacheItem
     */
    onSuccess(buf) {
        this._buffer = buf;
        this._task = null;
        return this.copyArrayBuffer(this._buffer);
    }

    /**
     * If the task's promise failed, emit an error.
     *
     * @param {*} error
     * @memberof BufferCacheItem
     */
    onFailure(error) {
        if (error.code && error.code === 99 && error.message === 'Request Cancelled') { // eslint-disable-line no-magic-numbers
            this.emit('requestcancelled', this._url);
            this._task = null;
            this._buffer = null;
        } else {
            this._task = null;
            this._buffer = null;
            this.emit('error', error, this._url);
            throw error;
        }
    }
}
