import '../../__mocks__/AudioContext.mock';
import MockedAxiosDownloadTask from './__mocks__/AxiosDownloadTask.js';
import EncodedBufferCache from '../../../../src/Sonor/BufferCache/EncodedBufferCache';
jest.mock('../../../../src/Sonor/BufferCache/AxiosDownloadTask', () => {
    return function() {
        return new MockedAxiosDownloadTask();
    };
});

describe('EncodedBufferCache', () => {
    it('is a singleton', () => {
        let downloadMgr = EncodedBufferCache.instance;
        let downloadMgr2 = EncodedBufferCache.instance;
        expect(downloadMgr).toEqual(downloadMgr2);
    });

    it('does return a promise for download tasks', () => {
        let downloadMgr = EncodedBufferCache.instance;
        let promise = downloadMgr.getEncodedBuffer('test.mp3');
        expect(typeof promise.then === 'function').toBe(true);
    });

    it('does cache requests', () => {
        let downloadMgr = EncodedBufferCache.instance;
        let promise = downloadMgr.getEncodedBuffer('test1.mp3');
        let p2 = downloadMgr.getEncodedBuffer('test1.mp3');
        expect(promise).toStrictEqual(p2);
    });

    it('does cancel a request', (done) => {
        let downloadMgr = EncodedBufferCache.instance;
        let promise = downloadMgr.getEncodedBuffer('test2.mp3');
        downloadMgr.removeRef('test2.mp3');
        promise.then((res) => {
            expect(res).toBe(undefined);
            expect(downloadMgr._bufferCache['test2.mp3']).toBe(undefined);
            done();
        });
    });

    it('does remove a buffer from the cache', (done) => {
        let downloadMgr = EncodedBufferCache.instance;
        let promise = downloadMgr.getEncodedBuffer('test3.mp3');
        promise.then(() => {
            expect(downloadMgr._bufferCache['test3.mp3']).not.toBe(undefined);
            downloadMgr.removeRef('test3.mp3');
            expect(downloadMgr._bufferCache['test3.mp3']).toBe(undefined);
            done();
        });
    });
});
