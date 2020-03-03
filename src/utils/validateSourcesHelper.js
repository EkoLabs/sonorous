import FORMAT_TO_MIMETYPE_CODEC from '../utils/formatMap';

/**
 * Takes in whatever was passed in as the source url and formats it to an array of SonorSrc objects
 *
 * @param {string|string[]|SonorSrc|SonorSrc[]} srcArray
 * @returns {SonorSrc[]} an array of formatted SonorSrc objects
 * @memberof Sonor
 */
function normalizeSrc(srcArray) {
    // If only one src was passed in, turn it into an array
    if (!Array.isArray(srcArray)) {
        srcArray = [srcArray];
    }

    // Turn the array into an array of SonorSrc objects
    return srcArray.map(function(val) {
        let formattedSrc = {};

        // If there already is a url property and a format, then include the object in the array as is
        if (val.url && val.format) {
            // Remove the period if one is at the end of the url
            if (val.url[val.url.length - 1] === '.') {
                val.url = val.url.slice(0, -1);
            }

            // Remove the period if there is one at the beginning of the format
            if (val.format[0] === '.') {
                val.format = val.format.slice(1, -1);
            }
            formattedSrc = val;
        } else {
            // Else, turn val into a 'SonorSrc' object with a url and a format
            let url = val.url ? val.url : val;
            let urlExtension = url.split('.').pop();
            let urlWithoutExtension = url.substr(0, url.lastIndexOf('.')) || url;
            formattedSrc.url = urlWithoutExtension;
            formattedSrc.format = urlExtension;
        }
        return formattedSrc;
    });
}

/**
 * Validates that the src has a valid extension that is supported by this library
 *
 * @param {SonorSrc} src
 * @returns {boolean} true if it is supported, false if it isn't
 * @memberof Sonor
 */
function isValidSrc(src) {
    if (!src || !src.format || !src.url) {
        return false;
    }

    let mimeTypesAndCodecs = FORMAT_TO_MIMETYPE_CODEC[src.format];

    // Didn't find a specified mime type/codec for this format. Can't play it.
    if (!mimeTypesAndCodecs) {
        return false;
    }
    let foundCodec = mimeTypesAndCodecs.find((val) => {
        // Check to see if the audio file is playable with the current browser
        let audio = new Audio();
        let canPlay = audio.canPlayType(val);
        return (canPlay === 'probably' || canPlay === 'maybe');
    });
    return foundCodec !== undefined;
}


/**
 * Iterates through the list of sources and returns the first valid source.
 *
 * @param {SonorSrc[]} srcArray
 * @returns {SonorSrc} the first valid source, or undefined if there isn't one
 * @memberof Sonor
 */
function chooseValidURL(srcArray) {
    let validSonorSrc = srcArray.find((val) => isValidSrc(val));
    if (validSonorSrc) {
        return validSonorSrc.url + '.' + validSonorSrc.format;
    }
    return undefined;
}

export default { normalizeSrc, isValidSrc, chooseValidURL };
