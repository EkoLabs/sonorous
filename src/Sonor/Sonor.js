import AudioSegment from './AudioSegment'; // eslint-disable-line
import AudioSegmentPool from './AudioSegmentPool';
import copySetterGetterFromInstance from '../utils/copySetterGetterFromInstance';
import DecodedBufferCache from './BufferCache/DecodedBufferCache';
import validateSourcesHelper from '../utils/validateSourcesHelper';
import EventEmitter from 'eventemitter3';
const defaultPoolSize = 1;

/**
 * This module contains most of the functionality for controlling sounds.
 * Note that this module will only use WebAudio. If WebAudio is not supported,
 * you will not be able to use this library.
 *
 * @export
 * @class Sonor
 */
class Sonor {
    /**
     * @typedef {Object} SonorSrc
     * @property {string} url - Required. The src url of the sound.
     * @property {string} format - Required. The format of the audio file
     */

    /**
     * @typedef {Object} Sprite
     * key : {offset: Number, duration: Number, isLooping: boolean}
     */

    /**
     * Creates an instance of Sonor.
     * @param {string|string[]|SonorSrc|SonorSrc[]} src - Required. The src URL(s) of the sound.
     * @param {WebAudioNode} destNode - Required. The node to connect the gain node to.
     * @param {AudioContext} audioContext - Required. The AudioContext is needed to create audio nodes, etc.
     * @param {object} [options] - An object used to configure Sonor.
     * @param {string} [options.id] - Optional. A unique ID will be created for this object if you do not pass one in.
     * @param {boolean} [options.preload = True] - Optional. Defaults to true and will automatically attempt to load the sound src URL. If false, then it's up to the calling code to load the sound.
     * @param {Number} [options.volume = 1.0] - Optional. Defaults to 1.0 and will set the initial volume of the sound.
     * @param {boolean} [options.loop = False] - Optional. Defaults to false and will determine if the audio should loop forever or not.
     * @param {boolean} [options.autoplay = False] - Optional. Defaults to false. Will determine if the audio should try to play as soon as its loaded.
     * @param {boolean} [options.muted = False] - Optional. Defaults to false. Will determine if the audio should be muted on load or not.
     * @param {Sprite} [options.sprite] - Optional. Not implemented yet. This is an object that should define sections of audio that will play at different times.
     * @param {Number} [options.poolSize = 1] - Optional. Defaults to 1, and will set the size of the pool for this sonor. Increase the size of the pool if you would like to start playing the same sound multiple times, before the first playthrough is finished.
     * @param {string} [options.optimizeFor = 'time'] - Optional. Can either be 'time' or 'memory'. This determines if the decoded buffer will be cached or not. By default, it will be. If memory is a concern, then set this to 'memory' and expect a small delay while we decode the buffer before playback can begin.
     * @memberof Sonor
     */
    constructor(src, destNode, audioContext, options) {
        if (!src) {
            throw new Error(`Can't construct Sonor - missing "src" value`);
        }
        if (!destNode) {
            throw new Error(`Can't construct Sonor - missing destination node`);
        }
        if (!audioContext) {
            throw new Error(`Can't construct Sonor - missing audio context`);
        }

        this._eventEmitter = new EventEmitter();

        // Determine the first, valid URL. This will be what we download and use to play.
        this._url = validateSourcesHelper.chooseValidURL(validateSourcesHelper.normalizeSrc(src));
        if (!this._url) {
            throw new Error(`Can't construct Sonor - invalid src value ${src}`);
        }

        // Create a download manager
        this._decodedBufferCache = DecodedBufferCache.instance;

        // Initialize private properties
        this._context = audioContext;
        this.initializeOptions(options, destNode);
        this._playQueued = false;

        if (this._preload) {
            this._activeSegments.push(this._segmentPool.retrieve());
            this.load();
        }
        if (this._autoplay) {
            this.play();
        }

        this.exportPublicAPI();
        return this.exports;
    }

    /////////////////////////
    // PROPERTIES
    ////////////////////////

    /**
     * Controls the volume of the sound
     * @name Sonor#volume
     * @type Number
     * @default 1.0
     * @memberof Sonor
     */
    get volume() {
        return this._volume;
    }

