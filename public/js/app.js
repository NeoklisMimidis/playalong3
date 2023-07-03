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

document.addEventListener('DOMContentLoaded', function () {
  //
  console.log(window.playerStates);
});

const baseUrl =
  window.location.hostname === 'localhost'
    ? 'http://localhost:5500'
    : 'https://musicolab.hmu.gr:8080';

const deletedUserImageSrc = `${baseUrl}/images/deletedUser.svg`;

let otherUserRecording;

// Create an instance of wavesurfer for the audio file to be followed
let wavesurfer0 = {};

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
var gumStream; //stream from getUserMedia()
var rec; //Recorder.js object
var input; //MediaStreamAudioSourceNode we'll be recording
const constraints = {
  audio: { echoCancellation: false },
};
var delayedStart = 1000;
var count = 1;
var speedMatrix = [];
var speedMatrixRatio = [];
var speed = 100;
var speed01 = 1;
window.speed01 = 1;
window.tempo = 90;
speedMatrix[0] = 1;

// Jitsi room parameters
var Jitsi_Room_Name = 'test-room';
var Jitsi_User_Name = 'test-user';
if (userParam) {
  Jitsi_User_Name = userParam;
}
var Jitsi_Course_Name = 'test-room';
if (courseParam) {
  Jitsi_Course_Name = courseParam;
}
var roomNameInput = document.querySelector('#meet-room');
roomNameInput.value = Jitsi_Course_Name;
var Collab = false;
if (collabParam === 'true' && courseParam !== null) {
  Collab = true;
}

var wavesurfers = []; // Array to hold all wavesurfers instances from recordings
var recordedBlobs = []; // Array to hold all the recorded blobs
var selectedBlobs = []; // Array to hold all blobs to be mixed
var recordedBuffers = []; // Array to hold all PCM audio recordings
var selectedBuffers = []; // Array to hold all PCM audio recordings to be mixed
var noRecordings = 0; // Holds how many are the audio recordings
var sampleRate = 44100; // this will hold the sample rate used for recordings --> see some lines below

// shim for AudioContext when it's not avb.
//var AudioContext = window.AudioContext || window.webkitAudioContext;

// audio context with specified sample rate to help us record
// do not redeclare
var audioContext = new AudioContext({
  sampleRate: sampleRate,
});
var recordButton = document.getElementById('recordButton');
var stopButton = document.getElementById('stopButton');
var pauseButton = document.getElementById('pauseButton');
var playPauseAllButton = document.getElementById('playpauseallButton');
var playAllButton = document.getElementById('playallButton');
var pauseAllButton = document.getElementById('pauseallButton');
var stopAllButton = document.getElementById('stopallButton');
var combineSelectedButton = document.getElementById('combineselectedButton');

var playPauseButton0 = document.getElementById('playPauseButton0');
var playButton0 = document.getElementById('playButton0');
var pauseButton0 = document.getElementById('pauseButton0');
var muteButton0 = document.getElementById('muteButton0');
var stopButton0 = document.getElementById('stopButton0');
var waveform0Container = document.getElementById('waveform0');
var waveform_micContainer = document.getElementById('waveform_mic');
var timeline0Container = document.getElementById('timeline0');
var controls0Container = document.getElementById('controls0');
controls0Container.removeAttribute('hidden');

waveform0Container.setAttribute('hidden', 'true');
timeline0Container.setAttribute('hidden', 'true');
//controls0Container.setAttribute("hidden","true");

playPauseButton0.innerHTML =
  '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
playPauseButton0.className = 'wavesurfer-button btn btn-lg';
playPauseButton0.setAttribute('title', 'Play');
playPauseButton0.setAttribute('hidden', 'true');
muteButton0.innerHTML =
  '<svg fill="#000000" width="45" height="45" viewBox="-2.5 0 19 19" xmlns="http://www.w3.org/2000/svg" class="cf-icon-svg"><path d="M7.365 4.785v9.63c0 .61-.353.756-.784.325l-2.896-2.896H1.708A1.112 1.112 0 0 1 .6 10.736V8.464a1.112 1.112 0 0 1 1.108-1.108h1.977L6.581 4.46c.43-.43.784-.285.784.325zm2.468 7.311a3.53 3.53 0 0 0 0-4.992.554.554 0 0 0-.784.784 2.425 2.425 0 0 1 0 3.425.554.554 0 1 0 .784.783zm1.791 1.792a6.059 6.059 0 0 0 0-8.575.554.554 0 1 0-.784.783 4.955 4.955 0 0 1 0 7.008.554.554 0 1 0 .784.784z"/></svg>';
