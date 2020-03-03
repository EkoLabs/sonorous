import EncodedBufferCache from './EncodedBufferCache';
import BufferCacheItem from './BufferCacheItem';
import DecodeBufferTask from './DecodeBufferTask';

/**
 * This is the main interface between downloading/decoding a buffer and returning it to the Sonor class.
 * The Sonor object will request the buffer from the DecodedBufferCache (a singleton). If this class
 * does not have the decoded buffer cached, it will ask the EncodedBufferCache for the encoded buffer.
 * If the EncodedBufferCache does not have the encoded buffer cached, then it will attempt to download it.
 * Once the DecodedBufferCache has the encoded buffer, it will attempt to decode it, and cache it.
 *
 * The Sonor obj can determine whether or not the decoded buffer will be cached or not. **If the decoded
 * buffer is not cached, the encoded buffer will be.** Both caches are ref counted, and the buffers will
 * be removed from cache when it hits 0 refs. Not caching the buffer will use less memory, but there may
 * be a delay when attempting to play.
 *
 * It is the Sonor's responsibility to call removeRef() when it no longer intends to use the buffer.
 *
 * @export
 * @class DecodedBufferCache
 */
export default class DecodedBufferCache {
    /**
     * Creates an instance of DecodedBufferCache. This class is a singleton.
     *
     * @memberof DecodedBufferCache
     */
    constructor() {
        this._bufferCache = {};
        this._decodedBufferCache = {};
        this._currentlyDecoding = {};
        this._encodedBufCache = EncodedBufferCache.instance;
    }

    /**
     * Retrieves the instance of the decodedbuffercache.
     *
     * @readonly
     * @static
     * @memberof DecodedBufferCache
     */
    static get instance() {
        if (!this._instance) {
            this._instance = new DecodedBufferCache();
        }
        return this._instance;
    }

    /**
     * Responsible for decoding an encoded buffer, caching it (if desired), and
     * returning a promise that will resolve to the decoded buffer. This also
     * handles incrementing ref counts, so we can properly dispose of it in the
     * future.
     *
     * @param {String} url - _Required._ The URL of the audio file that should be decoded
     * @param {Object} audioContext - _Required._ The WebAudio AudioContext that will decode the buffer. This is necessary if we happen to not have the decoded buffer in the cache.
     * @param {Boolean} [saveToCache = False] - _Optional._ If true, it will save the decoded buffer to the cache.
     * @returns {Promise} A promise that will resolve with the decoded buffer
     * @memberof DecodedBufferCache
     */
    getDecodedBuffer(url, audioContext, saveToCache) {
        // Check validity of params
        if (!url) {
            return Promise.reject(new Error('Missing required url'));
        }
        if (!audioContext) {
            return Promise.reject(new Error('Missing required audio context'));
        }
        if (typeof url !== 'string') {
            return Promise.reject(new TypeError('url must be a string'));
        }
        if (saveToCache) {
            if (typeof saveToCache !== 'boolean') {
                return Promise.reject(new TypeError('saveToCache must be a boolean'));
            }
        }

        // Check if a cache item already exists for this url
        if (this._bufferCache[url]) {
            // If it exists and hasn't errored out, return the buffer
            if (this._bufferCache[url].status !== 'failed') {
                this._bufferCache[url].addRef();

                // If the buffer is still downloading/being decoded, then this will return a promise that will resolve with the decoded buffer
                return this._bufferCache[url].bufferPromise;
            }
        }

        // It's not in our cache, which means we don't have the decoded buffer and we're not in the process of downloading/decoding it.
        // Create a new cache item with a task for this url.
        let cacheItem = this.createCacheItem(url, audioContext);

        // The cache item will handle getting the encoded buffer from the download manager, decoding and returning it.
        cacheItem.startTask();

        // Add the cache item to the cache (it will have a ref count of 1)
        this._bufferCache[url] = cacheItem;

        // Return the promise from the cache item
        return cacheItem.bufferPromise.then((decodedBuffer) => {
            if (saveToCache) { // If we're saving the decoded buffer to cache, remove the encoded buffer
                this._encodedBufCache.removeRef(url);
            } else { // If we're not saving the decoded buffer to cache, remove from the decoded buffer cache
                delete this._bufferCache[url];
            }
            return decodedBuffer;
        });
    }

    /**
     * Creates an instance of BufferCacheItem, assigns its task, and sets up listeners on it.
     *
     * @param {string} url
     * @param {AudioContext} audioContext
     * @returns {BufferCacheItem}
     * @memberof DecodedBufferCache
     */
    createCacheItem(url, audioContext) {
        // Create a task to decode a buffer. This will handle retrieving the buffer from the download manager and decoding it.
        let currTask = new DecodeBufferTask(url, audioContext);

        // Create a buffer cache item and set its task to the one created above.
        let newCacheItem = new BufferCacheItem(url, currTask, 'decode');

        // Add listeners for when the ref count goes down to 0, and for errors
        newCacheItem.once('nomorerefs', (taskUrl) => {
            if (this._bufferCache[taskUrl]) {
                this._bufferCache[taskUrl].cancel();
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
     * Remove a reference to a decoded buffer. If the ref count hits 0,
     * remove the decoded buffer from the cache entirely.
     *
     * @param {String} url - the url associated to the decoded buffer
     * @memberof DecodedBufferCache
     */
    removeRef(url) {
        // If we do have the decoded buffer, remove a ref
        if (this._bufferCache[url]) {
            this._bufferCache[url].removeRef();
        } else { // Otherwise, remove a ref from the download manager
            this._encodedBufCache.removeRef(url);
        }
    }

    /**
     * This will completely erase both the currently decoding cache and the decoded buffer cache.
     *
     * @memberof DecodedBufferCache
     */
    purgeCache() {
        this._bufferCache = {};
    }
}
