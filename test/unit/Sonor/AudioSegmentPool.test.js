/* eslint-disable no-console */
import '../__mocks__/AudioContext.mock';
import AudioSegmentPool from '../../../src/Sonor/AudioSegmentPool';
import AudioContextManager from '../../../src/AudioContextManager/AudioContextManager';
import Sonorous from '../../../src/Sonorous';

describe('AudioSegmentPool', () => {
    beforeAll(() => {
        let acm = AudioContextManager.instance; // eslint-disable-line no-unused-vars
        jest.spyOn(Audio.prototype, 'canPlayType').mockReturnValue('probably');
    });
    describe('constructor', () => {
        it('throws an error if there is no audio context passed in', () => {
            expect(() => new AudioSegmentPool())
                .toThrow('missing "context" value');
        });
        it('throws an error if there is no destination node passed in', () => {
            let ac = new AudioContext();
            expect(() => new AudioSegmentPool(ac))
                .toThrow('missing "destNode" value');
        });
        it('throws an error if maxSize is not a number', () => {
            let ac = new AudioContext();
            expect(() => new AudioSegmentPool(ac, ac.createGain(), 'abc'))
                .toThrow('Expected maxSize to be a number.');
        });
        it('throws an error if maxSize is less than or equal to 0', () => {
            let ac = new AudioContext();
            expect(() => new AudioSegmentPool(ac, ac.createGain(), -1))
                .toThrow('Expected maxSize to be a number greater than 0.');
        });
        it('creates a default pool of size 1', () => {
            let ac = new AudioContext();
            let pool = new AudioSegmentPool(ac, ac.createGain());
            expect(pool.maxSize).toBe(1);
        });
        it('creates a pool of a custom size if specified', () => {
            let ac = new AudioContext();
            let pool = new AudioSegmentPool(ac, ac.createGain(), 10);
            expect(pool.maxSize).toBe(10);
        });
    });
    describe('retrieving from pool', () => {
        let origConsoleWarn = console.warn;
        beforeEach(() => {
            console.warn = jest.fn();
        });
        afterEach(() => {
            console.warn = origConsoleWarn;
        });
        it('can retrieve from pool if available', () => {
            let ac = new AudioContext();
            let pool = new AudioSegmentPool(ac, ac.createGain());
            let as = pool.retrieve();
            expect(as).not.toBe(undefined);
        });

        it('cannot retrieve from pool if pool is empty', () => {
            let ac = new AudioContext();
            let pool = new AudioSegmentPool(ac, ac.createGain());
            let as = pool.retrieve();
            let as1 = pool.retrieve();
            expect(as).not.toBe(undefined);
            expect(as1).toBe(undefined);
        });

        it('canRetrieve will return false if pool is empty', () => {
            let ac = new AudioContext();
            let pool = new AudioSegmentPool(ac, ac.createGain());
            pool.retrieve();
            expect(pool.canRetrieve()).toBe(false);
        });
    });
    describe('returning to pool', () => {
        let origConsoleWarn = console.warn;
        let warnFn = jest.fn();
        beforeEach(() => {
            console.warn = warnFn;
        });
        afterEach(() => {
            console.warn = origConsoleWarn;
        });
        it('will add the audio segment back into the pool', () => {
            let ac = new AudioContext();
            let pool = new AudioSegmentPool(ac, ac.createGain());
            expect(pool.canRetrieve()).toBe(true);
            let as = pool.retrieve();
            expect(pool.canRetrieve()).toBe(false);
            pool.returnSegment(as);
            expect(pool.canRetrieve()).toBe(true);
        });
        it('will throw a warning if the pool reaches max capacity', () => {
            let ac = new AudioContext();
            let pool = new AudioSegmentPool(ac, ac.createGain());
            expect(pool.canRetrieve()).toBe(true);
            let as = pool.retrieve();
            expect(pool.canRetrieve()).toBe(false);
            pool.returnSegment(as);
            pool.returnSegment(as);
            expect(warnFn.mock.calls.length).toBe(1);
            expect(warnFn.mock.calls[0][0]).toBe('Unable to add audio segment to pool. Segment was not found in pool to begin with.');
        });
    });
    describe('changing pool size', () => {
        describe('increasing pool size', () => {
            it('will let you retrieve the max size of segments if you change pool size after init and there are no currently in use segments', () => {
                let ac = new AudioContext();
                let pool = new AudioSegmentPool(ac, ac.createGain());
                let newMaxSize = 5;
                pool.maxSize = newMaxSize;
                expect(pool.maxSize).toEqual(newMaxSize);
                for (let i = 0; i < newMaxSize; i++) {
                    let seg = pool.retrieve();
                    expect(seg).not.toBe(undefined);
                }
            });

            it('will let you retrieve the max size of segments if you change pool size after init and there are a few currently in use segments', () => {
                let ac = new AudioContext();
                let pool = new AudioSegmentPool(ac, ac.createGain());
                let maxSize = pool.maxSize;
                let firstSeg = pool.retrieve();
                expect(firstSeg).not.toBe(undefined);
                let newMaxSize = 5;
                pool.maxSize = newMaxSize;
                for (let i = 0; i < (newMaxSize - maxSize); i++) {
                    let seg = pool.retrieve();
                    expect(seg).not.toBe(undefined);
                }
                expect(pool.canRetrieve()).toBe(false);
            });

            it('will let you return the new max size of segments', () => {
                let ac = new AudioContext();
                let pool = new AudioSegmentPool(ac, ac.createGain());
                let maxSize = pool.maxSize;
                let segmentArr = [];
                segmentArr.push(pool.retrieve());
                let newMaxSize = 5;
                pool.maxSize = newMaxSize;
                for (let i = 0; i < (newMaxSize - maxSize); i++) {
                    segmentArr.push(pool.retrieve());
                }
                segmentArr.forEach((seg) => {
                    expect(seg).not.toBe(undefined);
                    pool.returnSegment(seg);
                });
                expect(pool.availableSegmentCount).toEqual(newMaxSize);
            });
        });

        describe('decreasing pool size', () => {
            let origConsoleWarn = console.warn;
            let warnFn = jest.fn();
            beforeEach(() => {
                console.warn = warnFn;
            });
            afterEach(() => {
                console.warn = origConsoleWarn;
            });
            it('will let you retrieve the max size of segments if you change pool size after init and there are no currently in use segments', () => {
                let ac = new AudioContext();
                let maxSize = 5;
                let pool = new AudioSegmentPool(ac, ac.createGain(), maxSize);
                expect(pool.availableSegmentCount).toEqual(maxSize);
                let newMaxSize = 1;
                pool.maxSize = newMaxSize;
                expect(pool.availableSegmentCount).toEqual(newMaxSize);
                for (let i = 0; i < newMaxSize; i++) {
                    let seg = pool.retrieve();
                    expect(seg).not.toBe(undefined);
                }
                expect(pool.canRetrieve()).toBe(false);
            });
            it('will let you retrieve the max size of segments if you change pool size after init and there are some currently in use segments', () => {
                let ac = new AudioContext();
                let maxSize = 5;
                let pool = new AudioSegmentPool(ac, ac.createGain(), maxSize);
                let firstSeg = pool.retrieve();
                expect(firstSeg).not.toBe(undefined);
                let newMaxSize = 3;
                pool.maxSize = newMaxSize;
                expect(pool.availableSegmentCount).toEqual(2);
                for (let i = 0; i < (maxSize - newMaxSize); i++) {
                    let seg = pool.retrieve();
                    expect(seg).not.toBe(undefined);
                }
                expect(pool.canRetrieve()).toBe(false);
                expect(pool.retrieve()).toBe(undefined);
                expect(warnFn.mock.calls.length).toBe(1);
                expect(warnFn.mock.calls[0][0]).toBe('All segments are currently being used. Returning undefined.');
            });
            it('will not let you retrieve the max size of segments if you change pool size after init and there are only in use segments', () => {
                let ac = new AudioContext();
                let maxSize = 2;
                let pool = new AudioSegmentPool(ac, ac.createGain(), maxSize);
                for (let i = 0; i < maxSize; i++) {
                    let seg = pool.retrieve();
                    expect(seg).not.toBe(undefined);
                }
                let newMaxSize = 1;
                pool.maxSize = newMaxSize;
                expect(pool.availableSegmentCount).toEqual(0);
                expect(pool.canRetrieve()).toBe(false);
                expect(pool.retrieve()).toBe(undefined);
                expect(warnFn.mock.calls.length).toBe(1);
                expect(warnFn.mock.calls[0][0]).toBe('All segments are currently being used. Returning undefined.');
            });
            it('will let you return the new max size of segments', () => {
                let ac = new AudioContext();
                let maxSize = 5;
                let pool = new AudioSegmentPool(ac, ac.createGain(), maxSize);
                let segmentArr = [];
                for (let i = 0; i < maxSize; i++) {
                    let seg = pool.retrieve();
                    expect(seg).not.toBe(undefined);
                    segmentArr.push(seg);
                }
                let newMaxSize = 1;
                pool.maxSize = newMaxSize;
                expect(pool.canRetrieve()).toBe(false);
                let firstele = segmentArr.shift();
                pool.returnSegment(firstele);
                segmentArr.forEach((seg) => {
                    expect(seg).not.toBe(undefined);
                    pool.returnSegment(seg);
                });
                expect(warnFn.mock.calls.length).toBe(maxSize - newMaxSize);
                expect(warnFn.mock.calls[0][0]).toBe('Unable to add audio segment to pool. Reached max capacity.');
                expect(pool.availableSegmentCount).toEqual(newMaxSize);
            });
        });
    });
});