muteButton0.className = 'wavesurfer-button btn btn-lg';
muteButton0.title = 'Mute';
muteButton0.setAttribute('hidden', 'true');
stopButton0.innerHTML =
  '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="black" class="bi bi-skip-start-fill" viewBox="0 0 16 16"><path d="M4 4a.5.5 0 0 1 1 0v3.248l6.267-3.636c.54-.313 1.232.066 1.232.696v7.384c0 .63-.692 1.01-1.232.697L5 8.753V12a.5.5 0 0 1-1 0V4z" /></svg>';
stopButton0.className = 'wavesurfer-button btn btn-lg';
stopButton0.title = 'Stop';
stopButton0.setAttribute('hidden', 'true');
playButton0.setAttribute('hidden', 'true');
playButton0.title = '';
pauseButton0.setAttribute('hidden', 'true');

//add events to some buttons
recordButton.addEventListener('click', () => {
  if (!!Collab && otherUserRecording) {
    const notifText = "You can't record while someone else is recording.";
    const notifContext = 'danger';
    notify(notifText, notifContext);

    return;
  }
  startRecording();
  !!Collab
    ? window.awareness.setLocalStateField('record', {
        status: 'start',
        recUserData: { id: idParam, name: userParam },
      })
    : null;
});
stopButton.addEventListener('click', () => {
  stopRecording();
  !!Collab
    ? window.awareness.setLocalStateField('record', {
        status: 'stop',
        recUserData: { id: idParam, name: userParam },
      })
    : null;
});
pauseButton.addEventListener('click', pauseRecording);
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

// function to adjust playback volume for backing track and all recordings
function setPlaybackVolume(currentvolume, u, u0) {
  if (wavesurfers.length == 0) {
    return;
  }
  var muteButtons = document.querySelectorAll('.mute-button');
  var wave0 = 0;
  var unmuted = 0;
  var unmuted0 = 0;
  if (playPauseButton0.hidden == false) wave0 = 1;
  for (var i = 0; i < muteButtons.length; i++) {
    // lets check if the waveforms are unmuted
    if (muteButtons[i].title == 'Mute') {
      unmuted++;
    }
  }
  if (wavesurfer0.getMute() == false || u0 == true) {
    if (wave0 == 1) {
      console.log('wavesurfer0 is NOT muted');
      unmuted++;
      unmuted0 = 1;
    }
  } else {
    console.log('wavesurfer0 IS muted');
  }
  //if (u == true) {
  //  unmuted++;
  //}
  console.log(
    'There are currently',
    wavesurfers.length + wave0,
    'waveSurfers.',
    unmuted,
    'of them are unmuted'
  );
  if (unmuted <= 1) {
    return;
  }
  // if unmute is clicked (only lower volume, do not increase)
  if (u == true) {
    if (unmuted == 2) {
      if (currentvolume < 0.5) {
        console.log('Current volume is', currentvolume);
        console.log('I will not raise it to 0.5');
        return;
      }
      volume = 0.5;
      for (var w = 0; w < wavesurfers.length; w++) {
        wavesurfers[w].setVolume(volume);
        console.log('(unmuted = 2) so volume [' + w + '] =', volume);
      }
      wavesurfer0.setVolume(volume);
      console.log('volume0 =', volume);
    }
    if (unmuted >= 3) {
      if (unmuted0 == 1) {
        wavesurfer0.setVolume(0.4);
        console.log('volume0 = 0.4');
        if (currentvolume < 0.6 / (unmuted - 1)) {
          console.log('Current volume is', currentvolume);
          console.log('I will not raise it to', 0.6 / (unmuted - 1));
          return;
        }
        volume = 0.6 / (unmuted - 1);
        for (var w = 0; w < wavesurfers.length; w++) {
          wavesurfers[w].setVolume(volume);
          console.log('volume [' + w + '] =', volume);
        }
      } else {
        console.log('wavesurfer0 is muted, no volume adjustment');
        if (currentvolume < 1 / unmuted) {
          return;
        }
        volume = 1 / unmuted;
        for (var w = 0; w < wavesurfers.length; w++) {
          wavesurfers[w].setVolume(volume);
          console.log('volume [' + w + '] =', volume);
        }
      }
    }
  }

  if (u == false) {
    if (unmuted < 2) {
      volume = 1;
      for (var w = 0; w < wavesurfers.length; w++) {
        wavesurfers[w].setVolume(volume);
        console.log('(unmuted < 2) so volume [' + w + '] =', volume);
      }
      wavesurfer0.setVolume(volume);
      console.log('All volume values are set to 1');
    }
    if (unmuted == 2) {
      volume = 0.5;
      for (var w = 0; w < wavesurfers.length; w++) {
        wavesurfers[w].setVolume(volume);
        console.log('(unmuted = 2) so volume [' + w + '] =', volume);
      }
      wavesurfer0.setVolume(volume);
      console.log('volume0 =', volume);
    }
    if (unmuted >= 3) {
      if (unmuted0 == 1) {
        wavesurfer0.setVolume(0.4);
        console.log('volume0 = 0.4');
        volume = 0.6 / (unmuted - 1);
        for (var w = 0; w < wavesurfers.length; w++) {
          wavesurfers[w].setVolume(volume);
          console.log('volume [' + w + '] =', volume);
        }
      } else {
        console.log('wavesurfer0 is muted, no volume adjustment');
        volume = 1 / unmuted;
        for (var w = 0; w < wavesurfers.length; w++) {
          wavesurfers[w].setVolume(volume);
          console.log('volume [' + w + '] =', volume);
        }
      }
    }
  }
  // now "repair" muted recording by returning their volume to zero (reclick mute)
  var hiddenMuteButtons = document.querySelectorAll('.hidden-mute-button');
  for (var m = 0; m < hiddenMuteButtons.length; m++) {
    // lets check if the waveforms were muted
    if (muteButtons[m].title == 'Unmute') {
      hiddenMuteButtons[m].click();
      console.log('muted', m);
    }
  }
  if (document.getElementById('muteButton0').title == 'Unmute') {
    wavesurfer0.setVolume(0);
  }
}

