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

    // Create playback listener
    let masterPlaybackRate = document.getElementById(`global-playbackrate`);
    masterPlaybackRate.addEventListener('input', () => {
        window.Sonorous.sonors.forEach((sonor) => {
            sonor.playbackRate = parseFloat(masterPlaybackRate.value);
        });
    });
}

function buildTrackControls(sonor, trackId) {
    // Create volume listener
    document.getElementById(`${trackId}-volume`).addEventListener('input', (e) => {
        sonor.volume = parseFloat(e.target.value);
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
    setInterval(() => {
        if (sonor.isPlaying) {
            let currentTime = sonor.playbackPosition;
            if (sonor.duration !== 0) {
                let percentComplete = currentTime / sonor.duration;
                let totalWidth = document.getElementById(`${trackId}-time-scrubber`).offsetWidth;
                let width = totalWidth * percentComplete;
                document.getElementById(`${trackId}-time-handle`).style.width = `${width}px`;
                document.getElementById(`${trackId}-timecode`).innerHTML = currentTime.toFixed(2);
            }
        }
    }, 100);
}

if (window.Sonorous && window.Sonorous.isSupported()) {
    let trackMap = {
        'track-vocals': './assets/audio/Tillian_Reborn_Vocals.mp3',
        'track-guitars': './assets/audio/Tillian_Reborn_Guitars.mp3',
        'track-keys': './assets/audio/Tillian_Reborn_Keys.mp3',
        'track-cello': './assets/audio/Tillian_Reborn_Cello.mp3',
        'track-drums': './assets/audio/Tillian_Reborn_Drums.mp3',
    };

    Object.keys(trackMap).forEach((trackId) => {
        let sonor = window.Sonorous.addSonor(trackMap[trackId], { id: trackId, loop: true });
        buildTrackControls(sonor, trackId);
    });

    addMasterControls();
}
