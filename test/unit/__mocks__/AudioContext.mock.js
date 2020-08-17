/* eslint-disable no-shadow */
class AudioNode {
    connect() { }
    disconnect() { }
    get numberOfInputs() {
        return 1;
    }
    get numberOfOutputs() {
        return 1;
    }
}

class AudioSourceNode extends AudioNode {
    get numberOfInputs() {
        return 0;
    }
}

class AudioDestinationNode extends AudioNode {
    get numberOfOutputs() {
        return 0;
    }
}

class AudioParam {
    cancelScheduledValues() {}
    exponentialRampToValueAtTime() {}
    linearRampToValueAtTime() {}
    setTargetValueAtTime() {}
    setValueAtTime() {}
    setValueCurveAtTime() {}
    get minValue() {
        return this._minValue || 0;
    }
    set minValue(newMinValue) {
        this._minValue = newMinValue;
    }
    get maxValue() {
        return this._maxValue || 1;
    }
    set maxValue(newMaxValue) {
        this._maxValue = newMaxValue;
    }
}

class AudioBufferSourceNode extends AudioSourceNode {
    start() {}
    stop() {}
    get playbackRate() {
        let p = new AudioParam();
        p.value = 1;
        p.minValue = 1;
        p.maxValue = 4;
        return p;
    }
}

class AudioGain extends AudioParam {

}

class GainNode extends AudioNode {
    constructor() {
        super();
        this.gain = new AudioGain();
    }
}

class AudioListener {
    get dopplerFactor() {
        return 1;
    }
    get speedOfSound() {
        // eslint-disable-next-line no-magic-numbers
        return 343.3;
    }
}

class AudioBuffer {
    constructor(inNumberOfChannels, inLength, inSampleRate) {
        this.numberOfChannels = inNumberOfChannels;
        this.length = inLength;
        this.sampleRate = inSampleRate;
    }
    get gain() {
        return 1;
    }
    get duration() {
        return this.length;
    }
}

class AudioContext {
    constructor() {
        this.destination = new AudioDestinationNode();
        this.listener = new AudioListener();
        this.id = Math.random().toString(36).substr(2, 9);
        this.state = 'running';
    }
    get activeSourceCount() {
        return 0;
    }
    get sampleRate() {
        // eslint-disable-next-line no-magic-numbers
        return 44100;
    }
    get currentTime() {
        return 0;
    }
    createBuffer(channels, inLength, rate) {
        return new AudioBuffer(channels, inLength, rate);
    }
    decodeAudioData(buffer, resolve) {
        resolve(buffer);
    }
    createBufferSource() {
        return new AudioBufferSourceNode();
    }
    createGain() {
        let gainNode = new GainNode();
        gainNode.context = this;
        return gainNode;
    }
    createGainNode() {
        return this.createGain();
    }
    suspend() {
        return new Promise(function(resolve, reject) { // eslint-disable-line no-unused-vars
            resolve();
        });
    }
    resume() {
        return new Promise(function(resolve, reject) { // eslint-disable-line no-unused-vars
            resolve();
        });
    }
    close() {
        this.state = 'closed';
    }
}

window.AudioContext = AudioContext;