// function to reset playback volume when rec or playall stops
function resetPlaybackVolume() {
  var muteButtons = document.querySelectorAll('.mute-button');
  volume = 1;
  for (var w = 0; w < wavesurfers.length; w++) {
    wavesurfers[w].setVolume(1);
  }
  wavesurfer0.setVolume(1);
  console.log('Volume level set to 1 for all waveforms');
  // now "repair" muted recording by returning their volume to zero (reclick mute)
  var hiddenMuteButtons = document.querySelectorAll('.hidden-mute-button');
  for (var m = 0; m < hiddenMuteButtons.length; m++) {
    //lets check if the waveforms were muted
    if (muteButtons[m].title == 'Unmute') {
      hiddenMuteButtons[m].click();
      console.log('muted', m);
    }
  }
  if (document.getElementById('muteButton0').title == 'Unmute') {
    wavesurfer0.setVolume(0);
  }
}

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

// recording section ///////////////////////////////////////////////////////
function startRecording() {
  //console.log("recordButton clicked");
  document.getElementById('speedSlider').disabled = true;
  stopAllButton.setAttribute('hidden', 'true');
  playPauseAllButton.setAttribute('hidden', 'true');
  var playButtons = document.querySelectorAll('.play-button');
  var playPauseButtons = document.querySelectorAll('.play-pause-button');
  //console.log("click all play buttons")
  //console.log("playButtons.length = ",playButtons.length);

  //if (muteButton0.getAttribute("title") === "Mute") {
  //countdown ();
  //}

  playAll();

  recordButton.disabled = true;
  recordButton.setAttribute('title', '');
  //recordButton.classList.add("flash");
  stopButton.disabled = false;
  stopButton.setAttribute('title', 'Stop recording');
  pauseButton.disabled = false;
  pauseButton.setAttribute('title', 'Pause recording');
  playPauseButton0.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';

  /*
        We're using the standard promise based getUserMedia()
        https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    */

  navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
    //console.log("getUserMedia() success, stream created, initializing Recorder.js ...");

    /*
            create an audio context after getUserMedia is called
            sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
            the sampleRate defaults to the one set in your OS for your playback device

        */
    //audioContext = new AudioContext(); // do not redeclare

    //update the format
    document.getElementById('formats').innerHTML =
      'Format: 1 channel pcm @ ' + audioContext.sampleRate / 1000 + 'kHz';

    /* assign to gumStream for later use */
    gumStream = stream;

    /* use the stream */
    input = audioContext.createMediaStreamSource(stream);

    /*
            Create the Recorder object and configure to record mono sound (1 channel)
            Recording 2 channels will double the file size
        */
    rec = new Recorder(input, { numChannels: 1 });
    sampleRate = rec.context.sampleRate;
    //console.log("sampleRate = ",sampleRate,"Hz");
    //start the recording process

    rec.record();
    //console.log("Recording started");

    //show microphone animation
    wavesurfer_mic.microphone.start();
    waveform_micContainer.removeAttribute('hidden');

    if (start_bar < stop_bar) parent.metronome.setPlayStop(true);
    setTimeout(function () {
      parent.metronome.setPlayStop(true);
    }, delayedStart / speed01);
  });
  //}).catch(function(err) {
  //enable the record button if getUserMedia() fails
  //	recordButton.disabled = false;
  //	stopButton.disabled = false;
  //	pauseButton.disabled = true;
  //});
}

