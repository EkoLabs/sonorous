import EncodedBufferCache from './EncodedBufferCache';

/**
 * A wrapper over an XMLHttpRequest that returns a promise
 *
 * @export
 * @class DecodeBufferTask
 */
export default class DecodeBufferTask {
    constructor(url, audioContext) {
        this._bufferPromise = null;
        this._url = url;
        this._audioContext = audioContext;
        this._encodedBufCache = EncodedBufferCache.instance;
    }

    /**
     * Public read-only property to get the url that will be downloaded
     *
     * @readonly
     * @memberof DecodeBufferTask
     */
    get url() {
        return this._url;
    }


    /**
     * Public, read-only property to get the promise associated with this task.
     * If we have not started the download, or if we have completed the download,
     * this will be null.
     *
     * @readonly
     * @memberof DecodeBufferTask
     */
    get bufferPromise() {
        return this._bufferPromise;
    }

    /**
     * Sends an XHR request and returns a promise. When resolved, the promise
     * will pass in the encoded buffer. If it fails, it will pass the error
     * message through to the rejection.
     * @returns
     * @memberof DecodeBufferTask
     */
    start() {
        this._bufferPromise = this._encodedBufCache.getEncodedBuffer(this._url).then((encodedBuffer) => {
            if (encodedBuffer) {
                return this.decodeAudioData(encodedBuffer, this._url, this._audioContext);
            }
        });
    }

    /**
     * Will return a promise that should resolve with the decoded buffer. This will also
     * handle saving to cache if indicated, and storing ref counts.
     *
     * @param {*} buffer - the **encoded** buffer returned from the download manager
     * @param {String} url - the url associated with the buffer. Used to update the caches.
     * @param {AudioContext} audioContext - WebAudio audio context
     * @returns {Promise} A promise that should resolve with the decoded buffer.
     * @memberof DecodedBufferCache
     */
    decodeAudioData(buffer, url, audioContext) {
        // Bail out if we don't have the audioContext. Can't decode without it.
        if (!audioContext) {
            let errMsg = 'Missing AudioContext - cannot decode the audio buffer';
            return Promise.reject(new Error(errMsg));
        }

        // Return a promise that resolves with the decoded buffer
        return new Promise((resolve, reject) => {
            // Define the success function
            let decodeSuccess = function(decodedBuffer) {
                resolve(decodedBuffer);
            };

            // Define the failure function
            let decodeFail = function(error) {
                // Report the error and reject
                let errMsg = `Decoding the audio data failed. ${error}`;
                reject(new Error(errMsg));
            };

            // Actually make the call to decode the audio data
            let promiseRetVal = audioContext.decodeAudioData(buffer, decodeSuccess, decodeFail);

            // If the decodeAudioData call does return a promise, use a then block.
            if (promiseRetVal && typeof promiseRetVal.then === 'function') {
                promiseRetVal.then(decodeSuccess, decodeFail);
            }
        });
    }

    /**
     * Will abort the xhr request if one exists.
     *
     * @memberof AxiosDownloadTask
     */
    cancel() {
        this._encodedBufCache.cancelDownloadTask(this._url);
    }
}
