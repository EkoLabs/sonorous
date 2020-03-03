import '../../__mocks__/AudioContext.mock';
import MockedAxiosDownloadTask from './__mocks__/AxiosDownloadTask.js';
import DecodedBufferCache from '../../../../src/Sonor/BufferCache/DecodedBufferCache';
jest.mock('../../../../src/Sonor/BufferCache/AxiosDownloadTask', () => {
    return function(url) {
        return new MockedAxiosDownloadTask(url);
    };
});
describe('DecodedBufferCache', () => {
    describe('General validation', () => {
        it('is a singleton', () => {
            let decodedBfCache = DecodedBufferCache.instance;
            let decodedBfCache2 = DecodedBufferCache.instance;
            expect(decodedBfCache).toEqual(decodedBfCache2);
        });

        it('does return a promise for decoded buffer requests', () => {
            let decodedBfCache = DecodedBufferCache.instance;
            let promise = decodedBfCache.getDecodedBuffer('test.mp3', new AudioContext());
            expect(typeof promise.then === 'function').toBe(true);
        });

        it('does throw an error if no url is passed in', () => {
            let decodedBfCache = DecodedBufferCache.instance;
            return decodedBfCache.getDecodedBuffer('', new AudioContext()).catch((e) => {
                expect(e.message).toEqual('Missing required url');
            });
        });

        it('does throw an error if no audio context is passed in', () => {
            let decodedBfCache = DecodedBufferCache.instance;
            return decodedBfCache.getDecodedBuffer('test.mp3').catch((e) => {
                expect(e.message).toEqual('Missing required audio context');
            });
        });

        it('does throw an error if the url is not a string', () => {
            let decodedBfCache = DecodedBufferCache.instance;
            return decodedBfCache.getDecodedBuffer(10, new AudioContext()).catch((e) => {
                expect(e.message).toEqual('url must be a string');
            });
        });

        it('does not crash if we attempt to remove something that does not exist', () => {
            let decodedBfCache = DecodedBufferCache.instance;
            expect(() => decodedBfCache.removeRef('abc')).not.toThrow();
        });
    });
    describe('Cache persistence tests', () => {
        it('does cache requests for decoded buffers', () => {
            let decodedBfCache = DecodedBufferCache.instance;
            let promise = decodedBfCache.getDecodedBuffer('test1.mp3', new AudioContext());
            let p2 = decodedBfCache.getDecodedBuffer('test1.mp3', new AudioContext());
            expect(decodedBfCache._bufferCache['test1.mp3'].refs).toBe(2);
            expect(promise).toStrictEqual(p2);
        });
        it('does save to cache if indicated', (done) => {
            let decodedBfCache = DecodedBufferCache.instance;
            decodedBfCache.getDecodedBuffer('test123.mp3', new AudioContext(), true)
                .then(() => {
                    expect(decodedBfCache._bufferCache['test123.mp3']).not.toBe(undefined);
                    expect(decodedBfCache._bufferCache['test123.mp3'].refs).toBe(1);
                    done();
                });
        });
        it('does not save to cache by default', (done) => {
            let decodedBfCache = DecodedBufferCache.instance;
            let p1 = decodedBfCache.getDecodedBuffer('test456.mp3', new AudioContext());
            p1.then(() => {
                expect(decodedBfCache._bufferCache['test456.mp3']).toBe(undefined);
                done();
            });
        });
        it('will return the same buffer from the decoded array if it exists', (done) => {
            let decodedBfCache = DecodedBufferCache.instance;
            let p1 = decodedBfCache.getDecodedBuffer('testabc.mp3', new AudioContext(), true);
            p1.then((buf) => {
                let buf2 = decodedBfCache.getDecodedBuffer('testabc.mp3', new AudioContext(), true);
                if (typeof buf2.then === 'function') {
                    buf2.then((response) => {
                        expect(response).toEqual(buf);
                        expect(decodedBfCache._bufferCache['testabc.mp3']).not.toBe(undefined);
                        expect(decodedBfCache._bufferCache['testabc.mp3'].refs).toBe(2);
                        done();
                    });
                } else {
                    expect(buf2).toEqual(buf);
                    expect(decodedBfCache._bufferCache['testabc.mp3']).not.toBe(undefined);
                    expect(decodedBfCache._bufferCache['testabc.mp3'].refs).toBe(2);
                    done();
                }
            });
        });
        it('the ref count accurately reflects how many times the buffer is being used', () => {
            let decodedBfCache = DecodedBufferCache.instance;
            let refCount = 0;

            for (let i = 0; i < 10; i++) {
                decodedBfCache.getDecodedBuffer('test5.mp3', new AudioContext(), true);
                refCount += 1;
            }
            let totalRefs = decodedBfCache._bufferCache['test5.mp3'] ? decodedBfCache._bufferCache['test5.mp3'].refs : 0;
            expect(totalRefs).toEqual(refCount);

            for (let i = 0; i < 5; i++) { // eslint-disable-line no-magic-numbers
                decodedBfCache.removeRef('test5.mp3');
                refCount -= 1;
            }
            totalRefs = decodedBfCache._bufferCache['test5.mp3'] ? decodedBfCache._bufferCache['test5.mp3'].refs : 0;
            expect(totalRefs).toEqual(refCount);

            for (let i = 0; i < 10; i++) {
                decodedBfCache.getDecodedBuffer('test5.mp3', new AudioContext(), true);
                refCount += 1;
            }
            totalRefs = decodedBfCache._bufferCache['test5.mp3'] ? decodedBfCache._bufferCache['test5.mp3'].refs : 0;
            expect(totalRefs).toEqual(refCount);
        });
    });
    describe('Unloading tests', () => {
        it('does not return a buffer if the request gets cancelled while downloading', () => {
            let decodedBfCache = DecodedBufferCache.instance;
            let promise = decodedBfCache.getDecodedBuffer('test2.mp3', new AudioContext());
            decodedBfCache.removeRef('test2.mp3');
            return promise.then((res) => {
                expect(res).toBe(undefined);
            });
        });
        it('does not reject the promise if there are multiple requests and one gets cancelled', () => {
            let decodedBfCache = DecodedBufferCache.instance;
            let promise = decodedBfCache.getDecodedBuffer('test3.mp3', new AudioContext());
            let p2 = decodedBfCache.getDecodedBuffer('test3.mp3', new AudioContext()); // eslint-disable-line no-unused-vars
            let p3 = decodedBfCache.getDecodedBuffer('test3.mp3', new AudioContext()); // eslint-disable-line no-unused-vars
            decodedBfCache.removeRef('test3.mp3');
            return promise.then((response) => {
                // Check if we've received an audiobuffer
                expect(response.length).not.toBe(undefined);
                expect(response.numberOfChannels).toBe(1);
                expect(response.sampleRate).not.toBe(undefined);
            }).catch((e) => {
                // Force a failure
                expect(e).toBe(undefined);
            });
        });
        it('creates a new promise if the same url has been loaded, unloaded, then loaded again', (done) => {
            let decodedBfCache = DecodedBufferCache.instance;
            let promise = decodedBfCache.getDecodedBuffer('test4.mp3', new AudioContext());
            promise.then((res) => {
                expect(res).toBe(undefined);
                expect(decodedBfCache._bufferCache['test4.mp3']).toBe(undefined);

                let p2 = decodedBfCache.getDecodedBuffer('test4.mp3', new AudioContext()); // eslint-disable-line
                expect(decodedBfCache._bufferCache['test4.mp3'].refs).toBe(1);
                p2.then((response) => {
                    // Check if we've received an audiobuffer
                    expect(response.length).not.toBe(undefined);
                    expect(response.numberOfChannels).toBe(1);
                    expect(response.sampleRate).not.toBe(undefined);
                    done();
                });
            });
            expect(decodedBfCache._bufferCache['test4.mp3'].refs).toBe(1);
            decodedBfCache.removeRef('test4.mp3');
        });
    });
});
