

// UI logic

let progressInput = document.querySelector("#master-progress");
let timeElapsed = document.querySelector(".timeElapsed");
let timeLeft = document.querySelector(".timeLeft");

function addMasterControls() {
    // master volume
    setupRadialSlider(document.querySelector(`#master .volumeContainer`),
        // volume is 0-11, map it to 0-1
        value =>  { Sonorous.masterVolume = value/11 });

    setupRadialSlider(document.querySelector(`#master .rateContainer`),
        // rate is 0.5 to 2
        value =>  {
            Sonorous.sonors.forEach(sonor =>  sonor.playbackRate = value);
        });

    // play
    document.getElementById('play-btn').addEventListener('click', e => {
        let isPlaying = e.currentTarget.classList.contains('active');
        if (isPlaying) {
            e.currentTarget.classList.remove('active');
            Sonorous.sonors.forEach(sonor => {
                sonor.pause();
            });
        } else {
            e.currentTarget.classList.add('active');
            Sonorous.sonors.forEach(sonor => {
                sonor.play();
                sonor.volume = parseFloat(document.getElementById(`${sonor.id}-volume`).value) / 11;
            });
        }
    });

    // stop
    document.getElementById('stop-btn').addEventListener('click', () => {
        document.querySelector("#play-btn").classList.remove('active');
        Sonorous.sonors.forEach( sonor => {
            sonor.stop();
        });
    });

    // loop
    document.getElementById(`master-loop`).addEventListener('click', e => {
        Sonorous.sonors.forEach(sonor => sonor.loop = !sonor.loop);
        e.currentTarget .classList.toggle('active');
    });

    //master mute
    document.getElementById('master-mute').addEventListener('click', () => {
        Sonorous.muteAll = !Sonorous.muteAll;
    });

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
        // when other tracks are soloed, mute has no immediate effect
        if (getSoloToggles().length == 0) {
            sonor.muted = !sonor.muted;
        }
    });

    // Create solo listener
    document.getElementById(`${trackId}-solo`).addEventListener('click', () => {
        //get an array of track ids for all checked solo toggles
        let soloToggles = getSoloToggles();

        // we have at least one soloed track, ignore mutes
        if (soloToggles.length > 0){
            Sonorous.sonors.forEach(sonor => sonor.muted = !soloToggles.includes(sonor.id));
        } else {
        // no soloed track, revert mute status
            Sonorous.sonors.forEach(
                sonor => sonor.muted = document.querySelector(`#${sonor.id}-mute:checked`) !== null
            );
        }
    });


    // Create fadeIn listener
    document.getElementById(`${trackId}-fadeIn`).addEventListener('click', () => {
        let volumeInput = document.getElementById(`${trackId}-volume`);
        let fadeStartTime = Date.now();
        let fadeStartVolume = sonor.volume;

        // we want to update the knobs with the fade
        // note: this is a temp hacky way
        let fadeInterval = setInterval(()=>{
            let volumePercent = (Date.now() - fadeStartTime) / 1000;
            if(volumePercent >= 0 && volumePercent <= 1){
                volumeInput.value = fadeStartVolume * 11 + volumePercent * ( 10 - fadeStartVolume * 11);
                volumeInput.dispatchEvent(new Event('change'));
            } else if (volumePercent >= 0) {
                volumeInput.value = 10;
                volumeInput.dispatchEvent(new Event('change'));
                clearInterval(fadeInterval)
            }

        }, 30);

        sonor.fade(10/11, 1);
    });

    // Create fadeOut listener
    document.getElementById(`${trackId}-fadeOut`).addEventListener('click', () => {
        let volumeInput = document.getElementById(`${trackId}-volume`);
        let fadeStartTime = Date.now();
        let fadeStartVolume = sonor.volume;

        // we want to update the knobs with the fade
        // note: this is a temp hacky way
        let fadeInterval = setInterval(()=>{
            let volumePercent = 1 - (Date.now() - fadeStartTime) / 1000;
            if(volumePercent >= 0 && volumePercent <= 1){
                volumeInput.value = volumePercent * fadeStartVolume * 11;
                volumeInput.dispatchEvent(new Event('change'));
            } else if (volumePercent < 0) {
                volumeInput.value = 0;
                volumeInput.dispatchEvent(new Event('change'));
                clearInterval(fadeInterval)
            }

        }, 30);
    });

    sonor.fade(0, 1);
}

function setupRadialSlider(parentElement, onChange) {
    let input = parentElement.querySelector('input[type=range]');
    let knobJog = parentElement.querySelector('.jogContainer');
    let barActive = parentElement.querySelector('.barActive');
    let text = parentElement.querySelector('.dotDisplay');

    let rangeStart = parseFloat(input.getAttribute("min"));
    let rangeEnd = parseFloat(input.getAttribute("max"));

    knob(input, knobJog, {
        rangeInDegrees: 270,
        rangeStartDegree: 220,
        onUpdate: value => {
            let progress = (value - rangeStart) / (rangeEnd - rangeStart);
            let degrees = progress * 270 + 220;
            knobJog.style.transform = `rotate(${degrees}deg)`;
            // this magic number is the path length. Why recalculate it when it's constant?
            barActive.style.strokeDashoffset = (1 - progress) * 191;
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

// returns an array of track ids for all checked solo toggles
function getSoloToggles(){
    return Array.from(document.querySelectorAll('input[id$="solo"]:checked'))
        .map(el => el.id.substring(0, el.id.length-5));
}

if (Sonorous && Sonorous.isSupported()) {
    let trackMap = {
        'track-vocals': 'https://eko.com/s/sonorous/demos/track_mixer/Tillian_Reborn_Vocals.mp3',
        'track-guitars': 'https://eko.com/s/sonorous/demos/track_mixer/Tillian_Reborn_Guitars.mp3',
        'track-keys': 'https://eko.com/s/sonorous/demos/track_mixer/Tillian_Reborn_Keys.mp3',
        'track-cello': 'https://eko.com/s/sonorous/demos/track_mixer/Tillian_Reborn_Cello.mp3',
        'track-drums': 'https://eko.com/s/sonorous/demos/track_mixer/Tillian_Reborn_Drums.mp3',
    };

    Object.keys(trackMap).forEach((trackId) => {
        let sonor = Sonorous.addSonor(trackMap[trackId], { id: trackId });
        setupTrackControls(sonor, trackId);
    });

    addMasterControls();
}
