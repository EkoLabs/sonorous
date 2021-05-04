import env from './environment';

let browser = env.browser;
let os = env.os;
let isSafariOriOS = browser.indexOf('safari') >= 0 || os === 'ios';

// eslint-disable-next-line no-unused-vars
let FORMAT_TO_MIMETYPE_CODEC = {
    mp3: ['audio/mp3;'],
    opus: ['audio/ogg; codecs="opus"'],
    ogg: ['audio/ogg; codecs="vorbis"'],
    oga: ['audio/ogg; codecs="vorbis"'],
    wav: ['audio/wav; codecs="1"'],
    aac: ['audio/aac;'],
    caf: ['audio/x-caf;'],
    m4a: ['audio/x-m4a;', 'audio/m4a;', 'audio/aac;'],
    mp4: ['audio/x-mp4;', 'audio/mp4;', 'audio/aac;'],
    weba: ['audio/webm; codecs="vorbis"'],
    dolby: ['audio/mp4; codecs="ec-3"'],
    flac: ['audio/x-flac;', 'audio/flac']
};

// Bug fix - on Big Sur Safari v14.1, this comes up as supported ("probably"), but then decode fails.
// Let's disable webm_vorbis on all Safari and iOS devices.
if (!isSafariOriOS) {
    FORMAT_TO_MIMETYPE_CODEC.webm = ['audio/webm; codecs="vorbis"'];
}

export default FORMAT_TO_MIMETYPE_CODEC;
