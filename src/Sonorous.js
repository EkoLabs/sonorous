import AudioContextManager from './AudioContextManager/AudioContextManager';
import Sonor from './Sonor/Sonor';
import copySetterGetterFromInstance from './utils/copySetterGetterFromInstance';
import EventEmitter from 'eventemitter3';

class Sonorous {
    /**
     * Creates an instance of Sonorous.
     * @memberof Sonorous
     */
    constructor() {
        // Initialize the event emitter
        this._eventEmitter = new EventEmitter();
        this._loaded = false;
        this.reload();

        if (typeof window !== 'undefined' && window && typeof window.addEventListener === 'function') {
            window.addEventListener('unload', this.dispose.bind(this));
            window.addEventListener('pagehide', this.dispose.bind(this));
        }

        // Generate the public facing API
        this.exportPublicAPI();
        return this.exports;
    }

    static get instance() {
        if (!this._instance) {
            this._instance = new Sonorous();
        }
        return this._instance;
    }

    /**
     * A property that will adjust the volume for all Sonor objects.
     *
     * @name Sonorous#masterVolume
     * @type {Number}
     * @memberof Sonorous
     */
    get masterVolume() {
        return this._masterVolume;
    }

    set masterVolume(newMasterVolume) {
        if (typeof newMasterVolume !== 'number') {
            throw new TypeError('Invalid type given to volume setter - expected a number.');
        } else if (!this._loaded) {
            console.warn('Sonorous has not been loaded yet. Please load before setting the volume.'); // eslint-disable-line no-console
            return;
        } else if (newMasterVolume < this._masterGain.gain.minValue ||
            newMasterVolume > this._masterGain.gain.maxValue) {
            // eslint-disable-next-line no-console
            console.warn(`Value (${newMasterVolume}) is out of bounds. Clamping to range:
            [${this._masterGain.gain.minValue}, ${this._masterGain.gain.maxValue}]`);

            newMasterVolume = Math.min(this._masterGain.gain.maxValue,
                Math.max(this._masterGain.gain.maxValue, newMasterVolume));
        }
        this._masterVolume = newMasterVolume;
        this._eventEmitter.emit('mastervolumechanged', newMasterVolume);
        if (!this._masterMuted) {
            this._masterGain.gain.setValueAtTime(newMasterVolume, this._context.currentTime);
        }
    }

    /**
     * Mute all Sonor objects.
     *
     * @name Sonorous#muteAll
     * @type {Boolean}
     * @memberof Sonorous
     */
    get muteAll() {
        return this._masterMuted;
    }

    set muteAll(newMuteValue) {
        if (typeof newMuteValue !== 'boolean') {
            throw new TypeError('Invalid type given to muted setter - expected a boolean.');
        } else if (!this._loaded) {
            console.warn('Sonorous has not yet been loaded. Please load Sonorous before setting mute.'); // eslint-disable-line
            return;
        }
        this._masterMuted = newMuteValue;
        let volValue = newMuteValue ? 0.0 : this._masterVolume;
        this._eventEmitter.emit('mastervolumechanged', volValue);
        this._masterGain.gain.setValueAtTime(volValue, this._masterGain.context.currentTime);
    }

    /**
     * A read-only array of all Sonor objects added to this manager.
     *
     * @name Sonorous#sonors
     * @type {Sonor[]}
     * @readonly
     * @memberof Sonorous
     */
    get sonors() {
        return Object.keys(this._sonors).map((id) => {
            return this._sonors[id];
        });
    }

    get ctx() {
        return this._context;
    }

    /**
     * Creates and returns a Sonor object. The Sonor object will connect to the master gain node.
     *
     * @param {string|string[]|SonorSrc|SonorSrc[]} src - see the documentation of Sonor to learn more about SonorSrc.
     * @param {object} [options] - *Optional*. See the documentation of Sonor to learn more about the possible options.
     * @returns {Sonor}
     * @memberof Sonorous
     */
    addSonor(src, options) {
        if (!this._loaded) {
            console.warn('Sonorous has not been loaded yet. Please load before adding sonors.'); // eslint-disable-line no-console
            return;
        }

        let newSonor = new Sonor(src, this._masterGain, this._context, options);
        this._sonors[newSonor.id] = newSonor;
        return newSonor;
    }


