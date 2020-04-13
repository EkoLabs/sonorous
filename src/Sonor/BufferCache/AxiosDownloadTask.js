import * as axiosRetry from 'axios-retry';
import axios from 'axios';
const CancelToken = axios.CancelToken;

/**
 * A wrapper over an XMLHttpRequest that returns a promise
 *
 * @export
 * @class AxiosDownloadTask
 */
export default class AxiosDownloadTask {
    constructor(url) {
        axiosRetry(axios, { retries: 3 });
        this._url = url;
        this._source = CancelToken.source();
        this._downloadPromise = null;
    }

    /**
     * Public read-only property to get the url that will be downloaded
     *
     * @readonly
     * @memberof AxiosDownloadTask
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
     * @memberof AxiosDownloadTask
     */
    get bufferPromise() {
        return this._downloadPromise;
    }

    /**
     * Sends an XHR request and returns a promise. When resolved, the promise
     * will pass in the encoded buffer. If it fails, it will pass the error
     * message through to the rejection.
     * @returns
     * @memberof AxiosDownloadTask
     */
    start() {
        let options = {
            cancelToken: this._source.token,
            responseType: 'arraybuffer'
        };
        this._downloadPromise = axios.get(this._url, options)
            .then((response) => {
                this._downloadPromise = null;
                return response.data;
            })
            .catch((error) => {
                if (axios.isCancel(error)) {
                    let e = new Error('Request Cancelled');
                    e.code = 99;
                    throw e;
                } else {
                    throw new Error(error.message);
                }
            });
    }

    /**
     * Will abort the xhr request if one exists.
     *
     * @memberof AxiosDownloadTask
     */
    cancel() {
        this._source.cancel();
    }
}
