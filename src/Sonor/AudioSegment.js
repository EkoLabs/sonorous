import AudioContextManager from '../AudioContextManager/AudioContextManager';
import copySetterGetterFromInstance from '../utils/copySetterGetterFromInstance';
import ActionQueue from '../utils/ActionQueue/ActionQueue';
import EventEmitter from 'eventemitter3';
import env from '../utils/environment';

const clampWithWarning = function(min, max, value, warningMsg) {
    let clampedValue = value;
    if (value < min || value > max) {
        clampedValue = Math.max(min, Math.min(max, value));
        if (warningMsg) {
            // eslint-disable-next-line no-console
            console.warn(`${warningMsg} Allowed Range: [${min}, ${max}] Changing to:${clampedValue}`);
        }
    }
    return clampedValue;
};

/**
 * AudioSegment is a wrapper over the AudioBufferSourceNode. It will handle most of the functionality
 * of playing, pausing, volume, etc.
 *
 * @export
 * @class AudioSegment
 */
class AudioSegment {
    /**
     * Creates an instance of AudioSegment.
     * @param {AudioContext} context - Required. The AudioContext is necessary to create source nodes, etc.
     * @param {*} destNode - Required. The node that we will connect our gainnode to.
     * @param {string} id - Optional. The id of the audio segment.
     * @memberof AudioSegment
     */
    constructor(context, destNode, id) {
        this._context = context;
        this._eventEmitter = new EventEmitter();
        this._actionQueue = new ActionQueue();
        this._destNode = destNode;

        if (typeof id === 'string') {
            this._id = id;
        } else {
            // eslint-disable-next-line no-magic-numbers
            this._id = Math.random().toString(36)
                .substr(2, 9); // eslint-disable-line no-magic-numbers
        }

        // Initialize private properties
        this._playbackRate = 1.0;
        this._volume = 1.0;
        this._muted = false;
        this._isPaused = false;
        this._looping = false;

        this._start = 0.0;
        this._duration = 0.0;
        this._contextPlayStartTime = 0.0;
        this._seekPosition = 0.0;

        AudioContextManager.instance.on('audiounlocked', () => {
            this.startEventQueueIfReady();
        });

        // Define the gain/source nodes
        this.load();
        this._sourceNode = null;
        this._buffer = null;

        // Generate our public functionality object (this.exports)
        this.exportPublicAPI();

        return this.exports;
    }

    ///////////////////////
    // PROPERTIES
    ///////////////////////

    /**
     * Controls the volume of the sound
     * @name AudioSegment#volume
     * @type Number
     * @default 1.0
     * @memberof AudioSegment
     */
    get volume() {
        return this._volume;
    }

    set volume(newVolumeValue) {
        if (typeof newVolumeValue !== 'number') {
            throw new TypeError('Invalid type given to volume setter - expected a number.');
        }

        newVolumeValue = this.clampVolume(newVolumeValue);
        this._volume = newVolumeValue;
        this.trigger('volumechanged', newVolumeValue);

        // If its not muted then set the volume
        if (!this._muted && this._gainNode) {
            this._gainNode.gain.setValueAtTime(newVolumeValue, this._context.currentTime);
        }
    }

    /**
     * Controls the playback rate of the sound
     * @name AudioSegment#playbackRate
     * @type Number
     * @default 1.0
     * @memberof AudioSegment
     */
    get playbackRate() {
        return this._playbackRate;
    }

    set playbackRate(newPlaybackRateValue) {
        if (typeof newPlaybackRateValue !== 'number') {
            throw new TypeError('Invalid type given to playback rate setter - expected a number.');
        }
        this._playbackRate = newPlaybackRateValue;
        this.trigger('playbackratechanged', newPlaybackRateValue);

        // If we have a source node, then set its playback rate
        if (this._sourceNode) {
            newPlaybackRateValue = clampWithWarning(
                this._sourceNode.playbackRate.minValue,
                this._sourceNode.playbackRate.maxValue,
                newPlaybackRateValue,
                'Playback Rate value is out of bounds.'
            );
            this._sourceNode.playbackRate.value = newPlaybackRateValue;
        }
    }

    /**
     * Controls if the sound will loop indefinitely or not
     * @name AudioSegment#loop
     * @type Boolean
     * @default false
     * @memberof AudioSegment
     */
    get loop() {
        return this._looping;
    }

    set loop(newIsLooping) {
        this._looping = newIsLooping;

        // If we have a source node, then set its looping value
        if (this._sourceNode) {
            this._sourceNode.loop = newIsLooping;
        }
    }

