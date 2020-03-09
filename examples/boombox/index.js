if (window.Sonorous) {
    const sonor = window.Sonorous.addSonor('./assets/audio/sound1.mp3');
    const playButton = document.getElementById('play');
    playButton.addEventListener('click', () => {
        if (sonor.isPlaying) {
            sonor.pause();
            playButton.innerText = 'Play';
        } else {
            sonor.play();
            playButton.innerText = 'Pause';
        }
    });
    sonor.on('ended', () => {
        playButton.innerText = 'Play';
    });

    const volumeControl = document.getElementById('volume');
    volumeControl.addEventListener('input', () => {
        sonor.volume = parseFloat(volumeControl.value);
    });

    const powerControl = document.getElementById('power');
    powerControl.addEventListener('click', () => {
        if (sonor.isPlaying) {
            sonor.stop();
            powerControl.innerHTML = 'Turn On';
        } else {
            sonor.play();
            powerControl.innerHTML = 'Turn Off';
        }
    });
}
