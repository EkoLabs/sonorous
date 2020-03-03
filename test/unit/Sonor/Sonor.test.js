import '../__mocks__/AudioContext.mock';
import Sonor from '../../../src/Sonor/Sonor';
import DecodedBufferCache from '../../../src/Sonor/BufferCache/DecodedBufferCache';
import AudioContextManager from '../../../src/AudioContextManager/AudioContextManager';
import Sonorous from '../../../src/Sonorous';
describe('Sonor', () => {
    beforeAll(() => {
        let acm = AudioContextManager.instance; // eslint-disable-line no-unused-vars
        jest.spyOn(Audio.prototype, 'canPlayType').mockReturnValue('probably');
        let testBuf = new window.AudioContext().createBuffer(1, 10, 22050); // eslint-disable-line no-magic-numbers
        jest.spyOn(DecodedBufferCache.prototype, 'getDecodedBuffer').mockReturnValue(Promise.resolve(testBuf));
    });
    describe('constructor', () => {
        it('throws an error if there is no src passed in', () => {
            expect(() => new Sonor())
                .toThrow('missing "src" value');
        });
        it('throws an error if there is no dest node passed in', () => {
            expect(() => new Sonor('test.mp3'))
                .toThrow('missing destination node');
        });

        it('throws an error if there is no audio context passed in', () => {
            expect(() => new Sonor('test.mp3', {}))
                .toThrow('missing audio context');
        });

        it('throws an error if invalid src is passed in', () => {
            expect(() => new Sonor('invalidTest', {}, new AudioContext()))
                .toThrow('invalid src value');
        });

        it('contains correct default values for options', () => {
            let sonorObj = new Sonor('test.mp3', {}, new AudioContext());
            expect(sonorObj.volume).toBe(1.0);
            expect(sonorObj.loop).toBe(false);
            expect(sonorObj.muted).toBe(false);
        });

        it('contains correct values for manually set options', () => {
            let sonorObj = new Sonor('test.mp3', {}, new AudioContext(), { preload: false, volume: 0.5, loop: true, muted: true });
            expect(sonorObj.volume).toBe(0.5);
            expect(sonorObj.loop).toBe(true);
            expect(sonorObj.muted).toBe(true);
        });

        it('will call play immediately if autoplay is true', (done) => {
            let sonorObj = new Sonor('test.mp3', {}, new AudioContext(), { autoplay: true });
            sonorObj.on('play', function(sObj) {
                expect(sObj).toBe(sonorObj);
                done();
            });
        });
    });

    describe('properties', () => {

        it('has a public, modifiable volume property', () => {
            let sonorObj = new Sonor('test.mp3', {}, new AudioContext());
            expect(sonorObj.volume).toBe(1.0);
            sonorObj.volume = 0.1;
            // eslint-disable-next-line no-magic-numbers
            expect(sonorObj.volume).toBe(0.1);
        });

        it('will throw an error if you set the volume to a non-number', () => {
            let sonorObj = new Sonor('test.mp3', {}, new AudioContext());
            let nonNumbers = ['', true, {}, 'abc', { nonEmpty: 'object' }];
            nonNumbers.forEach((val) => {
                expect(() => { sonorObj.volume = val; })
                    .toThrow('Invalid type given to volume setter');
            });
        });

        it('has a public modifiable playback rate property', () => {
            let sonorObj = new Sonor('test.mp3', {}, new AudioContext());
            expect(sonorObj.playbackRate).toBe(1.0);
            sonorObj.playbackRate = 2.0;
            expect(sonorObj.playbackRate).toBe(2.0);
        });

        it('will throw an error if you set the playback rate to a non-number', () => {
            let sonorObj = new Sonor('test.mp3', {}, new AudioContext());
            let nonNumbers = ['', true, {}, 'abc', { nonEmpty: 'object' }];
            nonNumbers.forEach((val) => {
                expect(() => { sonorObj.playbackRate = val; })
                    .toThrow('Invalid type given to playback rate setter');
            });
        });

        it('has a public modifiable loop property', () => {
            let sonorObj = new Sonor('test.mp3', {}, new AudioContext());
            expect(sonorObj.loop).toBe(false);
            sonorObj.loop = true;
            expect(sonorObj.loop).toBe(true);
        });

        it('will throw an error if you set loop to a non-boolean', () => {
            let sonorObj = new Sonor('test.mp3', {}, new AudioContext());
            let nonBoolean = ['', {}, 'abc', { nonEmpty: 'object' }];
            nonBoolean.forEach((val) => {
                expect(() => { sonorObj.loop = val; })
                    .toThrow('Invalid type given to loop setter - expected a boolean');
            });
        });

        it('allows you to set the loop property with a number', () => {
            let sonorObj = new Sonor('test.mp3', {}, new AudioContext());
            sonorObj.loop = 1;
            expect(sonorObj.loop).toBe(true);
            sonorObj.loop = 0;
            expect(sonorObj.loop).toBe(false);
            expect(() => { sonorObj.loop = 2; })
                .toThrow('Invalid type given to loop setter - expected a boolean');
        });

        it('has a public modifiable muted property', () => {
            let sonorObj = new Sonor('test.mp3', {}, new AudioContext());
            expect(sonorObj.muted).toBe(false);
            sonorObj.muted = true;
            expect(sonorObj.muted).toBe(true);
        });

        it('will throw an error if you set muted to a non-boolean', () => {
            let sonorObj = new Sonor('test.mp3', {}, new AudioContext());
            let nonBoolean = ['', {}, 1, 'abc', { nonEmpty: 'object' }];
            nonBoolean.forEach((val) => {
                expect(() => { sonorObj.muted = val; })
                    .toThrow('Invalid type given to muted setter');
            });
        });

        it('has a public read-only id property', () => {
            let sonorObj = new Sonor('test.mp3', {}, new AudioContext());
            expect(() => { sonorObj.id = 'some random id'; })
                .toThrow('Cannot set property id of #<Object> which has only a getter');
        });

        it('always generates unique ids for each sonor object', () => {
            let sonorIDS = new Set();
            for (let i = 0; i < 10; i++) {
                let s = new Sonor('test.mp3', {}, new AudioContext());
                expect(sonorIDS.has(s.id)).toBe(false);
                sonorIDS.add(s.id);
            }
        });

        it('has a public read-only url property', () => {
            let sonorObj = new Sonor('test.mp3', {}, new AudioContext());
            expect(() => { sonorObj.url = 'some random url'; })
                .toThrow('Cannot set property url of #<Object> which has only a getter');
        });

        it('has a public read-only isPlaying property', () => {
            let sonorObj = new Sonor('test.mp3', {}, new AudioContext());
            expect(() => { sonorObj.isPlaying = true; })
                .toThrow('Cannot set property isPlaying of #<Object> which has only a getter');
        });

        it('will throw an error if optimizeFor is not time or memory', () => {
            expect(() => new Sonor('test.mp3', {}, new AudioContext(), { optimizeFor: 1234 })).toThrow('options.optimizeFor can either be "time" or "memory"');
            expect(() => new Sonor('test.mp3', {}, new AudioContext(), { optimizeFor: 'abc' })).toThrow('options.optimizeFor can either be "time" or "memory"');
        });
    });
    describe('emits events', () => {
        it('emits a volume changed event', (done) => {
            let ac = new AudioContext();
            let sonorObj = new Sonor('../../integration/public/test_audio/sound2.mp3', ac.createGain(), ac);
            sonorObj.on('volumechanged', function(sObj, newVolume) {
                expect(sObj).toBe(sonorObj);
                expect(newVolume).toEqual(0.5);
                done();
            });
            sonorObj.volume = 0.5;
        });
        it('emits a playback rate changed event', (done) => {
            let ac = new AudioContext();
            let sonorObj = new Sonor('../../integration/public/test_audio/sound2.mp3', ac.createGain(), ac);
            sonorObj.on('playbackratechanged', function(sObj, newplaybackrate) {
                expect(sObj).toBe(sonorObj);
                expect(newplaybackrate).toEqual(2);
                done();
            });
            sonorObj.playbackRate = 2;
        });
        it('emits a loaded event', (done) => {
            let ac = new AudioContext();
            let sonorObj = new Sonor('test.mp3', ac.createGain(), ac);
            sonorObj.on('loaded', function(sObj) {
                expect(sObj).toBe(sonorObj);
                done();
            });
        });
        it('emits a seeked event', (done) => {
            let ac = new AudioContext();
            let sonorObj = new Sonor('test.mp3', ac.createGain(), ac);
            sonorObj.on('seeked', function(sObj, newseekposition) {
                expect(sObj).toBe(sonorObj);
                expect(newseekposition).toEqual(2);
                done();
            });
            sonorObj.on('loaded', function(sObj) {
                sObj.seek(2);
            });
        });
        it('bounds the seeked position to the duration of the audio', (done) => {
            let ac = new AudioContext();
            let sonorObj = new Sonor('test.mp3', ac.createGain(), ac);
            sonorObj.on('seeked', function(sObj, newseekposition) {
                expect(sObj).toBe(sonorObj);
                expect(newseekposition).toEqual(10);
                done();
            });
            sonorObj.on('loaded', function(sObj) {
                sObj.seek(100);
            });
        });
        it('loops the seeked position to the duration of the audio if sonor is looped', (done) => {
            let ac = new AudioContext();
            let sonorObj = new Sonor('test.mp3', ac.createGain(), ac);
            sonorObj.loop = true;
            sonorObj.on('seeked', function(sObj, newseekposition) {
                expect(sObj).toBe(sonorObj);
                expect(newseekposition).toEqual(5); // eslint-disable-line no-magic-numbers
                done();
            });
            sonorObj.on('loaded', function(sObj) {
                sObj.seek(15); // eslint-disable-line no-magic-numbers
            });
        });
        it('emits a play event', (done) => {
            let ac = new AudioContext();
            let sonorObj = new Sonor('test.mp3', ac.createGain(), ac);
            sonorObj.on('play', function(sObj) {
                expect(sObj).toBe(sonorObj);
                done();
            });
            sonorObj.play();
        });
        it('emits a pause event', (done) => {
            let ac = new AudioContext();
            let sonorObj = new Sonor('test.mp3', ac.createGain(), ac);
            sonorObj.on('pause', function(sObj) {
                expect(sObj).toBe(sonorObj);
                done();
            });
            sonorObj.play();
            sonorObj.on('play', function(sObj) {
                sObj.pause();
            });
        });
        it('emits a stop event', (done) => {
            let ac = new AudioContext();
            let sonorObj = new Sonor('test.mp3', ac.createGain(), ac);
            sonorObj.on('stop', function(sObj) {
                expect(sObj).toBe(sonorObj);
                done();
            });
            sonorObj.play();
            sonorObj.on('play', function(sObj) {
                sObj.stop();
            });
        });
        it('emits a fade finished event', (done) => {
            let ac = new AudioContext();
            let sonorObj = new Sonor('test.mp3', ac.createGain(), ac);
            sonorObj.on('fadefinished', function(sObj) {
                expect(sObj).toBe(sonorObj);
                done();
            });
            sonorObj.play();
            sonorObj.on('play', function(sObj) {
                sObj.fade(0.0, 0.1); // eslint-disable-line no-magic-numbers
            });
        });
        it('emits an error event when play is called twice and the pool size is 1', (done) => {
            let ac = new AudioContext();
            let sonorObj = new Sonor('test.mp3', ac.createGain(), ac);
            sonorObj.on('error', function(sObj, errMsg) {
                expect(sObj).toBe(sonorObj);
                expect(errMsg).toBe('No sounds in the pool available. Please pause/stop or wait until it has ended, or increase the pool size.');
                done();
            });
            sonorObj.play();
            sonorObj.on('play', function(sObj) {
                sObj.play();
            });
        });
        it('emits multiple play events when play is called twice and the pool size is more than 1', (done) => {
            let ac = new AudioContext();
            let sonorObj = new Sonor('test.mp3', ac.createGain(), ac, { poolSize: 5 });
            let count = 0;
            sonorObj.play();
            sonorObj.on('play', function(sObj) {
                count += 1;
                if (count === 5) { // eslint-disable-line no-magic-numbers
                    expect(count).toEqual(5); // eslint-disable-line no-magic-numbers
                    expect(sObj).toBe(sonorObj);
                    done();
                } else {
                    sObj.play();
                }
            });
        });
        it('emits an error event when play is called more times than the pool size available', (done) => {
            let ac = new AudioContext();
            let sonorObj = new Sonor('test.mp3', ac.createGain(), ac, { poolSize: 5 });
            sonorObj.on('error', function(sObj, errMsg) {
                expect(sObj).toBe(sonorObj);
                expect(errMsg).toBe('No sounds in the pool available. Please pause/stop or wait until it has ended, or increase the pool size.');
                done();
            });
            sonorObj.play();
            sonorObj.on('play', function(sObj) {
                sObj.play();
            });
        });
    });
});
