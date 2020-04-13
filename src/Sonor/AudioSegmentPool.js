import AudioSegment from './AudioSegment';
import copySetterGetterFromInstance from '../utils/copySetterGetterFromInstance';

function generateRandomString() {
    return Math.random().toString(36); // eslint-disable-line no-magic-numbers
}

/**
 * AudioSegmentPool creates a fixed number of AudioSegments. Other classes are able to access AudioSegments from this pool
 * and use them accordingly. Once the class is done, it should return the AudioSegment to the pool. It is not possible to
 * return more segments than the maximum capacity of the pool. (i.e. if the pool size is 5, you cannot return 6 segments to the pool)
 *
 * @export
 * @class AudioSegmentPool
 */
class AudioSegmentPool {
    /**
     * Creates an instance of AudioSegmentPool.
     * @param {AudioContext} context - Required. The AudioContext to connect the audiosegments to.
     * @param {*} destNode - Required. The destination node to connect the audiosegments to.
     * @param {number} [maxSize = 1] - Optional. The maxmimum capacity of the pool, must be a positive integer greater than 0. Defaults to 1.
     * @memberof AudioSegmentPool
     */
    constructor(context, destNode, maxSize) {
        if (!context) {
            throw new Error(`Can't construct AudioSegmentPool - missing "context" value`);
        }

        if (!destNode) {
            throw new Error(`Can't construct AudioSegmentPool - missing "destNode" value`);
        }

        if (maxSize) {
            if (typeof maxSize !== 'number') {
                throw new TypeError(`Expected maxSize to be a number. Received ${typeof maxSize}`);
            }
            if (maxSize <= 0) {
                throw new TypeError(`Expected maxSize to be a number greater than 0. Received ${maxSize}`);
            }
        }

        // Store the max size of the pool
        this._maxSize = maxSize || 1;
        this._context = context;
        this._destNode = destNode;

        // Create the list of AudioSegments
        this._availableSegments = [];
        this._inUseSegments = [];

        for (var i = 0; i < this._maxSize; i++) {
            let audioSegment = new AudioSegment(context, destNode, generateRandomString());
            audioSegment.unload(); // Keep each audio segment unloaded to start
            this._availableSegments.push(audioSegment);
        }

        // Generate our public functionality object (this.exports)
        this.exportPublicAPI();

        return this.exports;
    }

    ///////////////////////
    // PROPERTIES
    ///////////////////////

    /**
     * The maximum size of the pool.
     * @name AudioSegmentPool#maxSize
     * @type Number
     * @readonly
     * @memberof AudioSegmentPool
     */
    get maxSize() {
        return this._maxSize;
    }

    /**
     * Set maximum size of pool. If this is set after construction it follows these rules:
     * - If the pool size is INCREASING: more audio segments will be created and added to the pool
     * - If the pool size is DECREASING: unused audio segments will be removed until the total number of segments equals the new max size.
     * If there are no unused audio segments to remove (or not enough to satisfy the new size), you will not be able to retrieve new segments
     * until the currently used segments are returned to the pool.
     *
     * @memberof AudioSegmentPool
     */
    set maxSize(newSize) {
        if (typeof newSize !== 'number') {
            throw new TypeError(`Expected maxSize to be a number. Received ${typeof newSize} `);
        }
        let delta = newSize - this._maxSize;
        let cappedDelta = delta < 0 ? Math.max(delta, -1 * this._availableSegments.length) : delta;
        for (var i = 0; i < Math.abs(cappedDelta); i++) {
            if (delta < 0) {
                this._availableSegments.shift();
            }
            if (delta > 0) {
                let audioSegment = new AudioSegment(this._context, this._destNode, generateRandomString());
                audioSegment.unload(); // Keep each audio segment unloaded to start
                this._availableSegments.push(audioSegment);
            }
        }
        this._maxSize = newSize;
    }

    get availableSegmentCount() {
        return this._availableSegments.length;
    }

    ///////////////////////
    // PUBLIC FUNCTIONALITY
    ///////////////////////

    /**
     * Returns true/false based on if there are available segments within the pool.
     *
     * @returns true if there are more inactive segments within the pool, false otherwise
     * @memberof AudioSegmentPool
     */
    canRetrieve() {
        return this._availableSegments.length > 0;
    }

    /**
     * Returns an AudioSegment (and removes it from the pool) if there is one available.
     *
     * @returns AudioSegment if it can, undefined otherwise
     * @memberof AudioSegmentPool
     */
    retrieve() {
        if (this.canRetrieve()) {
            let audioSegment = this._availableSegments.shift();
            audioSegment.load();
            this._inUseSegments.push(audioSegment);
            return audioSegment;
        }
        console.warn('All segments are currently being used. Returning undefined.'); // eslint-disable-line no-console
        return undefined;
    }

    /**
     * Adds a segment back to the pool. If the pool has already hit max capacity, then this will do nothing.
     *
     * @param {AudioSegment} audioSegment
     * @memberof AudioSegmentPool
     */
    returnSegment(audioSegment) {
        let index = this._inUseSegments.indexOf(audioSegment);
        if (index >= 0) {
            this._inUseSegments.splice(index, 1);
            audioSegment.unload();
            if (this._availableSegments.length < this._maxSize) {
                this._availableSegments.push(audioSegment);
            } else {
                console.warn('Unable to add audio segment to pool. Reached max capacity.'); // eslint-disable-line no-console
            }
        } else {
            console.warn('Unable to add audio segment to pool. Segment was not found in pool to begin with.'); // eslint-disable-line no-console
        }
    }

    ///////////////////////
    // PRIVATE FUNCTIONALITY
    ///////////////////////

    /**
     * Private function. Will generate the exports object, which includes all the functions external users
     * can call, and will copy all public properties from the instance to this object.
     *
     * @memberof AudioSegmentPool
     */
    exportPublicAPI() {
        this.exports = {
            retrieve: this.retrieve.bind(this),
            canRetrieve: this.canRetrieve.bind(this),
            returnSegment: this.returnSegment.bind(this)
        };
        copySetterGetterFromInstance(this, this.exports, 'maxSize');
        copySetterGetterFromInstance(this, this.exports, 'availableSegmentCount', true);
    }
}

export default AudioSegmentPool;