function pauseRecording() {
  //console.log("pauseButton clicked rec.recording=",rec.recording );
  var pauseButtons = document.querySelectorAll('.pause-button');
  var playButtons = document.querySelectorAll('.play-button');
  var playPauseButtons = document.querySelectorAll('.play-pause-button');
  //console.log("click all pause buttons if recording is paused");
  //console.log("and all play buttons if recording is resumed");
  //console.log("pauseButtons.length = ",pauseButtons.length);

  if (rec.recording) {
    //pause recording
    rec.stop();
    wavesurfer_mic.microphone.pause();
    wavesurfer_mic.pause();
    //waveform_micContainer.setAttribute('hidden','true');
    parent.metronome.setPlayStop(false);
    pauseButton.disabled = false;
    pauseButton.setAttribute('title', 'Resume recording');
    pauseButton.classList.add('flash');
    recordButton.disabled = true;
    recordButton.classList.remove('flash');
    pauseButton0.click();
    playPauseButton0.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    playPauseButton0.title = 'Play';
    for (var i = 0; i < pauseButtons.length; i++) {
      //console.log(i);
      pauseButtons[i].click();
      playPauseButtons[i].innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
      //playPauseButtons[i].innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
      playPauseButtons[i].setAttribute('title', 'Play');
      //playPauseButtons[i].setAttribute("title","Pause");
    }
  } else {
    //resume recording
    //console.log("Resuming recording...");
    //waveform_micContainer.removeAttribute('hidden');
    rec.record();
    wavesurfer_mic.microphone.start();
    parent.metronome.setPlayStop(true);
    pauseButton.disabled = false;
    pauseButton.setAttribute('title', 'Pause recording');
    pauseButton.classList.remove('flash');
    recordButton.classList.add('flash');
    playButton0.click();
    playPauseButton0.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
    playPauseButton0.title = 'Pause';
    for (var i = 0; i < pauseButtons.length; i++) {
      //console.log(i);
      playButtons[i].click();
      //playPauseButtons[i].innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
      playPauseButtons[i].innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor"	class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
      //playPauseButtons[i].setAttribute("title","Play");
      playPauseButtons[i].setAttribute('title', 'Pause');
      recordButton.disabled = true;
    }
  }
}

function stopRecording() {
  console.log('stopButton clicked');
  document.getElementById('speedSlider').disabled = false;
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
    playPauseButtons[i].innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    //playPauseButtons[i].innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
    playPauseButtons[i].setAttribute('title', 'Play');
    //playPauseButtons[i].setAttribute("title","Pause");
  }
  stopButton0.click();

  //disable the stop button, enable the record too allow for new recordings
  stopButton.disabled = true;
  stopButton.setAttribute('title', '');
  recordButton.disabled = false;
  recordButton.setAttribute('title', 'Start recording');
  pauseButton.disabled = true;
  pauseButton.setAttribute('title', '');
  //recordButton.classList.remove("flash");
  pauseButton.classList.remove('flash');
  playPauseButton0.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
  playPauseButton0.title = 'Play';
  playPauseAllButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
  playPauseAllButton.hidden = false;
  playPauseAllButton.title = 'Play all';
  stopAllButton.hidden = false;

  combineSelectedButton.hidden = false;
  //reset button just in case the recording is stopped while paused
  pauseButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';

  //tell the recorder to stop the recording
  rec.stop();
  noRecordings++;
  //console.log("Number of recordings = ",noRecordings);

  //stop microphone animation
  wavesurfer_mic.microphone.stop();
  waveform_micContainer.setAttribute('hidden', 'true');

  //stop metronome
  parent.metronome.setPlayStop(false);

  //stop microphone access
  gumStream.getAudioTracks()[0].stop();

  //get the raw PCM audio data as an array of float32 numbers
  rec.getBuffer(function (buffer) {
    recordedBuffers.push(buffer); //push the buffer to an array
    //console.log("recordedBuffers = ", recordedBuffers);

    if (!!Collab && window.sharedRecordedBlobs != null) {
      const data = Array.from(buffer[0]);
      const obj = {
        id: generateID(),
        speed: speed01,
        set_pitch: 1 / speed01,
        userName: userParam,
        userId: idParam,
        sampleRate,
        count,
      };
      addSharedBuffer(data, obj);
    }
  });

  if (!Collab) {
    rec.exportWAV(createDownloadLink);
  }

  rec.exportWAV(function (blob) {
    recordedBlobs.push(blob);
    //console.log("recordedBlobs", recordedBlobs);
  });
  console.log('recordedBlobs', recordedBlobs);
  console.log('recordedBuffers = ', recordedBuffers);
  //recordedBuffers.forEach(buffer => {
  //	console.log("length",buffer.byteLength);
  //});
  stopAllButton.disabled = true;
  console.log('disabled StopALl button');
  stopAllButton.setAttribute('title', '');
  resetPlaybackVolume();
}
// end recording section ///////////////////////////////////////////////////////

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
      // create a temporary link element to trigger the download
      var tempLink = document.createElement('a');
      var unique_filename = new Date().toISOString();
      tempLink.download = unique_filename + '.wav';
      tempLink.href = url;
      tempLink.click();
    });
  }
}

