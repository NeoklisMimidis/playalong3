'use strict';

//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

// Get the values of the URL parameters
const urlParams = new URLSearchParams(window.location.search);
const fileParam = urlParams.get('f');
const userParam = urlParams.get('user');
const courseParam = urlParams.get('course');
const collabParam = urlParams.get('collab');
const idParam = urlParams.get('id');
var privParam = urlParams.get('priv');
const uidParam = urlParams.get('uid');
const lessonParam = urlParams.get('lesson');

initRepositoryTrackList(courseParam, collabParam);

var recAsBackingTrack = {
  hasBeenSet: false,
  recName: null,
};

const baseUrl =
  window.location.hostname === 'localhost'
    ? 'http://localhost:5500'
    : 'https://musicolab.hmu.gr:8080';

//const deletedUserImageSrc = `${baseUrl}/images/deletedUser.svg`;

//turn into global variables and move to global_variables.js?
let otherUserRecording;
var bTeditor;

// Create an instance of wavesurfer for the microphone animation
var wavesurfer_mic = WaveSurfer.create({
  container: '#waveform_mic',
  waveColor: '#000',
  progressColor: '#fff',
  backgroundColor: '#fee',
  cursorWidth: 0,
  height: 50,
  plugins: [
    WaveSurfer.microphone.create({
      bufferSize: 4096,
      numberOfInputChannels: 1,
      numberOfOutputChannels: 1,
    }),
  ],
});

var firstWaveform = true;
var volume = 1;

var count = 1;
var speedMatrix = [];
var speedMatrixRatio = [];
var speed = 100;
var speed01 = 1;
window.speed01 = 1;
window.tempo = 90;
speedMatrix[0] = 1;

// Jitsi room parameters
var Jitsi_User_Name = 'test-user';
if (userParam) {
  Jitsi_User_Name = userParam;
}

var JitsiRoomName
if (courseParam && lessonParam) 
  JitsiRoomName = `${lessonParam}-${courseParam}`;
else
  JitsiRoomName = fileParam ?? 'musicolab_default'

var roomNameInput = document.querySelector('#meet-room');
roomNameInput.value = JitsiRoomName;

var Collab = false;
if (collabParam === 'true') {
  Collab = true;
}

if (!Collab)
  document
    .querySelector('.users-online-container')
    .setAttribute('hidden', true);

var wavesurfers = []; // Array to hold all wavesurfers instances from recordings
var recordedBlobs = []; // Array to hold all the recorded blobs
var selectedBlobs = []; // Array to hold all blobs to be mixed
var recordedBuffers = []; // Array to hold all PCM audio recordings
var selectedBuffers = []; // Array to hold all PCM audio recordings to be mixed
var noRecordings = 0; // Holds how many are the audio recordings
// var sampleRate = 44100; // this will hold the sample rate used for recordings --> see some lines below

// shim for AudioContext when it's not avb.
//var AudioContext = window.AudioContext || window.webkitAudioContext;
/*
  Note on Audio Sample Rate in Browsers:
  
  Web browsers typically use the audio sample rate of the local operating system's 
  audio interface for both audio playback and recording. 
*/
var audioContext = new AudioContext();
var sampleRate = audioContext.sampleRate;

var recordButton = document.getElementById('recordButton');
var stopButton = document.getElementById('stopButton');
var pauseButton = document.getElementById('pauseButton');
var playPauseAllButton = document.getElementById('playpauseallButton');
var playAllButton = document.getElementById('playallButton');
var pauseAllButton = document.getElementById('pauseallButton');
var stopAllButton = document.getElementById('stopallButton');
var combineSelectedButton = document.getElementById('combineselectedButton');

var waveform_micContainer = document.getElementById('waveform_mic');

playPauseAllButton.addEventListener('click', playpauseAll);
stopAllButton.addEventListener('click', stopAll);
combineSelectedButton.addEventListener('click', combineSelected);

//playAllButton.addEventListener("click", playAll);
//pauseAllButton.addEventListener("click", pauseAll);

// function to adjust playback speed for backing track and all recordings
function setPlaybackSpeed(s) {
  //let i = speedMatrix.length;
  //console.log("speedMatrix holds",i,"values");
  speed = s;
  speed01 = s / 100;
  window.speed01 = speed01;
  var t = window.tempo;
  //console.log("tempo =", t * speed01);
  parent.metronome.setTempo(t);
  //console.log("speed=", speed);
  //console.log("speed01=", speed01);
  var playButtons = document.querySelectorAll('.play-button');
  //console.log("recordings count:", playButtons.length);
  for (var i = 0; i < playButtons.length; i++) {
    //console.log("recording speed", i + 1, "was", playButtons[i].speed);
    //console.log("desired speed", i + 1, " is", speed / 100);
    playButtons[i].set_speed = speed01 / playButtons[i].speed;
    //console.log("multiply by", playButtons[i].set_speed, "to achieve this");
    //var finalspeed = playButtons[i].set_speed*playButtons[i].speed;
    //console.log("speed",i+1,"=",finalspeed);
  }
}

// metronome section ///////////////////////////////////////////////////////
const speedValueElem = document.getElementById('speedValue');
const speedSliderElem = document.getElementById('speedSlider');

function setSpeed(s) {
  setPlaybackSpeed(s);
  speedValueElem.innerHTML = s + ' %';
  window.playerConfig?.set('playbackSpeed', s);
}

function setSpeedRemote(s) {
  setPlaybackSpeed(s);
  speedValueElem.innerHTML = s + ' %';
  speedSliderElem.value = +s;
  speedValueElem.animate(speedValueKeyFrames, speedValueTiming);
}

const speedValueKeyFrames = [
  { opacity: 1, transform: 'translateY(-10px)', offset: 0 },
  { opacity: 0.2, transform: 'translateY(5px)', offset: 0.5 },
  { opacity: 1, transform: 'translateY(0px)', offset: 1 },
];
const speedValueTiming = { duration: 600, iterations: 1, easing: 'ease-out' };
speedSliderElem?.addEventListener('change', () => {
  speedValueElem.animate(speedValueKeyFrames, speedValueTiming);
});

// end metronome section ///////////////////////////////////////////////////////

function addSharedBuffer(data, config) {
  const conf = {
    ...config,
    total: data.length,
  };

  // Send configuration first
  const ymap = new Y.Map();
  Object.entries(conf).forEach(([k, v]) => ymap.set(k, v));
  window.sharedRecordedBlobs.push([ymap]);

  const chunksArray = new Y.Array();
  ymap.set('data', chunksArray);
  for (let i = 0; i < data.length; i += 9048) {
    chunksArray.push(data.slice(i, i + 9048));
  }
}

function generateID() {
  let id = [];
  for (let num of window.crypto.getRandomValues(new Uint8Array(8))) {
    id.push(num.toString(16));
  }
  return id.join('');
}

function addProgressBar(id, parentElement) {
  const progress = document.createElement('div');
  progress.classList.add('progress');
  const progressBar = document.createElement('div');
  progressBar.id = id;
  progressBar.classList.add('progress-bar');
  progressBar.style.width = '0%';
  progressBar.textContent = '0%';
  progressBar.setAttribute('role', 'progressbar');
  progress.appendChild(progressBar);
  return parentElement.appendChild(progress);
}

function updateProgressBar(downloadProgress, selector) {
  const progressBar = document.querySelector(selector);
  if (!progressBar) {
    return null;
  }
  progressBar.style.width = `${Math.round(downloadProgress)}%`;
  progressBar.textContent = `${Math.round(downloadProgress)}%`;
  return progressBar;
}

function addBlobUrlToDownload(url, count) {
  // Add blob url to corresponding wave form container download button
  let downloadButton = document
    .querySelector(`#buttons${count}`)
    ?.querySelector('[title="Download"]');
  if (downloadButton) {
    downloadButton.disabled = false;
    downloadButton.addEventListener('click', function () {
      downloadAudioFromURL(url);
    });
  }
}

