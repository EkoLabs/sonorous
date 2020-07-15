import EventEmitter from 'eventemitter3';
import env from '../utils/environment';

/**
 * The AudioContextManager handles creating and unlocking the AudioContext.
 * This module exposes the AudioContext and will notify users when it is
 * unlocked. This module is also a singleton, so you will only have 1 AudioContext
 * shared throughout.
 *
 * @export
 * @class AudioContextManager
 */
let AudioContext = window.AudioContext || window.webkitAudioContext; // eslint-disable-line no-shadow
export default class AudioContextManager {
    /**
     * Creates an instance of AudioContextManager. Will add event listeners on the document
     * for user interaction (which will unlock the audio context). These event listeners will
     * be removed once user interaction has happened.
     *
     * @memberof AudioContextManager
     */
    constructor() {
        this._eventEmitter = new EventEmitter();
        this._iOSContextReInitAttempts = 0;
        this._maxIOSContextReInitAttempts = 5;
        this.createAudioContext();
        document.addEventListener('visibilitychange', this.onDocumentVisibilityChange.bind(this));

        // If we were able to successfully create an AudioContext, then proceed with attempting to unlock it
        if (this._context) {
            this._isUnlocked = false;

            // Add listeners for unlocking web audio playback
            document.addEventListener('touchend', this.unlockAudioContext.bind(this), true);
            document.addEventListener('click', this.unlockAudioContext.bind(this), true);
            document.addEventListener('keydown', this.unlockAudioContext.bind(this), true);

            // Let's try unlocking without user gesture
            this.unlockAudioContext();
        }
    }

    static get instance() {
        if (!this._instance) {
            this._instance = new AudioContextManager();
        }
        return this._instance;
    }

    onDocumentVisibilityChange() {
        if (document.visibilityState !== 'visible') {
            return;
        }

        // This is necessary to fix a zombie audiocontext on iOS13
        if (this._context &&
            typeof this._context.resume === 'function' &&
            typeof this._context.suspend === 'function' &&
            this._context.state === 'running') {
            let currentTime = this._context.currentTime;
            setTimeout(() => {
                if (currentTime === this._context.currentTime) {
                    console.warn('Detected zombie AudioContext, explicitly suspending and resuming.'); // eslint-disable-line no-console
                    this._context.suspend()
                        .then(() => this._context.resume());
                }
            }, 0);
        }
    }

    /**
     * Will close the existing context if one exists, and will create a new context.
     * If WebAudio is not supported, then this will throw an error and return
     *
     * @returns A promise if the AudioContext was successfully created, nothing otherwise
     * @memberof AudioContextManager
     */
    createAudioContext() {
        // Close current _context if exists
        if (this._context && this._context.state !== 'closed') {
            this._context.close();
        }

        // Create audio _context
        this._isSupported = true;
        this._context = new AudioContext();
        if (!this._context) {
            // Ios has a weird issue where sometimes you initialize the context and its null. Attempt to reinit here.
            if (env.os === 'ios') { // eslint-disable-line no-magic-numbers
                if (this._iOSContextReInitAttempts < this._maxIOSContextReInitAttempts) {
                    // eslint-disable-next-line max-len
                    console.warn('[createAudioContext] Re-initializing audio context instance, identified null audio context'); // eslint-disable-line no-console
                    this._iOSContextReInitAttempts++;
                    this.createAudioContext();
                    return;
                }

                // eslint-disable-next-line max-len
                console.warn('[createAudioContext] Exhausted maximum iOS re-init attempts.'); // eslint-disable-line no-console
            } else {
                this._isSupported = false;
                console.error('[initAudioContext] Current browser does not support the WebAudio API.');
                return;
            }
        }

        // For FF, we call resume() first and then suspend() (FF does not seem to suspend() immediately after AudioContext creation).
        let retVal;
        if (env.browser === 'firefox') {
            retVal = this._context.resume()
                .then(this._context.suspend.bind(this._context));
        } else {
            retVal = this._context.suspend();
        }
        return retVal;
    }

