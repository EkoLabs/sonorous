
<img src="https://eko.engineering/static/media/sonorous_logo.83f6c44b.svg" alt="Sonorous" width="200"/>

# Sonorous.js
Sonorous.js is a JavaScript audio library that streamlines working with web audio, enabling easy audio integration into web apps and games. As an abstraction over the [WebAudio APIs](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API), Sonorous.js offers fine-grained control for those who need it, while handling any cross-browser issues for you.

by the team from [<img src="https://user-images.githubusercontent.com/3951311/86791993-b4c78200-c072-11ea-8936-14db378904a3.png" valign="bottom" width=200 alt="eko Engineering">](https://eko.engineering)

# Table of Contents
* [Examples](#examples)
* [Getting Started](#getting-started)
    * [Installing Sonorous](#installing-sonorous)
    * [Usage](#usage)
* [API](#api)
    * [Sonorous](#sonorous)
    * [Sonor](#sonor)
* [Developing Locally](#developing-locally)
* [Contributing](#contributing)
* [Supported Browsers](#supported-browsers)

# Examples

[Boombox](https://codepen.io/OpherV/pen/xxwRMBw?editors=0100)

[<img src="https://user-images.githubusercontent.com/3951311/81201022-71e32280-8fcd-11ea-9b9d-6adcf7fa6394.png" width=400>](https://codepen.io/OpherV/pen/xxwRMBw?editors=0100)

[Track Mixer](https://codepen.io/OpherV/pen/PoPQwaz?editors=0010)

[<img src="https://user-images.githubusercontent.com/3951311/81200872-3ba5a300-8fcd-11ea-90cf-7de98cacfaf8.png" width=400>](https://codepen.io/OpherV/pen/PoPQwaz?editors=0010)

[String Master](https://codepen.io/OpherV/pen/QWjQbmZ?editors=1100)

[<img src="https://user-images.githubusercontent.com/3951311/86790421-14249280-c071-11ea-91fd-1fe57bb357e7.png" width=400>](https://codepen.io/OpherV/pen/QWjQbmZ?editors=1100)

See the repo's `examples/` directory for the source code.

# Getting Started
## Installing Sonorous.js
To get started, run `npm install --save sonorous`.

To use Sonorous.js, require it or import it into your file.

**ES6**
```
import Sonorous from 'sonorous';
```
**CommonJS**
```
const Sonorous = require('sonorous');
```
## Usage
Sonorous is a manager that handles the addition and removal of sonors. A sonor can be thought of as a wrapper over one audio file. Each sonor has its own functionality, like `play()`, `pause()`, `volume`, etc. You can also set global properties (`masterVolume`, `muteAll`, etc) on all sonors via the Sonorous instance. 

**Example:**
```
let mySonor = Sonorous.addSonor('./test_audio/test_sound_1.mp3');
mySonor.play(); // begins to play test_sound_1.mp3
mySonor.volume = 0.5; // sets the volume of the sonor to 0.5
Sonorous.muteAll = true; // mutes all sonors
mySonor.stop(); // stops the playback of test_sound_1.mp3
```

Please see the [API section](#api) for more details.

# API

## Sonorous
Sonorous is a singleton, and will manage all the Sonor objects.
### **Properties**
#### sonors : `Sonor[]` (read only)
Array of all the Sonor objects added to this manager.

#### ctx : [`AudioContext`](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext) (read only)
Returns the current audio context used by Sonorous.

#### masterVolume : `number`
This is a read/write property and is connected to the masterGain node, that will set the volume for all Sonor objects. Valid values are between 0 and 1.

#### muteAll : `boolean`
This is a read/write property that will mute/unmute all Sonor objects.

### **Methods**
#### isSupported() -> `boolean`
returns true if WebAudio is supported, false if not.

#### addSonor(src, options) -> `Sonor`
creates a Sonor object and returns it, if successful.

| Param           | Type           | Description  |
| :-------------: |:--------------:| :------------|
| src | `string`, `string[]`, [`SonorSrc`](#sonorsrc-object), `SonorSrc[]`  | The media this sound is associated with. If you pass in an array of various formats, it will take the first one that works with the current browser. If your source url does not have an extension, you can specify that manually using the [SonorSrc object](#sonorsrc-object) defined below. |
| options | `object` | Optional configuration object. See options below. |


**Configuration Options for `addSonor()`:**

| Option           | Type           | Default  | Description  |
| :--------------: |:--------------:| :------: | :------------|
| id | `string` | randomly generated | A unique ID. One will be created for this object if you do not pass one in. |
| preload | `boolean` | `true` | Will attempt to load url automatically if true. If false, the calling code must call `load()` explicitly. |
| volume | `number` | `1.0` | The initial volume of the sound. |
| loop | `boolean` | `false` |  Determine if the audio should loop forever. |
| autoplay | `boolean` | `false` | Determine if the audio should play immediately on load. |
| muted | `boolean` | `false` | Mute once loaded. |
| poolSize | `number` | `1` | The total number of audio segments available to play. Increasing this number allows you to start concurrently playing the same sound multiple times, before the initial playthrough has finished.|
| optimizeFor | `string` | `'time'` | Can either be `'time'` or `'memory'`. This determines if the decoded buffer will be cached or not. By default, it will be. If memory is a concern, then set this to 'memory' and expect a small delay while we decode the buffer before playback can begin. |

##### SonorSrc Object
| Property | Type | Description |
| :------: | :--: | :---------: |
| url | `string` | The source url for the audio, without an extension. |
| format | `string` | The manually specified format for this audio source. |

**Example:**
```
let mySonor = Sonorous.addSonor('./test_audio/test_sound_1.mp3', {
    id: 'myFirstSonor', 
    preload: false,
    volume: 0.5,
    poolSize: 3 });

let testSoundSonor = Sonorous.addSonor(
    {
        url: './test_audio/test_sound_2',
        format: 'mp3'
    }, 
    { id: 'test_sound_2'});
```

#### removeSonor(id)
removes a Sonor object from the manager. This will unload and destroy the sound, and immediately stop all processes related to this sound. 

#### reload()
removes any existing sonor objects and resets the audio context.

#### unload()
destroys all Sonor objects

#### get(id) -> `Sonor`
return a Sonor object

**Example:**
```
Sonorous.addSonor('./test_audio/test_sound_1.mp3', { id: 'mySonorId'});
let mySonor = Sonorous.get('mySonorId');
```

#### has(id) -> `boolean`
return true if Sonorous has a Sonor matching the passed in id

### **Events**
#### audioUnlocked
will trigger when the audio is unlocked (via user interaction with the page). Some browsers do not allow playback of audio before a user has interacted with the page in some way. This event will trigger once the audio is free to play.


## Sonor
This module contains most of the functionality for controlling a sound, including adjusting volume, playing, pausing, etc. If the AudioContext has not been unlocked (via a user gesture, etc), all actions will go into a queue. These actions will be immediately executed as soon as the AudioContext is unlocked and the buffer has been loaded.

### **Properties**
#### id : `string` (read only)
A read-only property that returns the unique ID for this sound object. The id is optionally provided during initialization (see [Sonorous's addSonor()](#methods) for more information). If no ID is provided during initialization, a randomly generated alphanumeric string will be assigned as the id. Sonorous can retrieve Sonor objects by id, using the `Sonorous.get(id)` function.

#### url : `string` (read only)
Returns the url for the source audio of this object.

#### preload : `boolean` (read only)
Returns true if the sonor was set to preload during initialization.

#### state : `string` (read only)
Reflects the loaded state of the sonor. Can either be `'loading'`, `'loaded'`, or `'unloaded'`.

**Example:**
```
let mySonor = Sonorous.addSonor('./test_audio/test_sound_1.mp3', { preload: false });
console.log(mySonor.state); // prints out 'unloaded'

mySonor.load();
console.log(mySonor.state); // prints out 'loading'
```
#### duration : `number` (read only)
Returns the duration of the sonor. Note that this value will only be available when a sonor is loaded. If the sonor is unloaded, this will return 0.

#### isPlaying : `boolean` (read only)
Returns true if the sound is currently playing, false if not.

#### playbackPosition : `number` (read only)
Returns how far into playback the sound is. If poolSize > 1, the first active audio segment will be used to return this value.

#### poolSize : `number`
A read/write public property that controls the number of total audio segments in the pool. Increase the size of the pool if you would like to start playing the same sound concurrently. Defaults to 1. 

Once the pool size has increased, the setters/getters will behave as follows: Any setter will be applied to all active segments. Any getter will use the first active audio segment to return the information requested. (An "active segment" is one that has been pulled from the pool already, and is currently in use.)

**Example:**
```
let mySonor = Sonorous.addSonor('./test_audio/test_sound_1.mp3');
mySonor.poolSize = 2;
mySonor.play();
setTimeout(() => { mySonor.play(); }, 1000);  // will result in the same audio being played twice, with the second playback 1s behind the first one.
```
#### playbackRate : `number`
A read/write public property that controls the playback rate of this sound. If poolSize > 1, the first active audio segment will be used to return this value.

#### loop : `boolean`
A read/write public property that controls if the sound will loop or not. When setting this property, it will apply to all active segments.

#### volume : `number`
A read/write public property that controls the volume of this sound. When setting this property, it will apply to all active segments.

#### muted : `boolean`
A read/write public property that controls if the sound is muted or not. When setting this property, it will apply to all active segments.

### **Methods**

#### play()
will play the audio source. If the sonor has not been loaded, it will load the sonor and play once loaded. If the pool of audio segments is greater than 1, then we pull segments from the pool as needed. An "active segment" is one that has been pulled from the pool already, and is currently in use. The logic for play is as follows:
```
if there are no active segments:
    retrieve one from the pool and play it.

if there are active segments:
    if none are currently playing:
        play all active segments
    else:
        retrieve/play a segment from the pool

if there are no available segments in the pool:
    do nothing and report an error
```
#### pause()
will pause all active audio segments, but not return them to the pool.

#### stop()
will stop all active audio segments and return them to the pool.

#### fade(targetVolume, fadeDuration, [startTime])
will fade the audio from the current volume to the targetVolume, for the fade duration provided. If a startTime is provided and is greater than the audioContext's current time, the fade will start at that point. Otherwise, it will start immediately. The fade duration should be in terms of seconds.

#### seek(newTime)
will move playback to the time passed in (in seconds).

#### load()
will load the buffer and prepare an audio segment for playback. 

#### unload()
will remove the buffer and return all active audio segments to the pool.

#### on(eventName, callbackFn)
The Sonor object is an event emitter (on/off/once). See the list of available events below.

#### off(eventName, callbackFn)

#### once(eventName, callback)

### **Events**
#### 'loaded'
Will trigger when the sound is loaded

| Param | Type | Description |
|:-----:|:----:|:-----------:|
| sonorObj | Sonor | The instance of Sonor that was operated on |


#### 'play'
Will trigger when play begins

| Param | Type | Description |
|:-----:|:----:|:-----------:|
| sonorObj | Sonor | The instance of Sonor that was operated on |


#### 'pause'
Will trigger when the sound pauses

| Param | Type | Description |
|:-----:|:----:|:-----------:|
| sonorObj | Sonor | The instance of Sonor that was operated on |


#### 'stop'
Will trigger when the sound stops playing

| Param | Type | Description |
|:-----:|:----:|:-----------:|
| sonorObj | Sonor | The instance of Sonor that was operated on |


#### 'ended'
Will trigger when the sound reaches the end of its duration

| Param | Type | Description |
|:-----:|:----:|:-----------:|
| sonorObj | Sonor | The instance of Sonor that was operated on |


#### 'seeked'
Will trigger when the currentTime has been changed manually

| Param | Type | Description |
|:-----:|:----:|:-----------:|
| sonorObj | Sonor | The instance of Sonor that was operated on |
| seekPosition | Number | Timecode that the Sonor seeked to |


#### 'volumechanged'
Will trigger when the sound volume changes (via volume or mute)

| Param | Type | Description |
|:-----:|:----:|:-----------:|
| sonorObj | Sonor | The instance of Sonor that was operated on |
| newVolume | Number | The new volume that the Sonor was set to |


#### 'playbackratechanged'
Will trigger when the playback rate changes

| Param | Type | Description |
|:-----:|:----:|:-----------:|
| sonorObj | Sonor | The instance of Sonor that was operated on |
| newPlaybackRate | Number | The new playback rate that the Sonor was set to |


#### 'fadefinished'
Will trigger when the fade ends

| Param | Type | Description |
|:-----:|:----:|:-----------:|
| sonorObj | Sonor | The instance of Sonor that was operated on |


#### 'error'
Will trigger if any error occurs during a Sonor operation

| Param | Type | Description |
|:-----:|:----:|:-----------:|
| sonorObj | Sonor | The instance of Sonor that was operated on |
| error | String | Error message |


# Developing Locally
Once you have the repo locally, run `yarn install` to install dependencies.
* `npm run build` will build unminified versions of Sonorous.
* `npm run build:production` will build minified and gzipped versions of Sonorous.
* `npm run start-dev` will build unminified Sonorous and open a simple html page with audio controls. You can manually test most of the Sonorous functionality through there.
* `npm run test` will run all unit tests. (Unit tests are written using [Jest](https://jestjs.io/docs/en/getting-started))

# Contributing
We actively welcome pull requests and proposed changes to the code base. Please follow these steps when contributing.
1. Please fork and branch from `develop`, and follow the [Developing Locally](#developing-locally) guide to get buildable. 
2. Comment your code extensively, and update the README when expected.
3. Add unit tests where applicable.
4. All existing testing suites must pass and no linter errors should occur.

# Supported Browsers
Sonorous is supported wherever WebAudio is. Click [here](https://caniuse.com/#search=webaudio) for a full list.
