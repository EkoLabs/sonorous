/**
 * A mock of a download task that will mimic the actions of a real XHR request.
 */
export default class AxiosDownloadTask {
    constructor(url) {
        this._url = url;
        this._downloadPromise = null;
        this._cancelled = false;
    }

    get url() {
        return this._url;
    }

    get bufferPromise() {
        return this._downloadPromise;
    }

    start() {
        this._cancelled = false;
        this._downloadPromise = new Promise((resolve, reject) => { // eslint-disable-line no-unused-vars
            process.nextTick(() => {
                if (this._cancelled) {
                    let e = new Error('Request Cancelled');
                    e.code = 99;
                    reject(e);
                } else {
                    let testBuf = new window.AudioContext().createBuffer(1, 10, 22050); // eslint-disable-line no-magic-numbers
                    resolve(testBuf);
                }
            });
        });
        return this._downloadPromise;
    }

    cancel() {
        this._cancelled = true;
    }
}
