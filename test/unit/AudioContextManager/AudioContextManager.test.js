import '../__mocks__/AudioContext.mock';
import AudioContextManager from '../../../src/AudioContextManager/AudioContextManager';

describe('AudioContextManager', () => {
    beforeAll(() => {
        // Disable console logs for unit tests
        window.console.log = () => {};
    });
    it('is a singleton', () => {
        let audioContextMgr = AudioContextManager.instance;
        let audioContextMgr2 = AudioContextManager.instance;
        expect(audioContextMgr2).toBe(audioContextMgr);
    });
    it('creates a new audio context', () => {
        let audioContextMgr = AudioContextManager.instance;
        let origContext = audioContextMgr.context;
        audioContextMgr.createAudioContext();
        let newContext = audioContextMgr.context;
        expect(origContext).not.toBe(newContext);
    });
});