    closeCurrentContext() {
        if (this._context && this._context.state !== 'closed' && typeof this._context.close === 'function') {
            try {
                let retVal = this._context.close();
                if (retVal && typeof retVal.then === 'function') {
                    retVal
                        .then(() => {
                            console.log('Context successfully closed'); // eslint-disable-line no-console
                        })
                        .catch((e) => {
                            console.warn(`Async error closing context: ${e}`); // eslint-disable-line no-console
                        });
                }
            } catch (e) {
                console.warn(`Error closing context: ${e}`); // eslint-disable-line no-console
            }
        }
    }

    /**
     * Represents if WebAudio is supported. If we are unable to create an AudioContext, then
     * this will be false, and this library will be unusable.
     *
     * @readonly
     * @memberof AudioContextManager
     */
    get isSupported() {
        return this._isSupported;
    }

    /**
     * Represents if the audio context has been unlocked yet. In most cases, the audio context
     * will only be unlocked once there is a user interaction on the page
     *
     * @readonly
     * @memberof AudioContextManager
     */
    get isUnlocked() {
        return this._isUnlocked;
    }


    /**
     * Returns the audiocontext. Connecting nodes to the context's destination will allow you
     * to hear what's being played
     *
     * @readonly
     * @memberof AudioContextManager
     */
    get context() {
        return this._context;
    }


    /**
     * This will attempt to unlock the audio context by playing a buffer of silence. If the
     * context has already been unlocked, this will do nothing and simply return.
     *
     * @returns
     * @memberof AudioContextManager
     */
    unlockAudioContext() {
        // Do nothing if we're already unlocked
        if (this.isUnlocked) {
            return;
        }

        // Create an empty buffer.
        let buffer = this._context.createBuffer(1, 1, 22050); // eslint-disable-line no-magic-numbers
        let source = this._context.createBufferSource();
        source.buffer = buffer;
        source.connect(this._context.destination);

        // Play the empty buffer
        source.start(0);

        console.log('[unlockAudioContext] Starting test to see if unlock was successful'); // eslint-disable-line no-console

        // Calling resume() on a stack initiated by user gesture is what actually unlocks the audio on Android Chrome >= 55.
        this._context.resume()
            .then(function() {
                // Do nothing if we're already unlocked
                if (this.isUnlocked) {
                    return;
                }

                console.log('[unlockAudioContext] Resolving unlockedDefer - unlock test was successful'); // eslint-disable-line no-console
                console.log('[ctor] Removing document listeners'); // eslint-disable-line no-console
                document.removeEventListener('touchend', this.unlockAudioContext, true);
                document.removeEventListener('click', this.unlockAudioContext, true);
                document.removeEventListener('keydown', this.unlockAudioContext, true);
                this._isUnlocked = true;
                this._eventEmitter.emit('audiounlocked');
            }.bind(this));
    }

    /**
     * Event emitter function that will let a module register a callback for a specified event issued from
     * the AudioContextManager.
     *
     * @param {String} eventName
     * @param {function} callback
     * @memberof AudioContextManager
     */
    on(eventName, callback) {
        this._eventEmitter.on(eventName, callback);
    }

    /**
     * Event emitter function that will let a module remove a callback for a specified event issued from
     * the AudioContextManager.
     *
     * @param {String} eventName
     * @param {function} callback
     * @memberof AudioContextManager
     */
    off(eventName, callback) {
        this._eventEmitter.off(eventName, callback);
    }

    /**
     * Event emitter function that will let a module register a callback for a specified event
     * from the AudioContextManager. The callback will only be called once, while the event may
     * be emitted more than once.
     *
     * @param {String} eventName
     * @param {function} callback
     * @memberof AudioContextManager
     */
    once(eventName, callback) {
        this._eventEmitter.once(eventName, callback);
    }

    dispose() {
        window.removeEventListener('visibilitychange', this.onDocumentVisibilityChange);
        this._eventEmitter = null;
        if (this._context.state !== 'closed') {
            this.closeCurrentContext();
            this._context = null;
        }
    }
}