    /**
     * Controls if the sound is muted or not
     * @name AudioSegment#muted
     * @type Boolean
     * @default false
     * @memberof AudioSegment
     */
    get muted() {
        return this._muted;
    }

    set muted(newMutedValue) {
        if (typeof newMutedValue !== 'boolean') {
            throw new TypeError('Invalid type given to muted setter - expected a boolean.');
        }
        this._muted = newMutedValue;
        let volValue = newMutedValue ? 0.0 : this._volume;
        if (this._gainNode) {
            this._gainNode.gain.setValueAtTime(volValue, this._context.currentTime);
            this.trigger('volumechanged', volValue);
        }
    }

    /**
     * Returns true if a sound is currently playing, false otherwise
     * @name AudioSegment#isPlaying
     * @type boolean
     * @readonly
     * @memberof AudioSegment
     */
    get isPlaying() {
        // In the off chance that the context is suspended but we're still playing, immediately pause and return false.
        if (this._context.state !== 'running' && this._isPlaying) {
            this.pause();
            return false;
        }
        return this._isPlaying;
    }


    /**
     * The buffer to create the source node with. If this is not set, this class will not be functional.
     * @name AudioSegment#buffer
     * @type {AudioBuffer}
     * @memberof AudioSegment
     */
    get buffer() {
        return this._buffer;
    }

    set buffer(newDecodedBuffer) {
        this._buffer = newDecodedBuffer;
        this._duration = newDecodedBuffer ? newDecodedBuffer.duration : 0;
        this.startEventQueueIfReady();
    }

    get id() {
        return this._id;
    }

    get duration() {
        return this._duration;
    }

    ///////////////////////
    // PUBLIC FUNCTIONALITY
    ///////////////////////

    /**
     * Play() handles creating a source from a buffer, resuming the context
     * if necessary, and then starting the source. A new source buffer will
     * be created every time play is called. The source buffer will only be
     * created through play (i.e. no other operations will refresh the buffer).
     * This function will also set isPlaying to true.
     *
     * @memberof AudioSegment
     */
    play() {
        // Note that all we do is push an event to the queue. Please see this._play() for the actual implementation.
        // If the queue has been started, we will play immediately. If not, it will play as soon as the queue has started.
        this._actionQueue.push({
            name: 'play',
            onExecute: this._play.bind(this)
        });
    }

    /**
     * Will "pause" the sound by stopping the source buffer and storing the time to re-start at.
     * It will set isPlaying to false.
     *
     * @memberof AudioSegment
     */
    pause() {
        // Note that all we do is push the event to the queue. Please see this._pause() for the actual implementation.
        // If the queue has been started, we will pause immediately. If not, it will pause as soon as the queue has started.
        this._actionQueue.push({
            name: 'pause',
            onExecute: this._pause.bind(this)
        });
    }

    /**
     * Stop() handles stopping the current source buffer, if one exists.
     * It will set isPlaying to false.
     *
     * @memberof AudioSegment
     */
    stop() {
        // Note that all we do is push the event to the queue. Please see this._stop() for the actual implementation.
        // If the queue has been started, we will stop immediately. If not, it will stop as soon as the queue has started.
        this._actionQueue.push({
            name: 'stop',
            onExecute: this._stop.bind(this)
        });
    }

    /**
     * If we're currently playing, then this will stop the current buffer node, set the seek position, and resume play.
     * If we aren't playing, then this will set the seek position and when play is started, it will play from this point.
     *
     * @param {Number} newSeekPosition - the position to seek to. It will be bounded by the start/duration of the audio.
     * @memberof AudioSegment
     */
    seek(newSeekPosition) { // eslint-disable-line no-unused-vars
        // Note that all we do is push the event to the queue. Please see this._seek() for the actual implementation.
        // If the queue has been started, we will seek immediately. If not, it will seek as soon as the queue has started.
        this._actionQueue.push({
            name: 'seek',
            onExecute: this._seek.bind(this),
            args: arguments
        });
    }

    /**
     * Fades from one volume to another using the gain node's linear fade functionality.
     * Allows scheduling a fade to appear later in the audio's sound. startTime is currently
     * in terms of audio start, not context start. If we're not playing, then the fade will
     * not register.
     *
     * @param {Number} stopVolume
     * @param {Number} fadeDuration
     * @param {Number} startTime
     * @memberof AudioSegment
     */
    fade(stopVolume, fadeDuration, startTime) {
        // Validate inputs
        if (typeof stopVolume !== 'number' || typeof fadeDuration !== 'number' ||
            (startTime && typeof startTime !== 'number')) {
            throw new TypeError('Invalid type given to fade- expected numbers for all parameters');
        }

        // Note that all we do is push the event to the queue. Please see this._fade() for the actual implementation.
        // If the queue has been started, we will fade immediately. If not, it will fade as soon as the queue has started.
        this._actionQueue.push({
            name: 'fade',
            onExecute: this._fade.bind(this),
            args: arguments
        });
    }