function createRecordingTemplate(recUserData) {
  const outmostContainer = document.createElement('div');
  outmostContainer.classList.add('outmost-container');
  document.body.appendChild(outmostContainer);

  //creating the image container
  if (!!Collab) {
    const isOnline = [...window.awareness.getStates()].some(
      ([id, state]) => state.user.name == recUserData.name
    );

    const imageContainer = document.createElement('img');
    outmostContainer.appendChild(imageContainer);
    //setting image element attributes
    const imageAttrs = {
      src: recUserData.imageSrc,
      title: recUserData.name,
      class: `${
        isOnline ? 'recUser-online' : 'recUser-offline'
      } waveform-awareness flash`,
      width: '70px',
      height: '70px',
      style: 'border-radius: 50%;',
    };
    [...Object.keys(imageAttrs)].forEach(attr =>
      imageContainer.setAttribute(attr, imageAttrs[attr])
    );
  }

  // create a new container element for the waveform, timeline, and buttons
  var scrollContainer = document.createElement('div');
  scrollContainer.id = 'scrollContainer' + count;
  scrollContainer.classList.add('waveform-class');
  scrollContainer.style.height = '70px';
  scrollContainer.style.overflow = 'auto';
  outmostContainer.appendChild(scrollContainer); // append the container to the body
}

function useAsBackingTrackCollab(scrollContainer, deleteWaveform, recorderName) {
  generateRecordingFilename().then(recFileName => {
    recAsBackingTrack.recName = recFileName;

    if (
      !window.confirm(
        'This track will be moved and replace backing track for everyone. Are you sure?'
      )
    ) {
      return;
    }
    //find the recording in the shared object based on its collabId
    const collabId = scrollContainer.dataset.collabId;
    if (!collabId) {
      console.error(
        'could not find collabId for scrollContainer of id: ' +
          scrollContainer.id
      );
      return;
    }

    let index = -1;
    for (let i = 0; i < window.sharedRecordedBlobs.length; i++) {
      if (window.sharedRecordedBlobs.get(i)?.get('id') === collabId) {
        index = i;
        break;
      }
    }

    if (index !== -1) {
      // Load this track on backingTrack wavesurfer (window.backingTrack)
      const data = window.sharedRecordedBlobs.get(index).get('data');
      if (data?.length > 1) {
        const src = Float32Array.from(data);
        const recBlob = recordingToBlob(src);

        let reader = new FileReader();
        reader.readAsDataURL(recBlob);

        reader.onload = function() {
          try {
            //setting relevant global parameters in order to be used in loadAudioFiles
            recAsBackingTrack.hasBeenSet = true;
  
            loadAudioFile(reader.result);
            // Set new key to this collabId and undo others
            window.ydoc.transact(() => {
              //fire events that set this rec as BT in collaborators
              window.playerConfig.set('backingTrackRecording', {
                sharer: userParam,
                recorderName,
                recordingName: recAsBackingTrack.recName,
                dataURL: reader.result
              });
              //delete shared object s rest paramaters that have to do with backing track, so as a single backing track exists
              window.playerConfig.delete('backingTrack');
              window.playerConfig.delete('backingTrackRepository');
              //fire events that delete the recording used as backing track in collaborators
              window.deletedSharedRecordedBlobIds.push([collabId]);
              window.sharedRecordedBlobs.get(index).set('data', [0]);
            });
            //delete recording used as backing track
            deleteWaveform();
            removeFileURLParam();
          } catch (err) {
            console.error('Failed to load dataURL as backing track', { blob: recBlob, dataURL: reader.result , err });
          }
        };


      }
    }
  });
}

