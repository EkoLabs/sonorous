import './__mocks__/AudioContext.mock';
import Sonorous from '../../src/Sonorous';
import DecodedBufferCache from '../../src/Sonor/BufferCache/DecodedBufferCache';
// eslint-disable-next-line no-unused-vars
import Sonor from '../../src/Sonor/Sonor';

describe('Sonorous', () => {
    beforeAll(() => {
        jest.spyOn(Audio.prototype, 'canPlayType').mockReturnValue('probably');
        let testBuf = new window.AudioContext().createBuffer(1, 10, 22050); // eslint-disable-line no-magic-numbers
        jest.spyOn(DecodedBufferCache.prototype, 'getDecodedBuffer').mockReturnValue(Promise.resolve(testBuf));
    });
    describe('Adding and removing Sonor objs', () => {
        it('can add and retain a sonor object', () => {
            let newSonor = Sonorous.addSonor('abc.ogg');
            expect(newSonor).not.toBe(undefined);
            expect(Sonorous.sonors.length).toBe(1);
            expect(Sonorous.has(newSonor.id)).toBe(true);
        });
        it('can retrieve a previously created sonor obj', () => {
            let newSonor = Sonorous.addSonor('abc.mp3');
            let retrievedSonor = Sonorous.get(newSonor.id);
            expect(retrievedSonor).toEqual(newSonor);
            expect(Sonorous.has(newSonor.id)).toBe(true);
        });
        it('can remove a sonor object', () => {
            let newSonor = Sonorous.addSonor('abc.mp3', { preload: false });
            let sonorID = newSonor.id;
            Sonorous.removeSonor(sonorID);
            let retrievedSonor = Sonorous.get(sonorID);
            expect(retrievedSonor).toBe(undefined);
            expect(Sonorous.has(newSonor.id)).toBe(false);
        });
        it('returns an array of all sonors', () => {
            Sonorous.sonors.forEach((sonor) => {
                Sonorous.removeSonor(sonor.id);
            });
            let newSonor = Sonorous.addSonor('test.mp3', { preload: false });
            let newSonor1 = Sonorous.addSonor('test1.mp3', { preload: false });
            let newSonor2 = Sonorous.addSonor('test2.mp3', { preload: false });
            let arr = [newSonor, newSonor1, newSonor2];
            let sonorArr = Sonorous.sonors;
            expect(sonorArr.length).toBe(arr.length);
            expect(Array.isArray(sonorArr)).toBe(true);
            sonorArr.forEach((sonor) => {
                expect(arr.indexOf(sonor) < 0).toBe(false);
            });
        });
    });
    describe('load/unload', () => {
        afterEach(() => {
            Sonorous.reload();
        });

        it('will be loaded on creation', () => {
            expect(Sonorous.ctx).not.toBe(undefined);
            expect(Sonorous.ctx).not.toBe(null);
        });

        it('will no longer have a context if unloaded', () => {
            expect(Sonorous.ctx).not.toBe(undefined);
            expect(Sonorous.ctx).not.toBe(null);
            Sonorous.unload();
            expect(Sonorous.ctx).toBe(null);
        });
        it('will clear the sonors if unloaded', () => {
            let sonor = Sonorous.addSonor('test123.mp3');
            expect(Sonorous.sonors.length).toBe(1);
            Sonorous.unload();
            expect(Sonorous.sonors.length).toBe(0);
            expect(Sonorous.has(sonor.id)).toBe(false);
        });
        it('will create a new context when load is called', () => {
            let ctx = Sonorous.ctx;
            Sonorous.unload();
            Sonorous.reload();
            expect(ctx).not.toEqual(Sonorous.ctx);
            expect(ctx).not.toBe(Sonorous.ctx);
        });
        it('will retain new sonors after load is called', () => {
            Sonorous.unload();
            Sonorous.reload();
            let sonor = Sonorous.addSonor('testing123.mp3');
            expect(Sonorous.sonors.length).toBe(1);
            expect(Sonorous.has(sonor.id)).toBe(true);
        });
    });
    describe('setting master volume/muting all', () => {
        it('can set the master volume', () => {
            Sonorous.masterVolume = 0.1;
            // eslint-disable-next-line no-magic-numbers
            expect(Sonorous.masterVolume).toBe(0.1);
        });
        it('can mute the master volume', () => {
            Sonorous.muteAll = true;
            expect(Sonorous.muteAll).toBe(true);
        });
        it('will return to the previously set volume when unmuted', () => {
            Sonorous.masterVolume = 0.1;
            Sonorous.muteAll = true;
            Sonorous.muteAll = false;
            expect(Sonorous.masterVolume).toBe(0.1); // eslint-disable-line no-magic-numbers
        });
    });
    describe('emits events', () => {
        it('emits a master volume changed event', (done) => {
            Sonorous.once('mastervolumechanged', function(newVol) {
                expect(newVol).toBe(0.5);
                done();
            });
            Sonorous.masterVolume = 0.5;
        });
        it('emits a master volume changed event when muting all', (done) => {
            Sonorous.once('mastervolumechanged', function(newVol) {
                expect(newVol).toBe(0);
                done();
            });
            Sonorous.muteAll = true;
        });
    });
});
