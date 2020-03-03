import BufferCacheItem from '../../../../src/Sonor/BufferCache/BufferCacheItem';
const fakeTask = {
    start: () => {return Promise.resolve([])},
    cancel: jest.fn(),
    bufferPromise: Promise.resolve([])
};
describe('BufferCacheItem', () => {
    describe('general', () => {
        it('throws an error if you do not pass in a url', () => {
            expect(() => new BufferCacheItem()).toThrow('Missing required url');
        });
        it('throws an error if you do not pass in a string url', () => {
            expect(() => new BufferCacheItem({})).toThrow('Url must be a string');
        });
        it('throws an error if you do not pass in a task', () => {
            expect(() => new BufferCacheItem('testing123.mp3')).toThrow('Missing required loading task');
        });
        it('throws an error if you do not pass in a task without a start function', () => {
            expect(() => new BufferCacheItem('testing123.mp3', {})).toThrow('Expected a start function for task');
        });
        it('throws an error if you do not pass in a task without a cancel function', () => {
            expect(() => new BufferCacheItem('testing123.mp3', { start: jest.fn() })).toThrow('Expected a cancel function for task');
        });
        it('throws an error if you do not pass in a task without a request function', () => {
            expect(() => new BufferCacheItem('testing123.mp3', { start: jest.fn(), cancel: jest.fn() })).toThrow('Expected a request property for task');
        });
    });
    describe('ref counting', () => {
        it('has a ref property that starts at 1', () => {
            let b = new BufferCacheItem('test123.mp3', fakeTask);
            expect(b.refs).toBe(1);
        });
        it('increments the ref count as expected', () => {
            let b = new BufferCacheItem('test123.mp3', fakeTask);
            expect(b.refs).toBe(1);
            b.addRef();
            expect(b.refs).toBe(2);
        });
        it('decrements the ref count as expected', () => {
            let b = new BufferCacheItem('test123.mp3', fakeTask);
            expect(b.refs).toBe(1);
            b.addRef();
            expect(b.refs).toBe(2);
            b.removeRef();
            expect(b.refs).toBe(1);
        });
        it('will call cancel if the ref count hits 0', () => {
            let b = new BufferCacheItem('test123.mp3', fakeTask);
            expect(b.refs).toBe(1);
            b.removeRef();
            expect(fakeTask.cancel).toHaveBeenCalledTimes(1);
        });
        it('will fire an event if the ref count hits 0', (done) => {
            let b = new BufferCacheItem('test123.mp3', fakeTask);
            b.on('nomorerefs', (url) => {
                expect(url).toMatch('test123.mp3');
                done();
            });
            expect(b.refs).toBe(1);
            b.removeRef();
        });
        it('does keep track of the ref count if there are multiple increments and decrements', () => {
            let b = new BufferCacheItem('test123.mp3', fakeTask);
            let totalRefs = 1;
            for (let i = 0; i < 10; i++) {
                totalRefs += 1;
                b.addRef();
            }
            expect(b.refs).toBe(totalRefs);
            for (let i = 0; i < 5; i++) { // eslint-disable-line
                totalRefs -= 1;
                b.removeRef();
            }
            expect(b.refs).toBe(totalRefs);
            for (let i = 0; i < 8; i++) {
                totalRefs += 1;
                b.addRef();
            }
            expect(b.refs).toBe(totalRefs);
        });
        it('does not let you add refs to something that has 0 refs', () => {
            let b = new BufferCacheItem('test123.mp3', fakeTask);
            b.removeRef();
            expect(b.refs).toBe(0);
            b.addRef();
            expect(b.refs).toBe(0);
        });
        it('will emit an error if you add refs to something that has 0 refs', (done) => {
            let b = new BufferCacheItem('test123.mp3', fakeTask);
            b.on('error', (e, url) => {
                expect(e.message).toBe('Attempted to add refs after item has been released');
                expect(url).toMatch('test123.mp3');
                done();
            });
            b.removeRef();
            b.addRef();
        });
    });
    describe('state testing', () => {
        it('will return the correct state when the item is first created', () => {
            let b = new BufferCacheItem('test123.mp3', fakeTask);
            expect(b.state).toBe('pending');
        });
        it('will return the correct state after the task finishes', () => {
            let b = new BufferCacheItem('test123.mp3', fakeTask);
            b.startTask();
            return b.bufferPromise.then(() => {
                expect(b.state).toBe('loaded');
            });
        });
        it('will return the correct state if the task fails', () => {
            let mockTask = {
                start: () => { return Promise.reject(new Error('rejecting for some failure')); },
                cancel: jest.fn(),
                bufferPromise: Promise.reject(new Error('rejecting for some failure'))
            };
            let b = new BufferCacheItem('test123.mp3', mockTask);
            b.startTask();
            return b.bufferPromise.catch(() => {
                expect(b.state).toBe('failed');
            });
        });
    });
    describe('retrieving the buffer', () => {
        it('will call start on the task when startTask is called', () => {
            let mockTask = {
                start: jest.fn().mockReturnValue(Promise.resolve([])),
                cancel: jest.fn(),
                bufferPromise: Promise.resolve([])
            };
            let b = new BufferCacheItem('test123.mp3', mockTask);
            b.startTask();
            expect(mockTask.start).toHaveBeenCalledTimes(1);
        });
        it('will return null if the task has not started yet', () => {
            let b = new BufferCacheItem('test123.mp3', fakeTask);
            expect(b.state).toBe('pending');
            expect(b.bufferPromise).toBe(null);
        });
        it('will return a promise if the buffer has not been retrieved yet', () => {
            let b = new BufferCacheItem('test123.mp3', fakeTask);
            expect(b.state).toBe('pending');
            b.startTask();
            expect(typeof b.bufferPromise.then).toBe('function');
        });
    });
});