    set volume(newVolumeValue) {
        this._volume = newVolumeValue;
        this._activeSegments.forEach((segment) => {
            segment.volume = newVolumeValue;
        });
    }

    /**
     * Controls the playback rate of the sound
     * @name Sonor#playbackRate
     * @type Number
     * @default 1.0
     * @memberof Sonor
     */
    get playbackRate() {
        return this._playbackRate;
    }

    set playbackRate(newPlaybackRateValue) {
        this._playbackRate = newPlaybackRateValue;
        this._activeSegments.forEach((segment) => {
            segment.playbackRate = newPlaybackRateValue;
        });
    }

    /**
     * Controls if the sound will loop indefinitely or not
     * @name Sonor#loop
     * @type Boolean
     * @default false
     * @memberof Sonor
     */
    get loop() {
        return this._loop;
    }

    set loop(newIsLooping) {
        if (newIsLooping === 1) {
            newIsLooping = true;
        } else if (newIsLooping === 0) {
            newIsLooping = false;
        }
        if (typeof newIsLooping !== 'boolean') {
            throw new TypeError('Invalid type given to loop setter - expected a boolean.');
        }
        this._loop = newIsLooping;
        this._activeSegments.forEach((segment) => {
            segment.loop = newIsLooping;
        });
    }

    /**
     * Controls if the sound is muted or not
     * @name Sonor#muted
     * @type Boolean
     * @default false
     * @memberof Sonor
     */
    get muted() {
        return this._muted;
    }

    set muted(newMutedValue) {
        this._muted = newMutedValue;
        this._activeSegments.forEach((segment) => {
            segment.muted = newMutedValue;
        });
    }


    /**
     * Pool size of the sonor. Increasing this will allow you to start playing the same sound multiple times, before the playthrough is finished.
     *
     * @memberof Sonor
     */
    get poolSize() {
        return this._segmentPool.maxSize;
    }

    set poolSize(newPoolSize) {
        this._segmentPool.maxSize = newPoolSize;
    }

    /**
     * Duration of the audio will only be available if the sonor is loaded, and a buffer has been created. Otherwise, will return 0.
     *
     * @readonly
     * @memberof Sonor
     */
    get duration() {
        if (this._activeSegments.length > 0) {
            return this._activeSegments[0].duration;
        }
        console.warn('No active segment, duration cannot be determined.'); // eslint-disable-line no-console
        return 0;
    }

    /**
     * The unique ID for this sound object
     * @name Sonor#id
     * @type String
     * @readonly
     * @memberof Sonor
     */
    get id() {
        return this._id;
    }

    /**
     * The chosen URL to download for this sound object
     * @name Sonor#url
     * @type String
     * @readonly
     * @memberof Sonor
     */
    get url() {
        return this._url;
    }


    /**
     * Returns true if a sound is currently playing, false otherwise
     * @name Sonor#isPlaying
     * @type boolean
     * @readonly
     * @memberof Sonor
     */
    get isPlaying() {
        let retVal = false;

        if (this._activeSegments.length > 0) {
            retVal = this._activeSegments
                .reduce((bool, segment) => {
                    return bool && segment.isPlaying;
                }, true);
        }
        return retVal;
    }

    get state() {
        return this._state;
    }

    get preload() {
        return this._preload;
    }

    get playbackPosition() {
        if (this._activeSegments.length > 0) {
            return this._activeSegments[0].getPlayheadPosition();
        }
        console.warn('No active segments currently'); // eslint-disable-line no-console
        return 0;
    }

    /////////////////////////
    // PUBLIC FUNCTIONS
    ////////////////////////