function createRecordingTemplate(recUserData) {
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

function fillRecordingTemplate(
  id,
  recUserData,
  speed = speed01,
  set_pitch = 1 / speed01
) {
  const scrollContainer = document.getElementById(`scrollContainer${count}`);
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
      if (stopAllButton.disabled == false) {
        setPlaybackVolume(volume, true, false);
      }
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
    wavesurfers.splice(deleteIndex - 1, 1);
    console.log('wavesurfers', wavesurfers);
    scrollContainer.parentNode.removeChild(scrollContainer);
    timelineContainer.parentNode.removeChild(timelineContainer);
    buttonContainer.parentNode.removeChild(buttonContainer);
    outmostContainer.remove();
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
          window.sharedRecordedBlobs.get(indexToUpdate).set('chunks', [0]);
          window.sharedRecordedBlobs.get(indexToUpdate).set('test', [0]);
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
    // prettier-ignore
    if (window.confirm("This track will be removed for everyone. Are you sure you want to delete it?")) {
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
}

function createDownloadLink(
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
      if (stopAllButton.disabled == false) {
        setPlaybackVolume(volume, true, false);
      }
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
    // create a temporary link element to trigger the download
    var tempLink = document.createElement('a');
    var unique_filename = new Date().toISOString();
    tempLink.download = unique_filename + '.wav';
    tempLink.href = url;
    tempLink.click();
  });
  buttonContainer.appendChild(downloadButton);

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
    wavesurfers.splice(deleteIndex - 1, 1);
    console.log('wavesurfers', wavesurfers);
    scrollContainer.parentNode.removeChild(scrollContainer);
    timelineContainer.parentNode.removeChild(timelineContainer);
    buttonContainer.parentNode.removeChild(buttonContainer);
    outmostContainer.remove();
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
}