    load() {
        if (!this._gainNode) {
            this._gainNode = this._context.createGain();
            this._gainNode.connect(this._destNode);
            this._gainNode.gain.setValueAtTime(this._volume, this._context.currentTime);
        }
    }

    /**
     * Stops and disposes of the current buffer source node. Disconnects from the
     * audio graph. Clears out the stored buffer.
     *
     * @memberof AudioSegment
     */
    unload() {
        this._actionQueue.stop();
        this.disposeBufferSourceNode();
        this._buffer = null;
        if (this._gainNode) {
            this._gainNode.disconnect();
        }
        this._gainNode = null;
    }

    on(eventName, callback) {
        this._eventEmitter.on(eventName, callback);
    }

    off(eventName, callback) {
        this._eventEmitter.off(eventName, callback);
    }

    once(eventName, callback) {
        this._eventEmitter.once(eventName, callback);
    }

    ///////////////////////
    // PRIVATE FUNCTIONALITY
    ///////////////////////
    /**
     * Private function. Will emit an event and pass the audio segment instance
     * as one of the arguments, along with any other args specified.
     *
     * @param {*} eventName
     * @param {*} args
     * @memberof AudioSegment
     */
    trigger(eventName, ...args) {
        this._eventEmitter.emit(eventName, this.exports, ...args);
    }

    /**
     * Private function. Will generate the exports object, which includes all the functions external users
     * can call, and will copy all public properties from the instance to this object.
     *
     * @memberof AudioSegment
     */
    exportPublicAPI() {
        this.exports = {
            play: this.play.bind(this),
            pause: this.pause.bind(this),
            stop: this.stop.bind(this),
            seek: this.seek.bind(this),
            fade: this.fade.bind(this),
            load: this.load.bind(this),
            unload: this.unload.bind(this),
            getPlayheadPosition: this.getPlayheadPosition.bind(this),
            on: this.on.bind(this),
            once: this.once.bind(this),
            off: this.off.bind(this)
        };
        copySetterGetterFromInstance(this, this.exports, 'volume');
        copySetterGetterFromInstance(this, this.exports, 'playbackRate');
        copySetterGetterFromInstance(this, this.exports, 'loop');
        copySetterGetterFromInstance(this, this.exports, 'muted');
        copySetterGetterFromInstance(this, this.exports, 'buffer');
        copySetterGetterFromInstance(this, this.exports, 'isPlaying', true);
        copySetterGetterFromInstance(this, this.exports, 'id', true);
        copySetterGetterFromInstance(this, this.exports, 'duration', true);
    }


    /**
     * Private function. Currently, the queue can be started if the audio context is unlocked
     * AND if the buffer has been loaded. This function checks if both those conditions have
     * been met and will start the event queue if so.
     *
     * @memberof AudioSegment
     */
    startEventQueueIfReady() {
        if (AudioContextManager.instance.isUnlocked && this.buffer) {
            this._actionQueue.start();
        }
    }

    /**
     * Private function. Given some number, this will calculate what the looped position in the sonor would be.
     * (Essentially calculate the remainder of a newPos%duration)
     * @param {*} newPos
     * @memberof AudioSegment
     */
    calculateLoopedPosition(newPos) {
        if (this._duration) {
            return ((newPos / this._duration) % 1) * this._duration;
        }
        return newPos;
    }


    /**
     * Private function.
     * The actual implementation of play functionality. This will handle creating and starting
     * the buffer source node and emitting the event.
     *
     * @returns
     * @memberof AudioSegment
     */
    _play() {
        // If we're already playing, don't do anything.
        if (this._isPlaying) {
            this.trigger(
                'error',
                'Already playing this sound. Please pause/stop or wait until it has ended.'
            );
            return;
        }
        this._sourceNode = this.createSourceFromBuffer(this.buffer);
        if (this._context.state === 'suspended' || this._context.state === 'interrupted') {
            this._context.resume().then(this.startBufferSourceNode.bind(this));
        } else {
            this.startBufferSourceNode();
        }
    }


