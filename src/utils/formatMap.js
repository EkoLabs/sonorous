// eslint-disable-next-line no-unused-vars
const FORMAT_TO_MIMETYPE_CODEC = {
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
    webm: ['audio/webm; codecs="vorbis"'],
    dolby: ['audio/mp4; codecs="ec-3"'],
    flac: ['audio/x-flac;', 'audio/flac']
};
export default FORMAT_TO_MIMETYPE_CODEC;
