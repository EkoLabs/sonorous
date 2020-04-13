let clickSonor;
if (window.Sonorous && window.Sonorous.isSupported()) {
    clickSonor = window.Sonorous.addSonor('./assets/audio/chime_sound_effect.mp3', {
        id: 'click_sound',
        poolSize: 10
    });
}

function generateClickableDiv() {
    let outerContainer = document.getElementById('main');
    let maxWidth = outerContainer.offsetWidth - 100;
    let maxHeight = outerContainer.offsetHeight - 100;
    let newDiv = document.createElement('div');
    let width = Math.random() * maxWidth;
    let height = Math.random() * maxHeight;

    newDiv.style.left = `${width}px`;
    newDiv.style.top = `${height}px`;
    newDiv.style.background = `rgb(${Math.random() * 255.0}, ${Math.random() * 255.0}, ${Math.random() * 255.0})`; // eslint-disable-line
    newDiv.className = 'clickable';
    document.getElementById('main').appendChild(newDiv);
    let clickListener = function() {
        if (clickSonor) {
            clickSonor.play();
        }
        newDiv.className += ' ripple rippleEffect';
    };

    newDiv.addEventListener('click', clickListener);

    setTimeout(function() {
        newDiv.removeEventListener('click', clickListener);
        newDiv.remove();
        newDiv = null;
    }, 1500); // eslint-disable-line
}

setInterval(generateClickableDiv, 1000);