    /**
     * Private function.
     * The actual implementation of pause functionality. This will dispose of the source node,
     * set the seekPosition and emit the pause event.
     *
     * @returns
     * @memberof AudioSegment
     */
    _pause() {
        if (!this._sourceNode) {
            // Nothing to pause
            return;
        }
        if (!this._isPlaying) {
            // We're not playing, so don't pause
            return;
        }
        this._seekPosition = this.getPlayheadPosition();
        this.disposeBufferSourceNode();
        this._isPlaying = false;
        this._isPaused = true;
        this.trigger('pause');
    }

    /**
     * Private function.
     * The actual stop functionality. This will dispose of the source node, and emit the stop event.
     *
     * @returns
     * @memberof AudioSegment
     */
    _stop() {
        if (!this._isPlaying) {
            console.warn(`[AudioSegment] No playback to stop, as the segment is not currently playing. Resetting the segment.`); // eslint-disable-line
            // Don't trigger the stop notification, but reset the segment accordingly
            this._seekPosition = this._start;
            this.disposeBufferSourceNode();
            this._isPaused = false;
            return;
        }
        if (!this._sourceNode) {
            console.warn(`[AudioSegment] Cannot stop playback, as there is no source node`); // eslint-disable-line
            return; // Nothing to stop
        }

        this._seekPosition = this._start;
        this.disposeBufferSourceNode();
        this._isPlaying = false;
        this._isPaused = false;
        this.trigger('stop');
    }


    /**
     * Private function.
     * The actual seek functionality. This will set the seek position and if currently playing,
     * continue playback at that point.
     *
     * @param {*} newSeekPosition
     * @memberof AudioSegment
     */
    _seek(newSeekPosition) {
        if (typeof newSeekPosition !== 'number') {
            throw new TypeError('Seek expected a number for newSeekPosition.');
        }
        let calculatedSeekPosition;

        if (this._looping) {
            calculatedSeekPosition = this.calculateLoopedPosition(newSeekPosition);
        } else {
            calculatedSeekPosition = clampWithWarning(
                this._start,
                this._duration,
                newSeekPosition,
                'Seek Position was beyond the limits of the buffer start/end.'
            );
        }
        if (this._isPlaying) {
            this._stop();
            this._seekPosition = calculatedSeekPosition;
            this._play();
        } else {
            this._seekPosition = calculatedSeekPosition;
        }
        this.trigger('seeked', calculatedSeekPosition);
    }

    /**
     * Private function.
     * The actual fade functionality. This will handle setting the fade and emitting the event.
     *
     * @param {*} stopVolume
     * @param {*} fadeDuration
     * @param {*} startTime
     * @returns
     * @memberof AudioSegment
     */
    _fade(stopVolume, fadeDuration, startTime) {
        // If we're muted or not playing, then don't do anything
        if (this.muted || !this.isPlaying) {
            console.warn('[AudioSegment] Attempting to fade a sonor that is muted or not playing'); // eslint-disable-line no-console
            return;
        }
        let clampedEndVolume = this.clampVolume(stopVolume);
        let finalDuration = fadeDuration;
        let willSchedule = false;
        if (startTime) {
            let currentPlayheadPosition = this.getPlayheadPosition();
            if (startTime <= currentPlayheadPosition) { // The fade should have already started
                // (Linearly) interpolate what the volume should be if it started right now
                let timeElapsedSinceStart = currentPlayheadPosition - startTime;
                let ratio = timeElapsedSinceStart / fadeDuration;
                this.volume = this.volume * ratio;
                finalDuration = fadeDuration - timeElapsedSinceStart;
            } else {
                willSchedule = true;
                let timeoutDuration = startTime - currentPlayheadPosition;
                setTimeout(() => this.startFade(clampedEndVolume, fadeDuration), timeoutDuration * 1000.0);
            }
        }

        if (!willSchedule) {
            this.startFade(clampedEndVolume, finalDuration);
        }
    }

    /**
     * Private function. This will set the current context play time, start the node, and set isplaying to true.
     *
     * @memberof AudioSegment
     */
    startBufferSourceNode() {
        this._contextPlayStartTime = this._context.currentTime - this._seekPosition;
        if (this._sourceNode) {
            this._sourceNode.start(0, this._seekPosition);
            this._isPlaying = true;
            this._isPaused = false;
            this.trigger('play');
        } else {
            console.warn('Unable to start playback. No source node created'); // eslint-disable-line no-console
        }
    }

