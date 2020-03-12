function createVolumeListener(id) {
    let element = document.getElementById(`${id}-volume`);
    element.addEventListener('input', () => {
        window.Sonorous.get(id).volume = parseFloat(element.value);
    });
}

function createPlaybackListener(id) {
    let element = document.getElementById(`${id}-playbackrate`);
    element.addEventListener('input', () => {
        window.Sonorous.get(id).playbackRate = parseFloat(element.value);
    });
}

function createLoopListener(id) {
    let element = document.getElementById(`${id}-loop`);
    element.addEventListener('click', () => {
        let sonor = window.Sonorous.get(id);
        sonor.loop = !sonor.loop;
    });
}

function createMuteListener(id) {
    let element = document.getElementById(`${id}-mute`);
    element.addEventListener('click', () => {
        let sonor = window.Sonorous.get(id);
        sonor.muted = !sonor.muted;
    });
}

function createFadeInListener(id) {
    let element = document.getElementById(`${id}-fadeIn`);
    element.addEventListener('click', () => {
        let sonor = window.Sonorous.get(id);
        sonor.fade(1, 1);
    });
}

function createFadeOutListener(id) {
    let element = document.getElementById(`${id}-fadeOut`);
    element.addEventListener('click', () => {
        let sonor = window.Sonorous.get(id);
        sonor.fade(0, 1);
    });
}

function addMasterControls() {
    document.getElementById('play-btn').addEventListener('click', () => {
        window.Sonorous.sonors.forEach((sonor) => {
            sonor.play();
        });
    });

    document.getElementById('stop-btn').addEventListener('click', () => {
        window.Sonorous.sonors.forEach((sonor) => {
            sonor.stop();
        });
    });

    document.getElementById('mute-btn').addEventListener('click', () => {
        window.Sonorous.muteAll = !window.Sonorous.muteAll;
    });

    let masterVolControl = document.getElementById('master-volume');
    masterVolControl.addEventListener('input', () => {
        window.Sonorous.masterVolume = parseFloat(masterVolControl.value);
    });
}

function buildTrackControls(trackId) {
    createVolumeListener(trackId);
    createPlaybackListener(trackId);
    createLoopListener(trackId);
    createMuteListener(trackId);
    createFadeInListener(trackId);
    createFadeOutListener(trackId);
}

if (window.Sonorous && window.Sonorous.isSupported()) {
    let trackMap = {
        'track-0': './assets/audio/string_beat.wav',
        'track-1': './assets/audio/electric_beat.wav',
        'track-2': './assets/audio/drum_beat.wav'
    };

    Object.keys(trackMap).forEach((trackId) => {
        window.Sonorous.addSonor(trackMap[trackId], { id: trackId, loop: true });
        buildTrackControls(trackId);
    });

    addMasterControls();
}