    /**
     * Removes a sonor object from the manager. This will unload and destroy the sound, and immediately stop all processes
     * related to this sound. If an id is passed in that the manager does not recognize, nothing will happen.
     *
     * @param {string} id - The id of the Sonor object to remove
     * @memberof Sonorous
     */
    removeSonor(id) {
        if (this._sonors[id]) {
            let sonorToRemove = this._sonors[id];
            sonorToRemove.unload();
            delete this._sonors[id];
        } else {
            console.warn('The ID passed in to removeSonor is not recognized. Nothing will happen.'); // eslint-disable-line no-console
        }
    }

    /**
     * Returns the Sonor object associated with that ID. If no Sonor object with that ID is found, undefined will be returned.
     *
     * @param {string} id - the id of the sonor object to get
     * @returns {Sonor} - the sonor object associated with the passed in id
     * @memberof Sonorous
     */
    get(id) {
        return this._sonors[id];
    }

    has(id) {
        return this._sonors[id] !== undefined;
    }

    reload() {
        // Create/get the AudioContext
        this._contextManager = AudioContextManager.instance;
        if (this._contextManager.context.state === 'closed') {
            this._contextManager.createAudioContext();
        }
        this._context = this._contextManager.context;
        this._contextManager.on('audiounlocked', this.onAudioUnlocked.bind(this));

        // Initialize private variables
        this._sonors = {};

        // Initialize the masterGain node and connect it to the context's destination
        this._masterGain = this._context.createGain();
        this._masterGain.gain.setValueAtTime(1.0, this._context.currentTime);
        this._masterGain.connect(this._context.destination);
        this._masterVolume = 1.0;
        this._masterMuted = false;

        this._loaded = true;
    }

    unload() {
        Object.keys(this._sonors).forEach((id) => {
            this.removeSonor(id);
        });
        this._masterGain.disconnect();
        this._contextManager.closeCurrentContext();
        this._context = null;
        this._loaded = false;
    }

    /**
     * Event emitter function that will let a module register a callback for a specified event issued from
     * the Sonorous.
     *
     * @param {String} eventName
     * @param {function} callback
     * @memberof Sonorous
     */
    on(eventName, callback) {
        this._eventEmitter.on(eventName, callback);
    }

    /**
     * Event emitter function that will let a module remove a callback for a specified event issued from
     * the Sonorous.
     *
     * @param {String} eventName
     * @param {function} callback
     * @memberof Sonorous
     */
    off(eventName, callback) {
        this._eventEmitter.off(eventName, callback);
    }

    /**
     * Event emitter function that will let a module register a callback for a specified event
     * from the Sonorous. The callback will only be called once, while the event may
     * be emitted more than once.
     *
     * @param {String} eventName
     * @param {function} callback
     * @memberof Sonorous
     */
    once(eventName, callback) {
        this._eventEmitter.once(eventName, callback);
    }

    /**
     * Will return true if Sonorous is supported in your current web browser.
     * If web audio is supported and we are able to create an AudioContext,
     * Sonorous is supported.
     *
     * @returns
     * @memberof Sonorous
     */
    isSupported() {
        if (this._contextManager) {
            return this._contextManager.isSupported;
        }
        return AudioContextManager.instance.isSupported;
    }

    ///////////////////////////
    // PRIVATE FUNCTIONS
    //////////////////////////

    onAudioUnlocked() {
        this._eventEmitter.emit('audiounlocked');
    }

    exportPublicAPI() {
        this.exports = {
            isSupported: this.isSupported.bind(this),
            reload: this.reload.bind(this),
            unload: this.unload.bind(this),
            addSonor: this.addSonor.bind(this),
            removeSonor: this.removeSonor.bind(this),
            get: this.get.bind(this),
            has: this.has.bind(this),
            on: this.on.bind(this),
            once: this.once.bind(this),
            off: this.off.bind(this)
        };
        copySetterGetterFromInstance(this, this.exports, 'masterVolume');
        copySetterGetterFromInstance(this, this.exports, 'muteAll');
        copySetterGetterFromInstance(this, this.exports, 'sonors', true);
        copySetterGetterFromInstance(this, this.exports, 'ctx', true);
    }

    dispose() {
        this.unload();
        this._contextManager.dispose();
        if (typeof window !== 'undefined' && window && typeof window.removeEventListener === 'function') {
            window.removeEventListener('unload', this.dispose);
            window.removeEventListener('pagehide', this.dispose);
        }
    }
}

export default Sonorous.instance;
