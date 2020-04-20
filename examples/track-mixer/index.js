

// UI logic

let progressInput = document.querySelector("#master-progress");
let timeElapsed = document.querySelector(".timeElapsed");
let timeLeft = document.querySelector(".timeLeft");

function addMasterControls() {
    // master volume
    setupRadialSlider(document.querySelector(`#master .volumeContainer`),
        value =>  { window.Sonorous.masterVolume = value });

    // play
    document.getElementById('play-btn').addEventListener('click', () => {
        window.Sonorous.sonors.forEach((sonor) => {
            sonor.play();
        });
    });

    // stop
    document.getElementById('stop-btn').addEventListener('click', () => {
        window.Sonorous.sonors.forEach((sonor) => {
            sonor.stop();
        });
    });

    // loop
    document.getElementById(`master-loop`).addEventListener('click', e => {
        Sonorous.sonors.forEach(sonor => sonor.loop = !sonor.loop);
        e.currentTarget .classList.toggle("active");
    });

    //master mute
    document.getElementById('master-mute').addEventListener('click', () => {
        window.Sonorous.muteAll = !window.Sonorous.muteAll;
    });


    // Create playback listener
    // let masterPlaybackRate = document.getElementById(`global-playbackrate`);
    // masterPlaybackRate.addEventListener('input', () => {
    //     window.Sonorous.sonors.forEach((sonor) => {
    //         sonor.playbackRate = parseFloat(masterPlaybackRate.value);
    //     });
    // });


    let progressSonor = Sonorous.get('track-vocals');
    // update progress on playback
    setInterval(()=>{
        if (progressSonor.isPlaying && progressSonor.duration !== 0) {
            let currentTime = progressSonor.playbackPosition;
            let percentComplete = currentTime / progressSonor.duration;
            updateProgressUI(percentComplete, progressSonor.duration);
        } else {
            updateProgressUI(0, null);
        }
    }, 100);

    // progress bar seeking
    progressInput.addEventListener('change', e=>{
        let newValue = e.currentTarget.value;
        if (progressSonor.isPlaying) {
            Sonorous.sonors.forEach(sonor => {
                sonor.seek(sonor.duration * newValue / 100)
            })
        }
    });

}

function setupTrackControls(sonor, trackId) {
    // Create volume listener
    setupRadialSlider(document.getElementById(`${trackId}`),
        // volume is 0-11, map it to 0-1
        value =>  { sonor.volume = value/11 });

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

function setupRadialSlider(parentElement, onChange) {
    let input = parentElement.querySelector('input[type=range]');
    let knobJog = parentElement.querySelector('.jogContainer');
    let barActive = parentElement.querySelector('.barActive');
    let text = parentElement.querySelector('.dotDisplay');
    knob(input, knobJog, {
        rangeInDegrees: 270,
        rangeStartDegree: 220,
        onUpdate: value => {
            let degrees = value / 11 * 270 + 220;
            knobJog.style.transform = `rotate(${degrees}deg)`;
            // this magic number is the path length. Why recalculate it when it's constant?
            barActive.style.strokeDashoffset = (1 - value / 11) * 191;
            text.innerHTML = value.toFixed(1);
            onChange(value);
        }
    });
}



function updateProgressUI(percentComplete, duration){
    let timeElapsedNumber;
    let timeLeftNumber;
    if (duration) {
        // luckily our audio demo is shorter than one minute
        timeElapsedNumber = String(parseInt(percentComplete * duration)).padStart(2, '0');
        timeLeftNumber = String(parseInt(duration - duration * percentComplete)).padStart(2, '0');
        timeElapsed.innerHTML = `00:${timeElapsedNumber}`;
        timeLeft.innerHTML = `-00:${timeLeftNumber}`;
    } else {
        timeElapsed.innerHTML  = '--:--';
        timeLeft.innerHTML = '--:--';
    }

    progressInput.style.setProperty('--progress-percent', `${percentComplete*100}%`);
}

if (window.Sonorous && window.Sonorous.isSupported()) {
    let trackMap = {
        'track-vocals': './assets/audio/Tillian_Reborn_Vocals.mp3',
        'track-guitars': './assets/audio/Tillian_Reborn_Guitars.mp3',
        // 'track-keys': './assets/audio/Tillian_Reborn_Keys.mp3',
        // 'track-cello': './assets/audio/Tillian_Reborn_Cello.mp3',
        // 'track-drums': './assets/audio/Tillian_Reborn_Drums.mp3',
    };

    Object.keys(trackMap).forEach((trackId) => {
        let sonor = window.Sonorous.addSonor(trackMap[trackId], { id: trackId });
        setupTrackControls(sonor, trackId);
    });

    addMasterControls();
}