function combineSelected() {
  // DEBUG ONLY PURPOSE !!!!!!!!!!!!!!!!!!!!!!! COMMENT OUT ALL BELOW ************************************************
  //resampleAudioBuffer (recordedBlobs[0],44100,22050);
  //return;

  // DEBUG ONLY PURPOSE !!!!!!!!!!!!!!!!!!!!!!! COMMENT OUT ALL ABOVE ************************************************

  //console.log("combine files to single wav clicked");
  var length = 0;
  var maxRecLenth = 0;
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
        Collab &&
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

  for (let n = 0; n < noBuffers; n++) {
    length = selectedBuffers[n][0].length;
    //console.log("Recording's ",n+1," lenght = ",length);
    if (length > maxRecLenth) {
      maxRecLenth = length;
    }
  }
  //console.log("maximum length of selected recordings = ",maxRecLenth);
  mixAudioBuffers(selectedBuffers, maxRecLenth, sampleRates);
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

function mixAudioBuffers(buffers, length, sampleRates = []) {
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
  var tempLink = document.createElement('a');
  var unique_filename = new Date().toISOString();
  tempLink.download = unique_filename + '.wav';
  tempLink.href = url;
  tempLink.click();
}

// Read a file
function readSingleFile(e) {
  /** @type {File} */
  var file = e.target.files[0];
  if (!file) {
    return;
  }
  var reader = new FileReader();
  const fileInput = document.getElementById('file-input');
  const fileName = fileInput.value.split(/(\\|\/)/g).pop();
  roomNameInput.value = 'test-room';
  document.getElementById('file_label').innerHTML =
    'Following: "' +
    fileName +
    '".&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Change backing track:';
  document.getElementById('file_name').innerHTML = fileName;
  console.log('Filename = ', document.getElementById('file_name').innerHTML);
  waveform0Container.removeAttribute('hidden');
  timeline0Container.removeAttribute('hidden');
  controls0Container.removeAttribute('hidden');
  stopButton0.removeAttribute('hidden');
  playPauseButton0.removeAttribute('hidden');
  muteButton0.removeAttribute('hidden');
  reader.onload = function (e) {
    var contents = e.target.result;
    console.log({ contents });
    wavesurfer0.loadArrayBuffer(contents);

    if (Collab) {
      shareBackingTrack(file)
        .then(() => {
          console.log(`file ${file.name} was shared with peers`);
          removeFileURLParam();
        })
        .catch(err =>
          console.error(`failed to share file ${file.name} with peers`, err)
        );
    }
    displayContents(contents);
  };
  reader.readAsArrayBuffer(file);
}

/**
 * @param {File} file
 */
async function shareBackingTrack(file) {
  try {
    const rawData = Array.from(new Int8Array(await file.arrayBuffer()));
    let fileInfo = new Y.Map();

    const chunksArray = new Y.Array();
    window.ydoc?.transact(() => {
      fileInfo.set('name', file.name);
      fileInfo.set('size', file.size);
      fileInfo.set('type', file.name);
      fileInfo.set('data', chunksArray);
      window.playerConfig.set('backingTrack', fileInfo);
      window.playerConfig.delete('backingTrackRepository');
    });

    // fileInfo.set("data", chunksArray);
    for (let i = 0; i < rawData.length; i += 20000) {
      chunksArray.push(rawData.slice(i, i + 20000));
    }
  } catch (err) {
    return Promise.reject(err);
  }
}

function removeFileURLParam() {
  urlParams.delete('f');
  history.pushState({}, '', '?' + urlParams.toString());
}

function setFileURLParam(file) {
  urlParams.set('f', file);
  history.pushState({}, '', '?' + urlParams.toString());
}

// Load the backing track another peer has loaded on the file picker
function setBackingTrackRemote(fileName) {
  if (!fileName) {
    console.warn('failed to set backing track from peers');
    return;
  }

  document.getElementById('file_label').innerHTML =
    'Following: "' +
    fileName +
    '".&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Change backing track:';
  waveform0Container.removeAttribute('hidden');
  timeline0Container.removeAttribute('hidden');
  controls0Container.removeAttribute('hidden');
  stopButton0.removeAttribute('hidden');
  playPauseButton0.removeAttribute('hidden');
  muteButton0.removeAttribute('hidden');

  // let file = new File(
  //   [Int8Array.from(fileInfo.get("data"))],
  //   fileInfo.get("name"),
  //   {
  //     type: fileInfo.get("type"),
  //   }
  // );
  // let reader = new FileReader();
  // reader.onload = (e) => {
  //   console.log("loading remote file", e.target.result);
  //   wavesurfer0.loadArrayBuffer(e.target.result);
  //   removeFileURLParam();
  // };
  // reader.readAsArrayBuffer(file);
}

function setBackingTrackFileRemote(fileInfo) {
  if (!fileInfo) {
    console.warn('failed to set backing track file data from peers');
    return;
  }

  let file = new File(
    [Int8Array.from(fileInfo.get('data'))],
    fileInfo.get('name'),
    {
      type: fileInfo.get('type'),
    }
  );
  let reader = new FileReader();
  reader.onload = e => {
    console.log('loading remote file', e.target.result);
    wavesurfer0.loadArrayBuffer(e.target.result);
    removeFileURLParam();
  };
  reader.readAsArrayBuffer(file);
}

function setBackingTrackRepositoryRemote(fileName) {
  if (!fileName || fileName.length === 0) {
    console.warn(
      'unknown filename: failed to set repository file shared by peers as backing track'
    );
    return;
  }

  loadUrlFile(fileName, courseParam, userParam);
  setFileURLParam(fileName);
}

// Load a file from url
function loadUrlFile(f, c, u) {
  Jitsi_User_Name = u;
  document.getElementById('file_label').innerHTML =
    'Following: "' +
    f +
    '".&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Change backing track:';
  var reader = new FileReader();
  waveform0Container.removeAttribute('hidden');
  timeline0Container.removeAttribute('hidden');
  controls0Container.removeAttribute('hidden');
  stopButton0.removeAttribute('hidden');
  playPauseButton0.removeAttribute('hidden');
  muteButton0.removeAttribute('hidden');
  //console.log("file = ", f);
  //console.log("course = ", c);
  //console.log("user = ", u);
  wavesurfer0.load(
    `https://musicolab.hmu.gr/apprepository/downloadPublicFile.php?f=${f}`
  );
  reader.onload = function (f) {
    var contents = f.target.result;
    //console.log("contents =", contents);
    wavesurfer0.loadArrayBuffer(contents);
    //displayContents(contents);
  };
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
  setPlaybackVolume(volume, false, false);
  for (var i = 0; i < playButtons.length; i++) {
    //console.log(i);
    playButtons[i].click();
    playPauseButtons[i].innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor"	class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
    playPauseButtons[i].setAttribute('title', 'Pause');
    playPauseButton0.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
    playPauseButton0.setAttribute('title', 'Pause');
  }

  if (wavesurfer0.getCurrentTime() === 0) {
    setTimeout(function () {
      playButton0.click();
    }, delayedStart / speed01);
  } else {
    playButton0.click();
  }
}

function pauseAll() {
  document.getElementById('speedSlider').disabled = false;
  //console.log("playPauseAllButton (PAUSE) clicked");
  playPauseAllButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
  playPauseAllButton.title = 'Play all';
  pauseButton0.click();
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
    playPauseButton0.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    playPauseButton0.setAttribute('title', 'Play');
  }
}