    /**
     * Tells the audio segment to begin playing. This will also set isPlaying to true.
     * If the pool of audio segments is greater than 1, the logic is as follows:
     *  If there are no active segments, one will be retrieved from the pool, and then played.
     *  If there are active segments, but none are currently playing, all currently active segments will be played. (i.e. if they were paused, then these sounds will resume playback, and nothing will be retrieved from the pool).
     *  If there are no available segments in the pool, then playing will do nothing and will report an error.
     *
     * @memberof Sonor
     */
    play() {
        if (this._activeSegments.length === 0 || this.isPlaying || this._playQueued) { // If every currently active audio segment is playing, then try to grab one from the pool or if there are no currently active segments, then grab one from the pool
            if (this._segmentPool.canRetrieve()) {
                let poolSegment = this._segmentPool.retrieve();
                if (poolSegment) {
                    this._playQueued = true;
                    this.loadSegment(poolSegment).then(() => {
                        this._activeSegments.push(poolSegment);
                        poolSegment.play();
                        this._playQueued = false;
                    });
                }
            } else {
                this.trigger('error', 'No sounds in the pool available. Please pause/stop or wait until it has ended, or increase the pool size.'); // eslint-disable-line max-len
            }
        } else { // Otherwise, call play on every active audio segment
            this._activeSegments.forEach((segment) => {
                this._playQueued = true;
                this.loadSegment(segment).then(() => {
                    if (this._state !== 'unloaded') {
                        segment.play();
                        this._playQueued = false;
                    }
                });
            });
        }
    }


    /**
     * Tells all active audio segments to pause. This will also set isPlaying to false.
     *
     * @memberof Sonor
     */
    pause() {
        if (this._playQueued) {
            this.once('play', () => {
                this._activeSegments.forEach((segment) => {
                    segment.pause();
                });
            });
        } else {
            this._activeSegments.forEach((segment) => {
                segment.pause();
            });
        }
    }

    /**
     * Tells all active audio segments to stop. This will also set isPlaying to false.
     *
     * @memberof Sonor
     */
    stop() {
        if (this._playQueued) {
            this.once('play', () => {
                this._activeSegments.forEach((segment) => {
                    segment.once('stop', () => {
                        let index = this._activeSegments.indexOf(segment);
                        if (index >= 0) {
                            this._activeSegments.splice(index, 1);
                        }
                        this._segmentPool.returnSegment(segment);
                    });
                    segment.stop();
                });
                this._activeSegments = [];
            });
        } else {
            this._activeSegments.forEach((segment) => {
                segment.stop();
                this._segmentPool.returnSegment(segment);
            });
            this._activeSegments = [];
        }
    }

    /**
     * Seeks to a new position in all active audio segments. If called after playback has already started,
     * it will automatically move to the new point in the audio. If called before playback,
     * playback will start at that point. If the sonor is looping and the position passed in is greater than the
     * sonor's duration, the position will be looped to fit within the sonor duration.
     *
     * @param {Number} newSeekPosition
     * @memberof Sonor
     * @example
     * console.log(sonor.duration); // 10
     * sonor.loop = true;
     * sonor.seek(35);
     * console.log(sonor.playbackPosition); // 5
     */
    seek(newSeekPosition) {
        this._activeSegments.forEach((segment) => {
            segment.seek(newSeekPosition);
        });
    }

    /**
     * Fades from one volume to another volume over a specified duration. There is an optional
     * startTime parameter, which can be used to schedule a fade. startTime is relative to the
     * beginning of the audio, not to the context time. If the startTime passed in is before
     * our current position in the audio, then we will linearly interpolate to figure out
     * what volume the audio should be at at the current time, and start the fade immediately.
     * This is applied to all active audio segments.
     *
     * @param {Number} stopVolume
     * @param {Number} fadeDuration - the fade duration in seconds
     * @param {Number} startTime
     * @memberof Sonor
     */
    fade(stopVolume, fadeDuration, startTime) {
        this._activeSegments.forEach((segment) => {
            segment.fade(stopVolume, fadeDuration, startTime);
        });
    }

    /**
     * Event emitter function that will let a module register a callback for a specified event issued from
     * the Sonor.
     *
     * @param {String} eventName
     * @param {function} callback
     * @memberof Sonor
     */
    on(eventName, callback) {
        this._eventEmitter.on(eventName, callback);
    }

    /**
     * Event emitter function that will let a module remove a callback for a specified event issued from
     * the Sonor.
     *
     * @param {String} eventName
     * @param {function} callback
     * @memberof Sonor
     */
    off(eventName, callback) {
        this._eventEmitter.off(eventName, callback);
    }