    /**
     * Private function. This will stop, disconnect, and remove the source node, if one exists.
     *
     * @memberof AudioSegment
     */
    disposeBufferSourceNode() {
        if (this._sourceNode) {
            this._sourceNode.stop(0);
            this._sourceNode.disconnect();
            let isSafariOriOS = env.os === 'ios' || env.browser === 'safari';

            // Safari iOS seems to leak AudioBuffer memory, even if we clear references.
            // The only way to dispose of it seems to be to also assign a dummy buffer to AudioBufferSourceNode.
            try {
                if (isSafariOriOS) {
                    let dummyBuffer;
                    if (this._context) {
                        if (!this._context.__dummyBuffer) {
                            // eslint-disable-next-line no-magic-numbers
                            this.context.__dummyBuffer = this.context.createBuffer(1, 1, 22050);
                        }
                        dummyBuffer = this.context.__dummyBuffer;
                    }
                    if (dummyBuffer) {
                        this._sourceNode.buffer = dummyBuffer;
                    }
                } else {
                    this._sourceNode.buffer = null;
                }
            } catch (e) { }
            this._sourceNode.onended = null;
            this._sourceNode = null;
        }
    }

    /**
     * Private function. onEnded will be called whenever the AudioSourceBufferNode's "onEnded" is triggered.
     *
     * @memberof AudioSegment
     */
    onEnded() {
        if (!this._isPaused) {
            this._seekPosition = this._start;
        }
        this._isPlaying = false;
        this.disposeBufferSourceNode();
        this.trigger('ended');
    }

    /**
     * CreateSourceFromBuffer is a private function that will create the source node from the decoded buffer data.
     * It will error out if there is no buffer or no context (necessary to create the source node). This function
     * will be called whenever we need to play. We will also set values on the source node, like looping,
     * playback rate, etc.
     *
     * @param {AudioBuffer} buffer - the buffer to store in the AudioBufferSourceNode
     * @returns {AudioBufferSourceNode}
     * @memberof AudioSegment
     */
    createSourceFromBuffer(buffer) {
        if (!buffer) {
            console.log('Did not receive a buffer'); // eslint-disable-line no-console
            return;
        }
        if (!this._context) {
            console.log('Do not have a context, cannot create an audio node'); // eslint-disable-line no-console
            return;
        }
        let source = this._context.createBufferSource();
        source.buffer = buffer;
        source.loop = this._looping;
        this._playbackRate = clampWithWarning(
            source.playbackRate.minValue,
            source.playbackRate._maxValue,
            this._playbackRate,
            'Previously set playback rate is out of bounds.'
        );
        source.playbackRate.value = this._playbackRate;
        source.onended = this.onEnded.bind(this);
        source.connect(this._gainNode);
        return source;
    }


    /**
     * Private function. Returns how far into playback we are. This is relative to the
     * duration of the buffer and will take into account looping.
     * Ex. If we have played a 30s audio through once, and we are 10s into the second time
     * playing it, we will return 10s.
     * @returns {Number} how far into playback we are
     * @memberof AudioSegment
     */
    getPlayheadPosition() {
        if (this._isPlaying) {
            let timeElapsed = (this._context.currentTime - this._contextPlayStartTime);

            // If we have looped already, then the time elapsed is going to be greater than the duration
            // We want to figure out how far we are into the sound on its current iteration.
            // The code below divides the timeElapsed by the duration and mods by 1 - to get only the decimal part.
            // Then multiply that by the duration.
            if (this._duration === 0) {
                console.warn(`[AudioSegment] A duration is not set for the current audio segment. Cannot calculate playback position.`); // eslint-disable-line
                return this._seekPosition;
            }
            return this.calculateLoopedPosition(timeElapsed);
        }
        return this._seekPosition;
    }


    /**
     * Private function. This will kick off the fade immediately.
     *
     * @param {Number} endVolume
     * @param {Number} duration
     * @memberof AudioSegment
     */
    startFade(endVolume, duration) {
        let currentTime = this._context.currentTime;
        let endTime = currentTime + (duration);
        this._gainNode.gain.linearRampToValueAtTime(endVolume, endTime);
        setTimeout(() => {
            this.trigger('fadefinished');
            this.volume = endVolume;
        }, duration * 1000.0);
    }


    /**
     * Private function. This is a helper function and will clamp the
     * volume according to the gain node's min/max and send a warning
     * to the console if it must be clamped.
     *
     * @param {Number} vol
     * @returns {Number} clamped volume
     * @memberof AudioSegment
     */
    clampVolume(vol) {
        let clampedVol = vol;
        if (this._gainNode) {
            let minPossibleVolume = this._gainNode.gain.minValue;
            let maxPossibleVolume = this._gainNode.gain.maxValue;
            clampedVol = clampWithWarning(
                minPossibleVolume,
                maxPossibleVolume,
                vol,
                'Volume value is out of bounds.'
            );
        }
        return clampedVol;
    }
}

export default AudioSegment;