function stopAll() {
  //console.log("stopAllButton clicked");
  stopAllButton.disabled = true;
  stopAllButton.setAttribute('title', '');
  document.getElementById('speedSlider').disabled = false;
  playPauseAllButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
  playPauseAllButton.title = 'Play all';
  stopButton0.click();
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
  resetPlaybackVolume();
}

function speedSliderEnableCheck() {
  //console.log("Checking if speed slider can be enabled again");
  var playPauseButtons = document.querySelectorAll('.play-pause-button');
  //console.log("playPauseButton0.title =", playPauseButton0.title);
  if (playPauseButton0.title === 'Play') {
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

function displayContents(contents) {
  var element = document.getElementById('file-content');
  element.textContent = contents;
}

document
  .getElementById('file-input')
  .addEventListener('change', readSingleFile, false);

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

// Init & load audio file
document.addEventListener('DOMContentLoaded', function () {
  let playPauseButton0 = document.querySelector('#playPauseButton0'),
    muteButton0 = document.querySelector('#muteButton0'),
    stopButton0 = document.querySelector('#stopButton0'),
    selectedfile = document
      .getElementById('file-input')
      .addEventListener('change', readSingleFile, false);
  wavesurfer0 = WaveSurfer.create({
    container: document.querySelector('#waveform0'),
    height: 50,
    scrollParent: true,
    normalize: true,
    plugins: [
      WaveSurfer.cursor.create({
        showTime: true,
        opacity: 1,
        customShowTimeStyle: {
          'background-color': '#555',
          color: '#0f5',
          padding: '2px',
          'font-size': '10px',
        },
      }),
      WaveSurfer.timeline.create({
        container: document.querySelector('#timeline0'), // specify the container for the timeline
        height: 20, // specify the height of the timeline
      }),
    ],
  });

  wavesurfer0.on('error', function (e) {
    console.warn(e);
  });

  // if file parameter in url, load audio file to follow
  // Check if the 'f' parameter is present in the URL
  if (fileParam) {
    //console.log("file = ",fileParam);
    if (privParam) {
      loadUrlFile(fileParam, courseParam, userParam, privParam, uidParam);
    } else {
      privParam = false;
      loadUrlFile(fileParam, courseParam, userParam, privParam);
    }
  } else {
    console.log('Missing "f" parameter in URL, no audio file loaded');
  }

  wavesurfer0.on('ready', function () {
    let st = new window.soundtouch.SoundTouch(
      wavesurfer0.backend.ac.sampleRate
    );
    let buffer = wavesurfer0.backend.buffer;
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

    wavesurfer0.on('play', function () {
      seekingPos = ~~(wavesurfer0.backend.getPlayedPercents() * length);
      st.tempo = wavesurfer0.getPlaybackRate();

      if (st.tempo === 1) {
        wavesurfer0.backend.disconnectFilters();
      } else {
        if (!soundtouchNode) {
          let filter = new window.soundtouch.SimpleFilter(source, st);
          soundtouchNode = window.soundtouch.getWebAudioNode(
            wavesurfer0.backend.ac,
            filter
          );
        } else {
        }
        wavesurfer0.backend.setFilter(soundtouchNode);
      }
    });

    wavesurfer0.on('pause', function () {
      soundtouchNode && soundtouchNode.disconnect();
    });

    wavesurfer0.on('seek', function () {
      seekingPos = ~~(wavesurfer0.backend.getPlayedPercents() * length);
    });
    wavesurfer0.on('finish', function () {
      //wavesurfer.seekTo(0); // move the cursor to the beggining of the wavesurfer waveform
      playPauseButton0.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
      playPauseButton0.title = 'Play';
      speedSliderEnableCheck();
    });
  });

  // Play-pause button
  playPauseButton0.onclick = function () {
    console.log('speed01 =', speed01);
    wavesurfer0.setPlaybackRate(speed01);
    if (wavesurfer0.isPlaying()) {
      pauseButton0.click();
      playPauseButton0.setAttribute('title', 'Play');
      playPauseButton0.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
      speedSliderEnableCheck();
    } else {
      playButton0.click();
      playPauseButton0.setAttribute('title', 'Pause');
      playPauseButton0.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
    }
  };

  // Play button
  playButton0.onclick = function () {
    wavesurfer0.setPlaybackRate(speed01);
    wavesurfer0.play();
    document.getElementById('speedSlider').disabled = true;
    stopAllButton.disabled = false;
    stopAllButton.setAttribute('title', 'Stop All');
  };
  // Pause button
  pauseButton0.onclick = function () {
    wavesurfer0.pause();
    speedSliderEnableCheck();
  };
  // Mute-Unmute button
  muteButton0.onclick = function () {
    //wavesurfer0.toggleMute();
    if (wavesurfer0.getMute()) {
      wavesurfer0.setMute(false);
      muteButton0.setAttribute('title', 'Mute');
      muteButton0.innerHTML =
        '<svg fill="#000000" width="45" height="45" viewBox="-2.5 0 19 19" xmlns="http://www.w3.org/2000/svg" class="cf-icon-svg"><path d="M7.365 4.785v9.63c0 .61-.353.756-.784.325l-2.896-2.896H1.708A1.112 1.112 0 0 1 .6 10.736V8.464a1.112 1.112 0 0 1 1.108-1.108h1.977L6.581 4.46c.43-.43.784-.285.784.325zm2.468 7.311a3.53 3.53 0 0 0 0-4.992.554.554 0 0 0-.784.784 2.425 2.425 0 0 1 0 3.425.554.554 0 1 0 .784.783zm1.791 1.792a6.059 6.059 0 0 0 0-8.575.554.554 0 1 0-.784.783 4.955 4.955 0 0 1 0 7.008.554.554 0 1 0 .784.784z"/></svg>';
      if (stopAllButton.disabled == false) {
        setPlaybackVolume(volume, false, true);
      }
    } else {
      wavesurfer0.setMute(true);
      muteButton0.setAttribute('title', 'Unmute');
      muteButton0.innerHTML =
        '<svg fill="#000000" width="45" height="45" viewBox="0 0 19 19" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m2 7.5v3c0 .8.6 1.5 1.4 1.5h2.3l3.2 2.8c.1.1.3.2.4.2s.2 0 .3-.1c.2-.1.4-.4.4-.7v-.9l-7.2-7.2c-.5.2-.8.8-.8 1.4zm8 2v-5.8c0-.3-.1-.5-.4-.7-.1 0-.2 0-.3 0s-.3 0-.4.2l-2.8 2.5-4.1-4.1-1 1 3.4 3.4 5.6 5.6 3.6 3.6 1-1z" fill-rule="evenodd"/></svg>';
    }
  };
  // Stop button
  stopButton0.onclick = function () {
    wavesurfer0.stop();
    playPauseButton0.setAttribute('title', 'Play');
    playPauseButton0.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    speedSliderEnableCheck();
  };

  !Collab
    ? (document.querySelector('.users-online-container').style.display = 'none')
    : null;

  if (courseParam?.length > 0) {
    document.getElementById('repository-files-course').textContent =
      courseParam;
    window.initRepositoryTrackList(courseParam);
  }
});

function notify(text, context) {
  const notification = document.createElement('div');
  notification.setAttribute('role', 'alert');
  notification.className = `alert alert-${context} notification`;
  notification.innerText = text;

  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 3000);
}