function fillRecordingTemplate(
  id,
  recUserData,
  speed = speed01,
  set_pitch = 1 / speed01
) {
  const scrollContainer = document.getElementById(`scrollContainer${count}`);
  if (!scrollContainer) {
    console.error(
      'Could not find scrollContainer of id: scrollContainer' + count
    );
    return;
  }
  scrollContainer.dataset.collabId = id;
  const outmostContainer = scrollContainer.parentElement;
  // var progress = document.createElement("div");
  // progress.classList.add("progress");
  // var progressBar = document.createElement("div");
  // progressBar.id = "progressBar" + count;
  // progressBar.classList.add("progress-bar");
  // progressBar.style.width = "0%";
  // progressBar.textContent = "0%";
  // progressBar.setAttribute("role", "progressbar");
  // progress.appendChild(progressBar);
  // scrollContainer.appendChild(progress);
  addProgressBar('progressBar' + count, scrollContainer);

  // create a new container element for wavesurfer
  var waveContainer = document.createElement('div');
  waveContainer.id = 'waveform' + count;
  waveContainer.classList.add('waveform-class');
  scrollContainer.appendChild(waveContainer); // append the container to the body

  var timelineContainer = document.createElement('div');
  timelineContainer.id = 'timeline' + count;
  timelineContainer.classList.add('timeline-class');
  scrollContainer.appendChild(timelineContainer); // append the container to the body

  var buttonContainer = document.createElement('div');
  buttonContainer.id = 'buttons' + count;
  buttonContainer.classList.add('buttons-class');
  buttonContainer.classList.add('buttons-container-class');
  document.body.appendChild(buttonContainer); // append the container to the body

  // create a new wavesurfer instance
  var wavesurfer = WaveSurfer.create({
    container: '#waveform' + count,
    waveColor: '#345',
    minPxPerSec: 100,
    cursorWidth: 1,
    height: 50,
    scrollParent: '#scrollContainer' + count,
    scrollParent: true,
    progressColor: '#e81',
    plugins: [
      WaveSurfer.cursor.create({
        showTime: true,
        opacity: 1,
        customShowTimeStyle: {
          'background-color': '#345',
          color: '#0f5',
          padding: '2px',
          'font-size': '10px',
        },
      }),
      WaveSurfer.timeline.create({
        container: '#timeline' + count, // specify the container for the timeline
        height: 20, // specify the height of the timeline
      }),
    ],
  });

  wavesurfers.push(wavesurfer);
  document.getElementById('recordings_headline').hidden = false;
  wavesurfer.on('ready', function () {
    let st = new window.soundtouch.SoundTouch(wavesurfer.backend.ac.sampleRate);
    let buffer = wavesurfer.backend.buffer;
    let channels = buffer.numberOfChannels;
    let l = buffer.getChannelData(0);
    let r = channels > 1 ? buffer.getChannelData(1) : l;
    let length = buffer.length;
    let seekingPos = null;
    let seekingDiff = 0;

    let source = {
      extract: function (target, numFrames, position) {
        if (seekingPos != null) {
          seekingDiff = seekingPos - position;
          seekingPos = null;
        }
        position += seekingDiff;
        for (let i = 0; i < numFrames; i++) {
          target[i * 2] = l[i + position];
          target[i * 2 + 1] = r[i + position];
        }
        return Math.min(numFrames, length - position);
      },
    };

    let soundtouchNode;

    wavesurfer.on('play', function () {
      seekingPos = ~~(wavesurfer.backend.getPlayedPercents() * length);
      st.tempo = wavesurfer.getPlaybackRate();

      if (st.tempo === 1) {
        wavesurfer.backend.disconnectFilters();
      } else {
        if (!soundtouchNode) {
          let filter = new window.soundtouch.SimpleFilter(source, st);
          soundtouchNode = window.soundtouch.getWebAudioNode(
            wavesurfer.backend.ac,
            filter
          );
        } else {
        }
        wavesurfer.backend.setFilter(soundtouchNode);
      }
    });

    wavesurfer.on('pause', function () {
      soundtouchNode && soundtouchNode.disconnect();
    });

    wavesurfer.on('seek', function () {
      seekingPos = ~~(wavesurfer.backend.getPlayedPercents() * length);
    });
  });

  //console.log("wavesufer speed was",speed,"%");

  wavesurfer.on('finish', function () {
    //wavesurfer.seekTo(0); // move the cursor to the beggining of the wavesurfer waveform
    playPauseButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    playPauseButton.title = 'Play';
    speedSliderEnableCheck();

    resetStopAllButton();
  });

  // create the buttons /////////////////////////////////////////////
  // create mute buttons
  var muteButton = document.createElement('button');
  muteButton.innerHTML =
    '<svg fill="#000000" width="25" height="25" viewBox="-2.5 0 19 19" xmlns="http://www.w3.org/2000/svg" class="cf-icon-svg"><path d="M7.365 4.785v9.63c0 .61-.353.756-.784.325l-2.896-2.896H1.708A1.112 1.112 0 0 1 .6 10.736V8.464a1.112 1.112 0 0 1 1.108-1.108h1.977L6.581 4.46c.43-.43.784-.285.784.325zm2.468 7.311a3.53 3.53 0 0 0 0-4.992.554.554 0 0 0-.784.784 2.425 2.425 0 0 1 0 3.425.554.554 0 1 0 .784.783zm1.791 1.792a6.059 6.059 0 0 0 0-8.575.554.554 0 1 0-.784.783 4.955 4.955 0 0 1 0 7.008.554.554 0 1 0 .784.784z"/></svg>';
  muteButton.className = 'wavesurfer-button mute-button btn btn-lg';
  muteButton.style.marginRight = '30px';
  muteButton.setAttribute('title', 'Mute');
  muteButton.addEventListener('click', function () {
    if (wavesurfer.getMute()) {
      wavesurfer.setMute(false);
      muteButton.setAttribute('title', 'Mute');
      muteButton.innerHTML =
        '<svg fill="#000000" width="25" height="25" viewBox="-2.5 0 19 19" xmlns="http://www.w3.org/2000/svg" class="cf-icon-svg"><path d="M7.365 4.785v9.63c0 .61-.353.756-.784.325l-2.896-2.896H1.708A1.112 1.112 0 0 1 .6 10.736V8.464a1.112 1.112 0 0 1 1.108-1.108h1.977L6.581 4.46c.43-.43.784-.285.784.325zm2.468 7.311a3.53 3.53 0 0 0 0-4.992.554.554 0 0 0-.784.784 2.425 2.425 0 0 1 0 3.425.554.554 0 1 0 .784.783zm1.791 1.792a6.059 6.059 0 0 0 0-8.575.554.554 0 1 0-.784.783 4.955 4.955 0 0 1 0 7.008.554.554 0 1 0 .784.784z"/></svg>';
    } else {
      wavesurfer.setMute(true);
      muteButton.setAttribute('title', 'Unmute');
      muteButton.innerHTML =
        '<svg fill="#000000" width="25" height="25" viewBox="0 0 19 19" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m2 7.5v3c0 .8.6 1.5 1.4 1.5h2.3l3.2 2.8c.1.1.3.2.4.2s.2 0 .3-.1c.2-.1.4-.4.4-.7v-.9l-7.2-7.2c-.5.2-.8.8-.8 1.4zm8 2v-5.8c0-.3-.1-.5-.4-.7-.1 0-.2 0-.3 0s-.3 0-.4.2l-2.8 2.5-4.1-4.1-1 1 3.4 3.4 5.6 5.6 3.6 3.6 1-1z" fill-rule="evenodd"/></svg>';
    }
  });
  buttonContainer.appendChild(muteButton);

  // create hidden mute buttons
  var hiddenMuteButton = document.createElement('button');
  hiddenMuteButton.style.display = 'none';
  hiddenMuteButton.className = 'hidden-mute-button';
  hiddenMuteButton.addEventListener('click', function () {
    wavesurfer.setMute(true);
    wavesurfer.setVolume(0);
  });
  buttonContainer.appendChild(hiddenMuteButton);

  // create play/pause buttons (for "play" function go to hidden "playButton" below)
  var playPauseButton = document.createElement('button');
  playPauseButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
  playPauseButton.className = 'wavesurfer-button play-pause-button btn btn-lg';
  playPauseButton.title = 'Play';
  playPauseButton.addEventListener('click', function () {
    if (wavesurfer.isPlaying()) {
      wavesurfer.pause();
      playPauseButton.setAttribute('title', 'Play');
      playPauseButton.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
      speedSliderEnableCheck();
    } else {
      playButton.click();
      playPauseButton.setAttribute('title', 'Pause');
      playPauseButton.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor"	class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
      document.getElementById('speedSlider').disabled = true;
    }
  });
  buttonContainer.appendChild(playPauseButton);

  // create hidden seperate play and pause buttons to control recordings
  //console.log({ speed, set_pitch });
  var playButton = document.createElement('button');
  playButton.style.display = 'none';
  playButton.innerHTML = 'Play';

  /* playButton.speed = speed01;
  playButton.set_speed = 1.0;
  playButton.set_pitch = 1 / playButton.speed; */

  playButton.speed = speed;
  playButton.set_speed = 1.0;
  playButton.set_pitch = set_pitch;
  playButton.className = 'wavesurfer-button play-button';
  playButton.addEventListener('click', function () {
    wavesurfer.setPlaybackRate(playButton.set_speed);
    wavesurfer.play();
    stopAllButton.disabled = false;
    stopAllButton.setAttribute('title', 'Stop All');
  });
  buttonContainer.appendChild(playButton);

  var pauseButton = document.createElement('button');
  pauseButton.style.display = 'none';
  pauseButton.innerHTML = 'Pause';
  pauseButton.className = 'wavesurfer-button btn btn-lg pause-button';
  pauseButton.addEventListener('click', function () {
    wavesurfer.pause();
    speedSliderEnableCheck();
  });
  buttonContainer.appendChild(pauseButton);

  //create stop buttons
  var stopButton = document.createElement('button');
  stopButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="black" class="bi bi-skip-start-fill" viewBox="0 0 16 16"><path d="M4 4a.5.5 0 0 1 1 0v3.248l6.267-3.636c.54-.313 1.232.066 1.232.696v7.384c0 .63-.692 1.01-1.232.697L5 8.753V12a.5.5 0 0 1-1 0V4z" /></svg>';
  stopButton.className = 'wavesurfer-button btn btn-lg stop-button';
  stopButton.title = 'Stop';

  stopButton.addEventListener('click', function () {
    wavesurfer.stop();
    playPauseButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    playPauseButton.title = 'Play';
    speedSliderEnableCheck();
  });
  buttonContainer.appendChild(stopButton);

  //create download buttons
  // The button will be disabled until recording data has been loaded
  var downloadButton = document.createElement('button');
  downloadButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-download" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" /><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" /></svg>';
  downloadButton.className = 'wavesurfer-button btn btn-lg wavesurfer-button';
  downloadButton.setAttribute('title', 'Download');
  downloadButton.disabled = true;
  buttonContainer.appendChild(downloadButton);

  //create use_as_backing_track buttons
  var backingButton = document.createElement('button');
  backingButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 576 512"><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M151.6 42.4C145.5 35.8 137 32 128 32s-17.5 3.8-23.6 10.4l-88 96c-11.9 13-11.1 33.3 2 45.2s33.3 11.1 45.2-2L96 146.3V448c0 17.7 14.3 32 32 32s32-14.3 32-32V146.3l32.4 35.4c11.9 13 32.2 13.9 45.2 2s13.9-32.2 2-45.2l-88-96zM320 480h32c17.7 0 32-14.3 32-32s-14.3-32-32-32H320c-17.7 0-32 14.3-32 32s14.3 32 32 32zm0-128h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H320c-17.7 0-32 14.3-32 32s14.3 32 32 32zm0-128H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H320c-17.7 0-32 14.3-32 32s14.3 32 32 32zm0-128H544c17.7 0 32-14.3 32-32s-14.3-32-32-32H320c-17.7 0-32 14.3-32 32s14.3 32 32 32z"/></svg>';
  backingButton.className = 'wavesurfer-button btn btn-lg wavesurfer-button backing-btn';
  backingButton.setAttribute('title', 'Use as backing track');
  backingButton.dataset.collabId = id;
  backingButton.disabled = true;

  function backingButtonHandler() {
    useAsBackingTrackCollab(scrollContainer, deleteWaveForm, recUserData.name);
  }

  backingButton.addEventListener('click', backingButtonHandler);

  buttonContainer.appendChild(backingButton);

  function deleteWaveForm() {
    wavesurfer.stop();

    if (firstWaveform) {
    //not needed. wavesurfer destroyed in deleteWavesurfer() that runs below
    //   try {
    //     wavesurfer.destroy();
    //   } catch (err) {
    //     console.error(err);
    //   }
      firstWaveform = false;
    }
    var buttonsId = buttonContainer.id;
    var number = buttonsId.match(/\d+/)[0];
    var deleteIndex = parseInt(number);
    console.log('deleting recording #' + deleteIndex, 'was clicked');
    recordedBuffers[deleteIndex - 1][0] = [0];
    console.log('recordedBuffers', recordedBuffers);
    deleteWavesurfer(number);
    console.log('wavesurfers', wavesurfers);
    scrollContainer.parentNode.removeChild(scrollContainer);
    timelineContainer.parentNode.removeChild(timelineContainer);
    buttonContainer.parentNode.removeChild(buttonContainer);
    outmostContainer.remove();
    var muteButtons = document.querySelectorAll('.mute-button');
    if (muteButtons.length == 0) {
      document.getElementById('recordings_headline').hidden = true;
    }

    setTimeout(() => hideUnhideElements(), 250);
  }

  function deleteHandler(event) {
    deleteWaveForm();
    if (!!Collab && event.currentTarget.dataset.collabId) {
      let indexToUpdate = -1;
      for (let i = 0; i < window.sharedRecordedBlobs.length; i++) {
        if (
          window.sharedRecordedBlobs.get(i)?.get('id') ===
          deleteButton.dataset.collabId
        ) {
          indexToUpdate = i;
        }
      }
      console.log(`removing sharedRecording for index ${indexToUpdate}`);
      if (indexToUpdate > -1) {
        window.ydoc.transact(() => {
          window.sharedRecordedBlobs.get(indexToUpdate).set('data', [0]);
          window.deletedSharedRecordedBlobIds.push([
            event.currentTarget.dataset.collabId,
          ]);
        });
      }
    }
  }

  function deleteHandlerRemote(event) {
    deleteWaveForm();
  }

  //create delete buttons
  var deleteButton = document.createElement('button');
  deleteButton.setAttribute('disabled', true);
  deleteButton.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" width="25" height="25" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M6 7V18C6 19.1046 6.89543 20 8 20H16C17.1046 20 18 19.1046 18 18V7M6 7H5M6 7H8M18 7H19M18 7H16M10 11V16M14 11V16M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7M8 7H16" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>';
  deleteButton.className = 'wavesurfer-button btn btn-lg delete-button';
  deleteButton.setAttribute('title', 'Delete recording');
  if (Collab) {
    !(recUserData.name == userParam)
      ? deleteButton.setAttribute('hidden', true)
      : null;
  }
  deleteButton.dataset.collabId = id;
  deleteButton.addEventListener('click', function (event) {
    // prettier-ignore
    if (window.confirm("This track will be removed for everyone. Are you sure you want to delete it?")) {
            deleteHandler(event);
            console.log('chekccccccccccccccccccccccccccccccccccccccccckme')
        }
  });
  buttonContainer.appendChild(deleteButton);

  var hiddenDeleteButton = document.createElement('button');
  hiddenDeleteButton.classList.add('hidden-delete-btn');
  hiddenDeleteButton.setAttribute('hidden', true);
  hiddenDeleteButton.style.display = 'none';
  hiddenDeleteButton.dataset.collabId = id;
  hiddenDeleteButton.addEventListener('click', deleteHandlerRemote);
  buttonContainer.appendChild(hiddenDeleteButton);

  // add the speed property to the wavesurfer instance
  Object.defineProperty(wavesurfer, 'speed', {
    get: function () {
      return scrollContainer.speed;
    },
    set: function (value) {
      scrollContainer.speed = speed;
      this.setPlaybackRate(speed);
    },
  });

  /* count creates bug when augmented here. Count now gets augmented in handleSharedRecordingData (sharedTypesHandlers.js)
  // increase the count variable
  count++;
  */

  // Load first recording as backing track (during collab)
  // A) Recorder & B) Collaborator
  if (Collab) {
    wavesurfer.on('ready', function () {
      if (!backingTrack.isReady) {
        if (recUserData.name !== userParam) return;
        backingButtonHandler();
      }
    });
  }
}

