if (Sonorous && Sonorous.isSupported()) {
    const sonor = window.Sonorous.addSonor('https://eko.com/s/sonorous/demos/boombox/Tillian_Frozen_Sun.mp3');

    const boombox = document.querySelector('.boombox');
    const playButton = document.querySelector('.play');
    const volumeinput = document.querySelector('.volumeContainer input');
    const volumeDial = document.querySelector('.dial');
    const powerControl = document.querySelector('.power');

    playButton.addEventListener('click', () => {
        if (boombox.classList.contains('active')) {
            if (sonor.isPlaying) {
                sonor.pause();
                boombox.classList.remove("playing");
            } else {
                sonor.play();
                boombox.classList.add("playing");
            }
        }
    });

    sonor.on('ended', () => {
        boombox.classList.remove("playing");
    });


    knob(volumeinput, volumeDial, {
        rangeInDegrees: 270,
        rangeStartDegree: 220,
        onUpdate: value => {
            sonor.volume = value;
            let degrees = value * 270 + 40;
            volumeDial.style.transform = `rotate(${degrees}deg)`;
        }
    });

    powerControl.addEventListener('click', () => {
        if (boombox.classList.contains('active')) {
            if (sonor.isPlaying) {
                sonor.stop();
                boombox.classList.remove('playing')
            }

            boombox.classList.remove('active')
        } else {
            boombox.classList.add('active')
        }
    });

}
