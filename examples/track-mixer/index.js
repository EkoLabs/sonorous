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

function buildTrackControls(sonor, trackId) {
    // Create volume listener
    document.getElementById(`${trackId}-volume`).addEventListener('input', (e) => {
        sonor.volume = parseFloat(e.target.value);
    });

    // Create playback listener
    document.getElementById(`${trackId}-playbackrate`).addEventListener('input', (e) => {
        sonor.playbackRate = parseFloat(e.target.value);
    });

    // Create loop listener
    document.getElementById(`${trackId}-loop`).addEventListener('click', () => {
        sonor.loop = !sonor.loop;
    });

    // Create mute listener
    document.getElementById(`${trackId}-mute`).addEventListener('click', () => {
        sonor.muted = !sonor.muted;
    });

    // Create fadeIn listener
    document.getElementById(`${trackId}-fadeIn`).addEventListener('click', () => {
        sonor.fade(1, 1);
    });

    // Create fadeOut listener
    document.getElementById(`${trackId}-fadeOut`).addEventListener('click', () => {
        sonor.fade(0, 1);
    });
}

if (window.Sonorous && window.Sonorous.isSupported()) {
    let trackMap = {
        'track-0': './assets/audio/string_beat.wav',
        'track-1': './assets/audio/electric_beat.wav',
        'track-2': './assets/audio/drum_beat.wav'
    };

    Object.keys(trackMap).forEach((trackId) => {
        let sonor = window.Sonorous.addSonor(trackMap[trackId], { id: trackId, loop: true });
        buildTrackControls(sonor, trackId);
    });

    addMasterControls();
}