/**
 * Create recording track: wavesurfer, and related controls
 */
function createRecordingTrack(
  blob,
  id,
  recUserData,
  speed = speed01,
  set_pitch = 1 / speed01
) {
  var url = URL.createObjectURL(blob);
  const outmostContainer = document.createElement('div');
  outmostContainer.classList.add('outmost-container');
  document.body.appendChild(outmostContainer);

  //creating the image container
  if (Collab) {
    const isOnline = [...window.awareness.getStates()].some(
      ([id, state]) => state.user.name == recUserData.name
    );

    const imageContainer = document.createElement('img');
    outmostContainer.appendChild(imageContainer);
    //setting image element attributes
    const imageAttrs = {
      src: recUserData.imageSrc,
      title: recUserData.name,
      class: `${
        isOnline ? 'recUser-online' : 'recUser-offline'
      } waveform-awareness`,
      width: '70px',
      height: '70px',
      style: 'border-radius: 50%;',
    };
    [...Object.keys(imageAttrs)].forEach(attr =>
      imageContainer.setAttribute(attr, imageAttrs[attr])
    );
  }

  // create a new container element for the waveform, timeline, and buttons
  var scrollContainer = document.createElement('div');
  scrollContainer.id = 'scrollContainer' + count;
  scrollContainer.classList.add('waveform-class');
  scrollContainer.style.height = '70px';
  scrollContainer.style.overflow = 'auto';
  scrollContainer.dataset.collabId = id;
  outmostContainer.appendChild(scrollContainer); // append the container to the body

  // create a new container element for wavesurfer
  var waveContainer = document.createElement('div');
  waveContainer.id = 'waveform' + count;
  waveContainer.classList.add('waveform-class');
  scrollContainer.appendChild(waveContainer); // append the container to the body

  var timelineContainer = document.createElement('div');
  timelineContainer.id = 'timeline' + count;
  timelineContainer.classList.add('timeline-class');
  scrollContainer.appendChild(timelineContainer); // append the container to the body

  var buttonContainer = document.createElement('div');
  buttonContainer.id = 'buttons' + count;
  buttonContainer.classList.add('buttons-class');
  buttonContainer.classList.add('buttons-container-class');
  document.body.appendChild(buttonContainer); // append the container to the body

  // create a new wavesurfer instance
  var wavesurfer = WaveSurfer.create({
    container: '#waveform' + count,
    waveColor: '#345',
    minPxPerSec: 100,
    cursorWidth: 1,
    height: 50,
    scrollParent: '#scrollContainer' + count,
    scrollParent: true,
    progressColor: '#e81',
    plugins: [
      WaveSurfer.cursor.create({
        showTime: true,
        opacity: 1,
        customShowTimeStyle: {
          'background-color': '#345',
          color: '#0f5',
          padding: '2px',
          'font-size': '10px',
        },
      }),
      WaveSurfer.timeline.create({
        container: '#timeline' + count, // specify the container for the timeline
        height: 20, // specify the height of the timeline
      }),
    ],
  });

  wavesurfer.load(url);
  wavesurfers.push(wavesurfer);
  document.getElementById('recordings_headline').hidden = false;
  wavesurfer.on('ready', function () {
    let st = new window.soundtouch.SoundTouch(wavesurfer.backend.ac.sampleRate);
    let buffer = wavesurfer.backend.buffer;
    let channels = buffer.numberOfChannels;
    let l = buffer.getChannelData(0);
    let r = channels > 1 ? buffer.getChannelData(1) : l;
    let length = buffer.length;
    let seekingPos = null;
    let seekingDiff = 0;

    let source = {
      extract: function (target, numFrames, position) {
        if (seekingPos != null) {
          seekingDiff = seekingPos - position;
          seekingPos = null;
        }
        position += seekingDiff;
        for (let i = 0; i < numFrames; i++) {
          target[i * 2] = l[i + position];
          target[i * 2 + 1] = r[i + position];
        }
        return Math.min(numFrames, length - position);
      },
    };

    let soundtouchNode;

    wavesurfer.on('play', function () {
      seekingPos = ~~(wavesurfer.backend.getPlayedPercents() * length);
      st.tempo = wavesurfer.getPlaybackRate();

      if (st.tempo === 1) {
        wavesurfer.backend.disconnectFilters();
      } else {
        if (!soundtouchNode) {
          let filter = new window.soundtouch.SimpleFilter(source, st);
          soundtouchNode = window.soundtouch.getWebAudioNode(
            wavesurfer.backend.ac,
            filter
          );
        } else {
        }
        wavesurfer.backend.setFilter(soundtouchNode);
      }
    });

    wavesurfer.on('pause', function () {
      soundtouchNode && soundtouchNode.disconnect();
    });

    wavesurfer.on('seek', function () {
      seekingPos = ~~(wavesurfer.backend.getPlayedPercents() * length);
    });
  });

  //console.log("wavesufer speed was",speed,"%");

  wavesurfer.on('finish', function () {
    //wavesurfer.seekTo(0); // move the cursor to the beggining of the wavesurfer waveform
    playPauseButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    playPauseButton.title = 'Play';
    speedSliderEnableCheck();

    resetStopAllButton();
  });

  // create the buttons /////////////////////////////////////////////
  // create mute buttons
  var muteButton = document.createElement('button');
  muteButton.innerHTML =
    '<svg fill="#000000" width="25" height="25" viewBox="-2.5 0 19 19" xmlns="http://www.w3.org/2000/svg" class="cf-icon-svg"><path d="M7.365 4.785v9.63c0 .61-.353.756-.784.325l-2.896-2.896H1.708A1.112 1.112 0 0 1 .6 10.736V8.464a1.112 1.112 0 0 1 1.108-1.108h1.977L6.581 4.46c.43-.43.784-.285.784.325zm2.468 7.311a3.53 3.53 0 0 0 0-4.992.554.554 0 0 0-.784.784 2.425 2.425 0 0 1 0 3.425.554.554 0 1 0 .784.783zm1.791 1.792a6.059 6.059 0 0 0 0-8.575.554.554 0 1 0-.784.783 4.955 4.955 0 0 1 0 7.008.554.554 0 1 0 .784.784z"/></svg>';
  muteButton.className = 'wavesurfer-button mute-button btn btn-lg';
  muteButton.style.marginRight = '30px';
  muteButton.setAttribute('title', 'Mute');
  muteButton.addEventListener('click', function () {
    if (wavesurfer.getMute()) {
      wavesurfer.setMute(false);
      muteButton.setAttribute('title', 'Mute');
      muteButton.innerHTML =
        '<svg fill="#000000" width="25" height="25" viewBox="-2.5 0 19 19" xmlns="http://www.w3.org/2000/svg" class="cf-icon-svg"><path d="M7.365 4.785v9.63c0 .61-.353.756-.784.325l-2.896-2.896H1.708A1.112 1.112 0 0 1 .6 10.736V8.464a1.112 1.112 0 0 1 1.108-1.108h1.977L6.581 4.46c.43-.43.784-.285.784.325zm2.468 7.311a3.53 3.53 0 0 0 0-4.992.554.554 0 0 0-.784.784 2.425 2.425 0 0 1 0 3.425.554.554 0 1 0 .784.783zm1.791 1.792a6.059 6.059 0 0 0 0-8.575.554.554 0 1 0-.784.783 4.955 4.955 0 0 1 0 7.008.554.554 0 1 0 .784.784z"/></svg>';
    } else {
      wavesurfer.setMute(true);
      muteButton.setAttribute('title', 'Unmute');
      muteButton.innerHTML =
        '<svg fill="#000000" width="25" height="25" viewBox="0 0 19 19" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m2 7.5v3c0 .8.6 1.5 1.4 1.5h2.3l3.2 2.8c.1.1.3.2.4.2s.2 0 .3-.1c.2-.1.4-.4.4-.7v-.9l-7.2-7.2c-.5.2-.8.8-.8 1.4zm8 2v-5.8c0-.3-.1-.5-.4-.7-.1 0-.2 0-.3 0s-.3 0-.4.2l-2.8 2.5-4.1-4.1-1 1 3.4 3.4 5.6 5.6 3.6 3.6 1-1z" fill-rule="evenodd"/></svg>';
    }
  });
  buttonContainer.appendChild(muteButton);

  // create hidden mute buttons
  var hiddenMuteButton = document.createElement('button');
  hiddenMuteButton.style.display = 'none';
  hiddenMuteButton.className = 'hidden-mute-button';
  hiddenMuteButton.addEventListener('click', function () {
    wavesurfer.setMute(true);
    wavesurfer.setVolume(0);
  });
  buttonContainer.appendChild(hiddenMuteButton);

  // create play/pause buttons (for "play" function go to hidden "playButton" below)
  var playPauseButton = document.createElement('button');
  playPauseButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
  playPauseButton.className = 'wavesurfer-button play-pause-button btn btn-lg';
  playPauseButton.title = 'Play';
  playPauseButton.addEventListener('click', function () {
    if (wavesurfer.isPlaying()) {
      wavesurfer.pause();
      playPauseButton.setAttribute('title', 'Play');
      playPauseButton.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
      speedSliderEnableCheck();
    } else {
      playButton.click();
      playPauseButton.setAttribute('title', 'Pause');
      playPauseButton.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor"	class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
      document.getElementById('speedSlider').disabled = true;
    }
  });
  buttonContainer.appendChild(playPauseButton);

  // create hidden seperate play and pause buttons to control recordings
  //console.log({ speed, set_pitch });
  var playButton = document.createElement('button');
  playButton.style.display = 'none';
  playButton.innerHTML = 'Play';

  /* playButton.speed = speed01;
  playButton.set_speed = 1.0;
  playButton.set_pitch = 1 / playButton.speed; */

  playButton.speed = speed;
  playButton.set_speed = 1.0;
  playButton.set_pitch = set_pitch;
  playButton.className = 'wavesurfer-button play-button';
  playButton.addEventListener('click', function () {
    wavesurfer.setPlaybackRate(playButton.set_speed);
    wavesurfer.play();
    stopAllButton.disabled = false;
    stopAllButton.setAttribute('title', 'Stop All');
  });
  buttonContainer.appendChild(playButton);

  var pauseButton = document.createElement('button');
  pauseButton.style.display = 'none';
  pauseButton.innerHTML = 'Pause';
  pauseButton.className = 'wavesurfer-button btn btn-lg pause-button';
  pauseButton.addEventListener('click', function () {
    wavesurfer.pause();
    speedSliderEnableCheck();
  });
  buttonContainer.appendChild(pauseButton);

  //create stop buttons
  var stopButton = document.createElement('button');
  stopButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="black" class="bi bi-skip-start-fill" viewBox="0 0 16 16"><path d="M4 4a.5.5 0 0 1 1 0v3.248l6.267-3.636c.54-.313 1.232.066 1.232.696v7.384c0 .63-.692 1.01-1.232.697L5 8.753V12a.5.5 0 0 1-1 0V4z" /></svg>';
  stopButton.className = 'wavesurfer-button btn btn-lg stop-button';
  stopButton.title = 'Stop';

  stopButton.addEventListener('click', function () {
    wavesurfer.stop();
    playPauseButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    playPauseButton.title = 'Play';
    speedSliderEnableCheck();
  });
  buttonContainer.appendChild(stopButton);

  //create download buttons
  var downloadButton = document.createElement('button');
  downloadButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-download" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" /><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" /></svg>';
  downloadButton.className = 'wavesurfer-button btn btn-lg wavesurfer-button';
  downloadButton.setAttribute('title', 'Download');
  downloadButton.addEventListener('click', function () {
    downloadAudioFromURL(url);
  });
  buttonContainer.appendChild(downloadButton);

  function backingButtonHandler() {
    generateRecordingFilename().then(recFileName => {
      console.log(recFileName);
      recAsBackingTrack.recName = recFileName;

      //setting relevant global parameters in order to be used in loadAudioFiles
      recAsBackingTrack.hasBeenSet = true;
      deleteButton.click();
    });
  }

  function backingButtonHandlerCollab() {
    useAsBackingTrackCollab(scrollContainer, deleteWaveForm, recUserData.name);
  }

  //create use_as_backing_track buttons
  var backingButton = document.createElement('button');
  backingButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 576 512"><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M151.6 42.4C145.5 35.8 137 32 128 32s-17.5 3.8-23.6 10.4l-88 96c-11.9 13-11.1 33.3 2 45.2s33.3 11.1 45.2-2L96 146.3V448c0 17.7 14.3 32 32 32s32-14.3 32-32V146.3l32.4 35.4c11.9 13 32.2 13.9 45.2 2s13.9-32.2 2-45.2l-88-96zM320 480h32c17.7 0 32-14.3 32-32s-14.3-32-32-32H320c-17.7 0-32 14.3-32 32s14.3 32 32 32zm0-128h96c17.7 0 32-14.3 32-32s-14.3-32-32-32H320c-17.7 0-32 14.3-32 32s14.3 32 32 32zm0-128H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H320c-17.7 0-32 14.3-32 32s14.3 32 32 32zm0-128H544c17.7 0 32-14.3 32-32s-14.3-32-32-32H320c-17.7 0-32 14.3-32 32s14.3 32 32 32z"/></svg>';
  backingButton.className = 'wavesurfer-button btn btn-lg wavesurfer-button';
  backingButton.setAttribute('title', 'Use as backing track');
  backingButton.addEventListener(
    'click',
    Collab ? backingButtonHandlerCollab : backingButtonHandler
  );
  buttonContainer.appendChild(backingButton);

  function deleteWaveForm() {
    wavesurfer.stop();
    if (firstWaveform) {
      try {
        wavesurfer.destroy();
      } catch (err) {
        console.error(err);
      }
      firstWaveform = false;
    }
    var buttonsId = buttonContainer.id;
    var number = buttonsId.match(/\d+/)[0];
    var deleteIndex = parseInt(number);
    console.log('deleting recording #' + deleteIndex, 'was clicked');
    recordedBuffers[deleteIndex - 1][0] = [0];
    console.log('recordedBuffers', recordedBuffers);

    deleteWavesurfer(number);
    console.log('wavesurfers', wavesurfers);

    scrollContainer.parentNode.removeChild(scrollContainer);
    timelineContainer.parentNode.removeChild(timelineContainer);
    buttonContainer.parentNode.removeChild(buttonContainer);
    outmostContainer.remove();
    var muteButtons = document.querySelectorAll('.mute-button');
    if (muteButtons.length == 0) {
      document.getElementById('recordings_headline').hidden = true;
    }

    setTimeout(() => hideUnhideElements(), 250);
  }

  function deleteHandler(event) {
    if (recAsBackingTrack.hasBeenSet) {
      loadAudioFile(url);
    }
    deleteWaveForm();
    if (!!Collab && event.currentTarget.dataset.collabId) {
      let indexToUpdate = -1;
      for (let i = 0; i < window.sharedRecordedBlobs.length; i++) {
        if (
          window.sharedRecordedBlobs.get(i)?.get('id') ===
          deleteButton.dataset.collabId
        ) {
          indexToUpdate = i;
        }
      }
      console.log(`removing sharedRecording for index ${indexToUpdate}`);
      if (indexToUpdate > -1) {
        window.ydoc.transact(() => {
          window.sharedRecordedBlobs.get(indexToUpdate).set('data', [0]);
          window.deletedSharedRecordedBlobIds.push([
            event.currentTarget.dataset.collabId,
          ]);
        });
      }
    }
  }

  function deleteHandlerRemote(event) {
    deleteWaveForm();
  }

  //create delete buttons
  var deleteButton = document.createElement('button');
  deleteButton.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" width="25" height="25" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M6 7V18C6 19.1046 6.89543 20 8 20H16C17.1046 20 18 19.1046 18 18V7M6 7H5M6 7H8M18 7H19M18 7H16M10 11V16M14 11V16M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7M8 7H16" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>';
  deleteButton.className = 'wavesurfer-button btn btn-lg delete-button';
  deleteButton.setAttribute('title', 'Delete recording');
  if (Collab) {
    !(recUserData.name == userParam)
      ? deleteButton.setAttribute('hidden', true)
      : null;
  }
  deleteButton.dataset.collabId = id;
  deleteButton.addEventListener('click', function (event) {
    var info_message = recAsBackingTrack.hasBeenSet
      ? //TODO. alx. 'for everyone' sta strings apo katw. ara otan kapoios doulevei non collab, tha sindeetai sto course kai tha tropopoiei douleia pou egine collaboratively? kai ara to istoriko sto course tha menei?
        'This track will be moved and replace backing track for everyone. Are you sure?'
      : 'This track will be removed for everyone. Are you sure you want to delete it?';
    // prettier-ignore
    if (window.confirm(info_message)) {
            deleteHandler(event);
        }
  });
  buttonContainer.appendChild(deleteButton);

  var hiddenDeleteButton = document.createElement('button');
  hiddenDeleteButton.classList.add('hidden-delete-btn');
  hiddenDeleteButton.setAttribute('hidden', true);
  hiddenDeleteButton.style.display = 'none';
  hiddenDeleteButton.dataset.collabId = id;
  hiddenDeleteButton.addEventListener('click', deleteHandlerRemote);
  buttonContainer.appendChild(hiddenDeleteButton);

  // add the speed property to the wavesurfer instance
  Object.defineProperty(wavesurfer, 'speed', {
    get: function () {
      return scrollContainer.speed;
    },
    set: function (value) {
      scrollContainer.speed = speed;
      this.setPlaybackRate(speed);
    },
  });

  // increase the count variable
  count++;

    // Load first recording as backing track
  // A) NO Collab & B) Later Collaborator???
  wavesurfer.on('ready', function () {
    if (Collab) {
      // Case of late collaborator FIXME. Works 1/3 cases
      // Collaborator connects...
      // 1) ..while someone records --> BUG
      // 2) ..after someone has recorded, and is in the stage of load as bTrack WORKS!
      // 3) ..after someone has recorded and used as backing track BUG
    } else {
      if (!backingTrack.isReady) {
        backingButtonHandler();
      }
    }
  });
}