    /**
     * Event emitter function that will let a module register a callback for a specified event
     * from the Sonor. The callback will only be called once, while the event may
     * be emitted more than once.
     *
     * @param {String} eventName
     * @param {function} callback
     * @memberof Sonor
     */
    once(eventName, callback) {
        this._eventEmitter.once(eventName, callback);
    }

    /////////////////////////
    // PRIVATE FUNCTIONS
    ////////////////////////

    /**
     * Private function. Will set up listeners for the audio segment events
     * and will forward them
     *
     * @memberof Sonor
     */
    setUpAudioSegmentListeners(segment) {
        segment.on('play', this.onPlay.bind(this));
        segment.on('error', this.onError.bind(this));
        segment.on('pause', this.onPause.bind(this));
        segment.on('ended', this.onEnded.bind(this));
        segment.on('stop', this.onStop.bind(this));
        segment.on('volumechanged', this.onVolumeChanged.bind(this));
        segment.on('seeked', this.onSeekedTo.bind(this));
        segment.on('fadefinished', this.onFadeFinished.bind(this));
        segment.on('playbackratechanged', this.onPlaybackRateChanged.bind(this));
    }

    /**
     * Private function. Will remove listeners for the audio segment events
     *
     * @memberof Sonor
     */
    removeAudioSegmentListeners(segment) {
        segment.off('play', this.onPlay.bind(this));
        segment.off('error', this.onError.bind(this));
        segment.off('pause', this.onPause.bind(this));
        segment.off('ended', this.onEnded.bind(this));
        segment.off('stop', this.onStop.bind(this));
        segment.off('volumechanged', this.onVolumeChanged.bind(this));
        segment.off('seeked', this.onSeekedTo.bind(this));
        segment.off('fadefinished', this.onFadeFinished.bind(this));
        segment.off('playbackratechanged', this.onPlaybackRateChanged.bind(this));
    }

    /**
     * Private function. Will emit an event and pass the sonor instance
     * as one of the arguments, along with any other args specified.
     *
     * @param {*} eventName
     * @param {*} args
     * @memberof Sonor
     */
    trigger(eventName, ...args) {
        this._eventEmitter.emit(eventName, this.exports, ...args);
    }

    /**
     * Private functions. The following functions all listen to AudioSegment events
     * and forward them on.
     *
     * @memberof Sonor
     */
    onPlay() {
        this.trigger('play');
    }

    onError(segment, error) {
        this.trigger('error', error);
    }

    onPause() {
        this.trigger('pause');
    }

    onStop() {
        this.trigger('stop');
    }

    onEnded(segment) {
        // This segment is now inactive - return to the pool
        let foundSegmentIndex = this._activeSegments.indexOf(segment);
        if (foundSegmentIndex >= 0) {
            let removedSegments = this._activeSegments.splice(foundSegmentIndex, 1);
            removedSegments.forEach((seg) => {
                this._segmentPool.returnSegment(seg);
            });
        }
        this.trigger('ended');
    }

    onVolumeChanged(segment, newVolumeValue) {
        this._volume = newVolumeValue;
        this.trigger('volumechanged', newVolumeValue);
    }

    onSeekedTo(segment, newSeekPosition) {
        this.trigger('seeked', newSeekPosition);
    }

    onFadeFinished() {
        this.trigger('fadefinished');
    }

    onPlaybackRateChanged(segment, newPlaybackRateValue) {
        this.trigger('playbackratechanged', newPlaybackRateValue);
    }

