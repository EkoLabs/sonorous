import AxiosDownloadTask from './AxiosDownloadTask';
import BufferCacheItem from './BufferCacheItem';

/**
 * A singleton class that maintains a cache of **encoded**
 * audio buffers and spawns download tasks for new URLs.
 *
 * @export
 * @class EncodedBufferCache
 */
export default class EncodedBufferCache {
    constructor() {
        this._bufferCache = {};
    }

    static get instance() {
        if (!this._instance) {
            this._instance = new EncodedBufferCache();
        }
        return this._instance;
    }

    /**
     * Creates a download task and begins the download process.
     * If it already has a buffer for that url in the cache, it will
     * resolve immediately with the cached buffer. If the url is
     * currently downloading, it will return the promise from the
     * first download task to request it.
     *
     * @param {String} url
     * @returns A promise that will resolve with the decoded buffer
     * @memberof EncodedBufferCache
     */
    getEncodedBuffer(url) {
        if (typeof url !== 'string') {
            throw new TypeError('Expected url to be a string');
        }

        // If we already have an encoded buffer in the cache for this URL, then resolve immediately with it.
        if (this._bufferCache[url]) {
            // If we haven't errored out, then return the promise if we're currently loading or the buffer if we've finished loading
            if (this._bufferCache[url].status !== 'failed') {
                this._bufferCache[url].addRef();
                return this._bufferCache[url].bufferPromise;
            }
        }

        // Otherwise, create a cache item for this url
        let cacheItem = this.createCacheItem(url);

        // Start the download and return
        cacheItem.startTask();
        this._bufferCache[url] = cacheItem;
        return this._bufferCache[url].bufferPromise;
    }

    createCacheItem(url) {
        // Create a new download task
        let downloadTask = new AxiosDownloadTask(url);

        // Create a new cache item with the download as its task
        let newCacheItem = new BufferCacheItem(url, downloadTask, 'download');

        // Add listeners for no more refs, or if an error occurs during download
        newCacheItem.once('nomorerefs', (taskUrl) => {
            if (this._bufferCache[taskUrl]) {
                if (this._bufferCache[taskUrl].state === 'loading') {
                    this._bufferCache[taskUrl].cancel();
                }
                delete this._bufferCache[taskUrl];
            }
        });
        newCacheItem.on('error', (error, taskUrl) => {
            if (this._bufferCache[taskUrl]) {
                delete this._bufferCache[taskUrl];
            }
        });

        return newCacheItem;
    }

    /**
     * If a download task for the given url is still downloading, then
     * cancel the task.
     *
     * @param {String} url
     * @memberof EncodedBufferCache
     */
    cancelDownloadTask(url) {
        if (this._bufferCache[url]) {
            this._bufferCache[url].cancel();
            delete this._bufferCache[url];
        }
    }

    /**
     * Get the status of a download task. Return value will either be:
     * - 'loaded' (in the cache already)
     * - 'loading' (currently downloading)
     * - 'unloaded' (no task exists for this url)
     *
     * @param {String} url
     * @returns 'loaded', 'loading', or 'failed'
     * @memberof EncodedBufferCache
     */
    getStatus(url) {
        if (this._bufferCache[url]) {
            return this._bufferCache[url].state;
        }
    }


    /**
     * This will remove the entire cache.
     *
     * @memberof EncodedBufferCache
     */
    purgeCache() {
        this._bufferCache = {};
    }


    /**
     * This will remove an encoded buffer from the cache if it exists, or
     * cancel the download if the url is currently downloading.
     *
     * @param {String} url
     * @memberof EncodedBufferCache
     */
    removeRef(url) {
        if (this._bufferCache[url]) {
            this._bufferCache[url].removeRef();
        }
    }
}