/**
 * Function to delete correct wavesurfer instance
 *
 * @param {*} buttonId
 */
function deleteWavesurfer(buttonId) {
  const index = wavesurfers.findIndex(w => {
    return w.container.id === 'waveform' + buttonId;
  });

  if (index !== -1) {
    wavesurfers[index].destroy(); // to clean up memory

    // Remove the element from the array
    wavesurfers.splice(index, 1);

    console.log(
      `Deleted the WaveSurfer with container id: waveform${buttonId}`
    );
  } else {
    console.log(`No WaveSurfer found with container id: waveform${buttonId}`);
  }
}

function combineSelected() {
  // DEBUG ONLY PURPOSE !!!!!!!!!!!!!!!!!!!!!!! COMMENT OUT ALL BELOW ************************************************
  //resampleAudioBuffer (recordedBlobs[0],44100,22050);
  //return;

  // DEBUG ONLY PURPOSE !!!!!!!!!!!!!!!!!!!!!!! COMMENT OUT ALL ABOVE ************************************************

  //console.log("combine files to single wav clicked");

  var noBuffers = 0;
  var muteButtons = document.querySelectorAll('.mute-button');
  var playButtons = document.querySelectorAll('.play-button');
  var selectedBuffers = [];
  var buttonContainers = document.querySelectorAll('.buttons-container-class');
  var sampleRates = [];
  for (var i = 0; i < muteButtons.length; i++) {
    // lets check if we need the recording to be mixed
    if (muteButtons[i].title == 'Mute') {
      noBuffers++;
      var muteButtonID = buttonContainers[i].id;
      var number = muteButtonID.match(/\d+/)[0];
      var recIndex = parseInt(number);
      console.log('including recording #' + recIndex, 'to the mix');
      var index = recIndex - 1;
      selectedBuffers.push(index);

      if (
        !!Collab &&
        window.sharedRecordedBlobs.length === recordedBuffers.length
      ) {
        let sampleRate = window.sharedRecordedBlobs
          .get(index)
          .get('sampleRate');
        if (sampleRate) {
          sampleRates.push(sampleRate);
        }
      }
    }
  }
  selectedBuffers = selectedBuffers.map(function (index) {
    return recordedBuffers[index];
  });

  // add backing track to selected buffers if exists and is unmuted
  if (backingTrack.isReady && !backingTrack.isMuted) {
    var monoBackingTrack = extractMonoBackingTrackArrayBuffer(backingTrack);
    selectedBuffers.push([monoBackingTrack]);
  }

  console.log('selectedBuffers= ', selectedBuffers);
  console.log('recordedBuffers= ', recordedBuffers);
  console.log(noBuffers, ' audio recordings to be mixed to a single wav file');

  var audioContext_temp = new AudioContext();
  console.log(
    'Default sample rate for this device is:',
    audioContext_temp.sampleRate
  );
  audioContext_temp.close;

  /*
    DEBUG --> CORRECT, array values are being read
    let value = selectedBuffers[0][0][4000];
    console.log ("selectedBuffers[0][0][4000] = ",value);
    let value0 = recordedBuffers[0][0][4000];
    console.log ("selectedBuffers[0][0][4000] = ",value0);
    let value2 = selectedBuffers[1][0][4000];
    console.log ("selectedBuffers[1][0][4000] = ",value2);
    let value3 = selectedBuffers[2][0][4000];
    console.log ("selectedBuffers[2][0][4000] = ",value3);
    */
  // now we must check the recording speed
  var allSpeedsEqual = true;
  var muteIndices = [];
  var logs = [];

  for (let j = 0; j < playButtons.length; j++) {
    if (muteButtons[j].title === 'Mute') {
      muteIndices.push(j);
      var speed = playButtons[j].speed;
      logs.push('Record speed (' + j + ') was ' + speed * 100 + '%');
    }
  }
  for (let i = 1; i < muteIndices.length; i++) {
    var currentIndex = muteIndices[i];
    var previousIndex = muteIndices[i - 1];
    if (playButtons[currentIndex].speed !== playButtons[previousIndex].speed) {
      allSpeedsEqual = false;
      break;
    }
  }
  if (allSpeedsEqual) {
    console.log(
      'All recording speeds were equal. Mixing and downloading will proceed'
    );
  } else {
    var confirmation = confirm(
      'Are you sure you want to proceed?\n\n' + logs.join('\n')
    );
    if (confirmation) {
      console.log("User clicked OK, mixing will proceed at user's risk...");
    } else {
      console.log('User clicked Cancel or closed the pop-up');
      return;
    }
  }

  mixAudioBuffers(selectedBuffers, sampleRates);
}