    /**
     * Private function. Will generate the exports object, which includes all the functions external users
     * can call, and will copy all public properties from the instance to this object.
     *
     * @memberof Sonor
     */
    exportPublicAPI() {
        this.exports = {
            play: this.play.bind(this),
            pause: this.pause.bind(this),
            stop: this.stop.bind(this),
            fade: this.fade.bind(this),
            seek: this.seek.bind(this),
            load: this.load.bind(this),
            unload: this.unload.bind(this),
            on: this.on.bind(this),
            once: this.once.bind(this),
            off: this.off.bind(this)
        };
        copySetterGetterFromInstance(this, this.exports, 'volume');
        copySetterGetterFromInstance(this, this.exports, 'playbackRate');
        copySetterGetterFromInstance(this, this.exports, 'loop');
        copySetterGetterFromInstance(this, this.exports, 'muted');
        copySetterGetterFromInstance(this, this.exports, 'poolSize');
        copySetterGetterFromInstance(this, this.exports, 'isPlaying', true);
        copySetterGetterFromInstance(this, this.exports, 'id', true);
        copySetterGetterFromInstance(this, this.exports, 'url', true);
        copySetterGetterFromInstance(this, this.exports, 'state', true);
        copySetterGetterFromInstance(this, this.exports, 'playbackPosition', true);
        copySetterGetterFromInstance(this, this.exports, 'duration', true);
    }

    initializeOptions(options, destNode) {
        // If no id is provided, generate a simple random identifier
        // eslint-disable-next-line no-magic-numbers
        this._id = (options && options.id) || Math.random().toString(36)
            .substr(2, 9); // eslint-disable-line no-magic-numbers

        let poolSize = (options && options.poolSize) ? options.poolSize : defaultPoolSize;
        this._segmentPool = new AudioSegmentPool(this._context, destNode, poolSize);

        this._activeSegments = [];

        if (options && typeof options.optimizeFor !== 'undefined' &&
        options.optimizeFor !== 'time' && options.optimizeFor !== 'memory') {
            throw new Error('options.optimizeFor can either be "time" or "memory"');
        }
        this._optimizeFor = (options && typeof options.optimizeFor !== 'undefined') ? options.optimizeFor : 'time';

        this._preload = (options && typeof options.preload !== 'undefined') ? options.preload : true;
        this._state = 'unloaded';
        this._autoplay = (options && options.autoplay) || false;
        this._loop = (options && options.loop) || false;
        this._muted = (options && options.muted) || false;
        this._volume = (options && typeof options.volume !== 'undefined') ? options.volume : 1.0;
        this._playbackRate = 1.0;
    }

    /**
     * Will attempt to load the buffer from the pre-determined URL and pass it to the given segment.
     *
     * @returns
     * @memberof Sonor
     */
    loadSegment(audioSegment) {
        audioSegment.volume = this._volume;
        audioSegment.playbackRate = this._playbackRate;
        audioSegment.muted = this._muted;
        audioSegment.loop = this._loop;

        // Listen to AudioSegment's events
        this.setUpAudioSegmentListeners(audioSegment);

        // Load the buffer from the URL.
        if (!this._url) {
            let errMsg = 'Missing valid URL - cannot load';
            this.trigger('error', errMsg);
            throw new Error(errMsg);
        }
        let saveToCache = this._optimizeFor === 'time';
        return this._decodedBufferCache.getDecodedBuffer(this._url, this._context, saveToCache)
            .then((buffer) => {
                audioSegment.load();
                audioSegment.buffer = buffer;
                if (this._state !== 'loaded') {
                    this._state = 'loaded';
                    this.trigger('loaded');
                }
            })
            .catch((e) => {
                console.log(e); // eslint-disable-line no-console
                this._state = 'unloaded';
                this.trigger('error', e);
            });
    }

    /**
     * Will attempt to load the buffer from the pre-determined URL and pass it to all active audio segments.
     *
     * @returns
     * @memberof Sonor
     */
    load() {
        if (this._state !== 'loaded') {
            this._state = 'loading';
        }
        if (this._activeSegments.length === 0) {
            if (this._segmentPool.canRetrieve()) {
                let poolSegment = this._segmentPool.retrieve();
                if (poolSegment) {
                    this._activeSegments.push(poolSegment);
                }
            }
        }
        this._activeSegments.forEach((segment) => {
            this.loadSegment(segment);
        });
    }

    /**
     * Unloads all active audio segments and removes a ref from the decoded cache
     *
     * @memberof Sonor
     */
    unload() {
        this._state = 'unloaded';
        this._activeSegments.forEach((segment) => {
            this.removeAudioSegmentListeners(segment);
            this._segmentPool.returnSegment(segment);
        });
        this._activeSegments = [];
        this._decodedBufferCache.removeRef(this._url);
    }
}
export default Sonor;
