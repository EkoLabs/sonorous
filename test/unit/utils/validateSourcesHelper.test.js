import validateSourcesHelper from '../../../src/utils/validateSourcesHelper';

describe('validateSourcesHelper', () => {
    beforeAll(() => {
        jest.spyOn(Audio.prototype, 'canPlayType').mockReturnValue('probably');
    });
    describe('src formatting', () => {
        it('converts from string to SonorSrc object', () => {
            let testInput = 'test.mp3';
            let normalizedOutput = validateSourcesHelper.normalizeSrc(testInput);
            expect(normalizedOutput).toEqual([{ url: 'test', format: 'mp3' }]);
        });

        it('does not modify SonorSrc input', () => {
            let testInput = { url: 'test', format: 'mp3' };
            let normalizedOutput = validateSourcesHelper.normalizeSrc(testInput);
            expect(normalizedOutput).toEqual([testInput]);
        });

        it('formats multiple src objects correctly', () => {
            let testInput = [
                'test.mp3',
                { url: 'test2', format: 'mp3' },
                'test3.ogg',
                { url: 'test3', format: 'mp4' }
            ];
            let expectedNormalizedOutput = [
                { url: 'test', format: 'mp3' },
                { url: 'test2', format: 'mp3' },
                { url: 'test3', format: 'ogg' },
                { url: 'test3', format: 'mp4' }
            ];
            let normalizedOutput = validateSourcesHelper.normalizeSrc(testInput);
            expect(normalizedOutput).toEqual(expectedNormalizedOutput);
        });
    });

    describe('src validation', () => {
        it('will return false if there is no format', () => {
            let testInput = 'test';
            let isValid = validateSourcesHelper.isValidSrc(testInput);
            expect(isValid).toBe(false);

            testInput = { url: 'test', format: '' };
            isValid = validateSourcesHelper.isValidSrc(testInput);
            expect(isValid).toBe(false);
        });

        it('will handle unexpected input correctly', () => {
            let testInput = [null, undefined, '', {}, []];
            testInput.forEach(input => {
                let isValid = validateSourcesHelper.isValidSrc(input);
                expect(isValid).toBe(false); 
            });
        });

        it('will return false if there is no url', () => {
            let testInput = { format: 'mp4' };
            let isValid = validateSourcesHelper.isValidSrc(testInput);
            expect(isValid).toBe(false);
        });

        it('will return true if there is a valid sonorsrc passed in', () => {
            let testInput = { url: 'test', format: 'mp3' };
            let isValid = validateSourcesHelper.isValidSrc(testInput);
            expect(isValid).toBe(true);
        });
    });

    describe('src choosing', () => {
        it('chooses the first valid src', () => {
            let testInput = [
                '',
                'test.mp3',
                { url: 'test2', format: 'mp3' },
                'test3.ogg',
                { url: 'test3', format: 'mp4' }
            ];
            let normalizedOutput = validateSourcesHelper.normalizeSrc(testInput);
            let validURL = validateSourcesHelper.chooseValidURL(normalizedOutput);
            expect(validURL).toBe('test.mp3');
        });

        it('returns undefined if there is no valid src', () => {
            let testInput = [];
            let validURL = validateSourcesHelper.chooseValidURL(testInput);
            expect(validURL).toBe(undefined);
        });
    });

});