function extractMonoBackingTrackArrayBuffer(input) {
  var track = input.backend.buffer;
  //const origSampleRate = input.backend.sampleRate;
  const origChannels = input.backend.buffer.numberOfChannels;
  if (origChannels == 2) {
    //console.log("starting conversion stereo to mono");
    track = convertStereoToMono(track);
  }
  return track.getChannelData(0);
}

function convertStereoToMono(stereoaudiobuffer) {
  const channel1 = stereoaudiobuffer.getChannelData(0);
  const channel2 = stereoaudiobuffer.getChannelData(1);
  var monoChannel = new Float32Array(channel1.length); // Create a new mono channel
  // Combine the left and right channels by averaging the samples
  for (let i = 0; i < channel1.length; i++) {
    monoChannel[i] = (channel1[i] + channel2[i]) / 2;
  }
  // Create a new mono audio buffer
  const audioContext2 = new (window.AudioContext ||
    window.webkitAudioContext)();
  //const audioContext2 = new AudioContext({sampleRate: stereoaudiobuffer.backend.buffer.sampleRate,});
  const monoAudioBuffer = audioContext2.createBuffer(
    1,
    monoChannel.length,
    stereoaudiobuffer.sampleRate
  );
  monoAudioBuffer.copyToChannel(monoChannel, 0); // Copy the mono channel to the new buffer
  console.log('monoAudioBuffer from stereo backing track =', monoAudioBuffer);
  audioContext2.close();
  return monoAudioBuffer;
}

// this function does not work yet !!!!!!!!!!!!!!
function changeBufferSpeed(buffers, index, recspeed) {
  // Create a new SoundTouch object for each buffer
  //var soundtouch_adjust = new soundtouch.SoundTouch();

  // Set the desired playback speed
  var playbackSpeed = 1 / recspeed; // "repair" recording speed

  // Get the PCM audio data from the buffer
  var pcmBuffer = buffers[index][0];
  console.log('pcmBuffer', pcmBuffer);

  let st = new window.soundtouch.SoundTouch(pcmBuffer.sampleRate);
  st.tempo = playbackSpeed;
  let soundtouchNode;
  if (!soundtouchNode) {
    let filter = new window.soundtouch.SimpleFilter(
      pcmBuffer.length * playbackSpeed,
      st
    ); //what is source?
    soundtouchNode = window.soundtouch.getWebAudioNode(pcmBuffer, filter);
  }

  pcmBuffer.setFilter(soundtouchNode);
}

function mixAudioBuffers(buffers, sampleRates = []) {
  var length = 0;
  var maxRecLenth = 0;
  for (let n = 0; n < buffers.length; n++) {
    length = buffers[n][0].length;
    //console.log("Recording's ",n+1," lenght = ",length);
    if (length > maxRecLenth) {
      maxRecLenth = length;
    }
  }
  console.log('maximum length of selected recordings = ', maxRecLenth);
  console.log('sampleRates', sampleRates);
  //console.log("mixAudioBuffers started");
  //console.log("buffers[0][0][4000] =", buffers[0][0][4000]);
  var mixData = new Array(length).fill(0);
  for (let i = 0; i < buffers.length; i++) {
    for (let j = 0; j < buffers[i][0].length; j++) {
      mixData[j] = mixData[j] + buffers[i][0][j];
    }
  }
  for (let k = 0; k < mixData.length; k++) {
    mixData[k] = mixData[k] / buffers.length;
  }
  //console.log ("mixData = ",mixData);
  dataToWave(mixData); // This creates the blob with PCM32 audio from float32 array and saves it

  /* DEBUG
    const channelDataJson = JSON.stringify(mixData);
    const blob = new Blob([channelDataJson], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'channelData.json';
    link.click();	// Click the link to download the file
    // END DEBUG -->> CORRECT, data written to wav in python sf.write(mixdata,sampleRate) produces the expected mixed audio
    */
}

function recordingToBlob(Float32BitSampleArray, remoteSampleRate = sampleRate) {
  // https://gist.github.com/meziantou/edb7217fddfbb70e899e
  // https://stackoverflow.com/questions/73891141/should-i-convert-32-bit-float-audio-samples-into-a-16-bit-pcm-data-wav-file-in-m
  var dataTypeSize = 32, // 32 bit PCM data
    totalDataSize = (dataTypeSize / 8) * Float32BitSampleArray.length,
    sizeOfFileDescriptor = totalDataSize + 36,
    numberOfChannels = 1,
    bytesPerSample = (numberOfChannels * dataTypeSize) / 8,
    blockAlign = numberOfChannels * bytesPerSample,
    bitsPerSample = bytesPerSample * 8,
    byteRate = remoteSampleRate * bytesPerSample * numberOfChannels,
    buffer = new ArrayBuffer(44 + totalDataSize),
    view = new DataView(buffer),
    format = 1;

  function writeStringIntoBuffer(index, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(index + i, str.charCodeAt(i));
    }
  }
  function write32BitInt(index, val) {
    view.setUint32(index, val, true);
  }
  function write16BitInt(index, val) {
    view.setUint16(index, val, true);
  }
  writeStringIntoBuffer(0, 'RIFF');
  write32BitInt(4, sizeOfFileDescriptor);
  writeStringIntoBuffer(8, 'WAVE');
  writeStringIntoBuffer(12, 'fmt ');
  write32BitInt(16, 16);
  write16BitInt(20, format);
  write16BitInt(22, numberOfChannels);
  write32BitInt(24, remoteSampleRate);
  write32BitInt(28, byteRate);
  write16BitInt(32, blockAlign);
  write16BitInt(34, bitsPerSample);
  writeStringIntoBuffer(36, 'data');
  write32BitInt(40, totalDataSize);

  // console.log("view=",view); // to view file size to be filled with audio data and check if correct

  // Write audio data
  const dataView = new DataView(buffer, 44);
  for (let i = 0; i < Float32BitSampleArray.length; i++) {
    const byteOffset = i * 4;
    const intSample =
      Math.max(-1, Math.min(1, Float32BitSampleArray[i])) * 0x7fffffff;
    dataView.setInt32(byteOffset, intSample, true);
  }
  return new Blob([view], { type: 'audio/wav' });
}

function resampleAudioBuffer(blob, originalSampleRate, targetSampleRate) {
  // Create a new AudioContext instance
  //var audioContext_original = new AudioContext({
  //  sampleRate: originalSampleRate,
  //});

  //var duration = pcmData.length / originalSampleRate;
  //var audioBuffer = audioContext_original.createBuffer(1, pcmData.length, originalSampleRate);
  //var channelData = audioBuffer.getChannelData(0);
  //channelData.set(pcmData);
  //console.log("original Audio Buffer:", audioBuffer);
  //console.log("channelData=", channelData);

  // Create a new ArrayBuffer from the channelData
  var fileReader = new FileReader();
  fileReader.readAsArrayBuffer(blob);

  // Create a new AudioContext instance for resampling
  var context_resample = new AudioContext({
    sampleRate: targetSampleRate,
  });

  fileReader.onload = e => {
    //e.target.result is an ArrayBuffer
    context_resample.decodeAudioData(e.target.result, async function (buffer) {
      console.log(buffer);
      var channelData = buffer.getChannelData(0);
      console.log('channelData=', channelData);
    });
  };
}

function dataToWave(Float32BitSampleArray) {
  var mixBlob = recordingToBlob(Float32BitSampleArray);
  //console.log("vmixBlob=",mixBlob);
  const url = URL.createObjectURL(mixBlob); // Create a link to download the file
  downloadAudioFromURL(url);
}

function downloadAudioFromURL(url) {
  var tempLink = document.createElement('a');
  var unique_filename = new Date().toISOString();
  tempLink.download = unique_filename + '.wav';
  tempLink.href = url;
  tempLink.click();
}

function playpauseAll() {
  if (playPauseAllButton.getAttribute('title') === 'Play all') {
    //console.log("playPauseAllButton (PLAY) clicked");
    //console.log("Play ALL");
    playPauseAllButton.setAttribute('title', 'Pause all');
    playAll();
  } else {
    pauseAll();
    //console.log("Pause ALL");
    playPauseAllButton.setAttribute('title', 'Play all');
  }
}

function playAll() {
  setPlaybackVolume(); // automatic adjustment of audio tracks
  //console.log("playPauseAllButton (PLAY) clicked");
  document.getElementById('speedSlider').disabled = true;
  stopAllButton.disabled = false;
  stopAllButton.setAttribute('title', 'Stop All');
  playPauseAllButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
  playPauseAllButton.title = 'Pause all';
  var playButtons = document.querySelectorAll('.play-button');
  var playPauseButtons = document.querySelectorAll('.play-pause-button');
  //console.log("now, I will click all play buttons");
  //console.log("playButtons.length = ",playButtons.length);
  for (var i = 0; i < playButtons.length; i++) {
    //console.log(i);
    playButtons[i].click();
    playPauseButtons[i].innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor"	class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
    playPauseButtons[i].setAttribute('title', 'Pause');
  }

  AUDIO_PLAYER_CONTROLS.playPauseBtn.click();
}

function pauseAll() {
  resetPlaybackVolume();
  document.getElementById('speedSlider').disabled = false;
  //console.log("playPauseAllButton (PAUSE) clicked");
  playPauseAllButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
  playPauseAllButton.title = 'Play all';

  AUDIO_PLAYER_CONTROLS.playPauseBtn.click();

  var playPauseButtons = document.querySelectorAll('.play-pause-button');
  var pauseButtons = document.querySelectorAll('.pause-button');
  //console.log("now I will click all play buttons");
  //console.log("pauseButtons.length = ",pauseButtons.length);
  for (var i = 0; i < pauseButtons.length; i++) {
    //console.log(i);
    pauseButtons[i].click();
    playPauseButtons[i].innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    playPauseButtons[i].setAttribute('title', 'Play');
  }
}

function stopAll() {
  resetPlaybackVolume();
  //console.log("stopAllButton clicked");
  stopAllButton.disabled = true;
  stopAllButton.setAttribute('title', '');
  document.getElementById('speedSlider').disabled = false;
  playPauseAllButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
  playPauseAllButton.title = 'Play all';

  AUDIO_PLAYER_CONTROLS.stopBtn.click();

  var stopButtons = document.querySelectorAll('.stop-button');
  var playButtons = document.querySelectorAll('.play-button');
  var playPauseButtons = document.querySelectorAll('.play-pause-button');
  //console.log("click all stop buttons")
  //console.log("stopButtons.length = ",stopButtons.length);
  for (var i = 0; i < stopButtons.length; i++) {
    //console.log(i);
    stopButtons[i].click();
    playButtons[i].innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    playButtons[i].setAttribute('title', 'Play');
    playPauseButtons[i].innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    playPauseButtons[i].setAttribute('title', 'Play');
  }
}

function speedSliderEnableCheck() {
  //console.log("Checking if speed slider can be enabled again");
  var playPauseButtons = document.querySelectorAll('.play-pause-button');

  // Do the following if backing track is paused
  if (!backingTrack.isPlaying()) {
    //console.log("recordButton.title =", recordButton.title);
    if (recordButton.title === 'Start recording') {
      if (playPauseAllButton.hidden === true) {
        document.getElementById('speedSlider').disabled = false;
      } else {
        for (var i = 0; i < playPauseButtons.length; i++) {
          //console.log(
          //  "playPauseButtons[" + i + "].title =",
          //  playPauseButtons[i].title
          //);
          if (playPauseButtons[i].title === 'Play') {
            document.getElementById('speedSlider').disabled = false;
          }
        }
      }
    }
  }
}

// used in playalong\collab
function showHiddenButtons() {
  playPauseAllButton.hidden = false;
  playPauseAllButton.setAttribute('title', 'Play all');
  playPauseAllButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';

  stopAllButton.hidden = false;
  stopAllButton.disabled = true;
  stopAllButton.setAttribute('title', '');
  combineSelectedButton.hidden = false;
}

function notify(text, context) {
  const notification = document.createElement('div');
  notification.setAttribute('role', 'alert');
  notification.className = `alert alert-${context} notification`;
  notification.innerText = text;

  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 3000);
}

// - Neoklis

function resetPlaybackVolume() {
  const volumeSlider = document.querySelector('#volume-slider');

  for (let w = 0; w < wavesurfers.length; w++) {
    if (!wavesurfers[w].isMuted) {
      wavesurfers[w].setVolume(1);
    }
  }

  if (backingTrack.isReady && !backingTrack.isMuted) {
    backingTrackVolumeFactor = 1;
    backingTrack.setVolume(+volumeSlider.value * backingTrackVolumeFactor);
  }
}

/**
 * The setPlaybackVolume function is responsible for dynamically adjusting the volume of audio tracks in an application. It counts the number of unmuted tracks, and based on this count, it sets the volume levels of the backing track and other recordings, ensuring balanced audio playback
 */
function setPlaybackVolume() {
  const volumeSlider = document.querySelector('#volume-slider');

  // keep a count of unmuted recording tracks (BACKING TRACK NOT INCLUDED!)
  let unmutedCount = 0;

  for (let w = 0; w < wavesurfers.length; w++) {
    if (!wavesurfers[w].isMuted) {
      unmutedCount++;
    }
  }

  // 1st case (No backing track or MUTED backing track)
  if (!backingTrack.isReady || backingTrack.isMuted) {
    // equal volume in all UNMUTED recordings
    const volume = 1 / unmutedCount; // Calculate volume

    for (let w = 0; w < wavesurfers.length; w++) {
      if (!wavesurfers[w].isMuted) {
        wavesurfers[w].setVolume(volume); // Set volume for each unmuted recording
      }
    }
  } else {
    // 2nd case (a) (Backing track exist and is unmuted)
    const totalUnmutedTracks = unmutedCount + 1; // +1 because of the backing track

    let recordingVolume = 0;

    if (totalUnmutedTracks === 2) {
      backingTrackVolumeFactor = 0.6;
      recordingVolume = 0.4;
    } else if (totalUnmutedTracks === 3) {
      backingTrackVolumeFactor = 0.5;
      recordingVolume = 0.25;
    } else if (totalUnmutedTracks >= 4) {
      backingTrackVolumeFactor = 0.4;
      recordingVolume = 0.6 / unmutedCount;
    }

    // Set volume for each unmuted recording
    for (let w = 0; w < wavesurfers.length; w++) {
      if (!wavesurfers[w].isMuted) {
        wavesurfers[w].setVolume(recordingVolume);
      }
    }
  }

  // 2nd case (b) Set backing track volume
  if (!backingTrack.isMuted) {
    backingTrack.setVolume(+volumeSlider.value * backingTrackVolumeFactor);
  }

  // /*
  // Debugging messages with a small timeout to avoid some visual bugs
  setTimeout(function () {
    console.log('############');
    console.log('backingTrack is Ready', backingTrack.isReady);
    console.log('backingTrack is Muted', backingTrack.isMuted);
    console.log(`backingTrack volume = ${backingTrack.backend.getVolume()}`);
    console.log(
      `backingTrack Volume Factor ${backingTrackVolumeFactor} || slider value ${+volumeSlider.value}`
    );
    console.log('------------');

    for (let w = 0; w < wavesurfers.length; w++) {
      console.log(`recording [${w + 1}] is muted:`, wavesurfers[w].isMuted);
      console.log(
        `recording [${w + 1}] volume =`,
        wavesurfers[w].backend.getVolume()
      );
    }
  }, 500);
  // */
}

function resetStopAllButton() {
  let audioIsPLaying = false;
  for (let w = 0; w < wavesurfers.length; w++) {
    if (wavesurfers[w].isPlaying()) {
      audioIsPLaying = true;
    }
  }

  if (backingTrack.isReady && backingTrack.isPlaying()) audioIsPLaying = true;

  if (audioIsPLaying === false) {
    stopAll();
  }

  // console.log('At least one source of audio is still playing:', audioIsPLaying);
}

function hideUnhideElements(isRecording = false) {
  const muteButtons = document.querySelectorAll('.mute-button');
  let count = muteButtons.length;

  if (backingTrack.isReady) count++;

  const isHidden = isRecording || count < 2; // during recording, always hide!

  stopAllButton.hidden = isHidden;
  playPauseAllButton.hidden = isHidden;
  combineSelectedButton.hidden = isHidden;

  const pSpeedCont = document.getElementById('playback-speed-container');
  pSpeedCont.hidden = count <= 0;

  return `total count is ${count}. Where ${
    backingTrack.isReady
      ? 'one is the backing track!'
      : 'none is the backing track!'
  }`;
}

// debug event fo playback volume
document.getElementById('musicolab-logo').addEventListener('click', e => {
  console.log('------------');
  console.log(
    'backing tracking volume =',
    backingTrack.backend.gainNode.gain.value
  );

  for (let w = 0; w < wavesurfers.length; w++) {
    console.log(
      'recording volume [' + w + '] =',
      wavesurfers[w].backend.gainNode.gain.value
    );
  }
});
