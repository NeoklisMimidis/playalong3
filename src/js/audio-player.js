'use strict';

import WaveSurfer from 'wavesurfer.js';

import cursorPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.cursor.min.js';
import regionsPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.regions.min.js';
import timelinePlugin from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.min.js';
import markersPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.markers.min.js';
import minimapPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.minimap.min.js';

import { loadJAMS, tooltips } from './audio-player/render-annotations.js';

import { toolbarStates } from './annotation-tools.js';

import { setupPlayerControlsEvents } from './audio-player/player-controls.js';

import {
  tooltips,
  AUDIO_PLAYER_TOOLTIPS,
  createTippySingleton,
} from './components/tooltips.js';

import Recorder from 'recorderjs';
window.Recorder = Recorder;

import {
  loadFile,
  fileSelectHandlers,
  dragDropHandlers,
  renderModalMessage,
  formatTime,
} from './components/utilities.js';

// Disable PARCEL Hot Module Reloading bcs it is buggy with Wavesurfer  // //
if (module.hot) {
  module.hot.dispose(() => {
    window.location.reload();
  });
}
// // // // // // // // // // // // // // // // // // // // // // // // // // //

/* Elements */
// Toolbar & pre-face instructions bars
export const audioPlayerAndControlsContainer = document.getElementById(
  'audio-player-and-controls-container'
);

const prefaceAudioHelp = document.querySelector('.preface-audio-help');
export const prefaceAnnotationBar = document.querySelector(
  '.preface-annotation-bar'
);
const audioFileNamePreface = document.getElementById('audio-file-name-preface');
export const toolbar = document.getElementById('toolbar');
const audioFileName = toolbar.querySelector('#audio-file-name');

// Waveform
export const mainWaveform = document.getElementById('waveform');
export const skipForwardCue = mainWaveform.querySelector('#skip-forward');
export const skipBackwardCue = mainWaveform.querySelector('#skip-backward');
export const mainWaveformBPM = mainWaveform.querySelector('#waveform-bpm');
// Audio I/O (Sidebar)
export const audioSidebarText = document.getElementById('audio-sidebar-text');
export const audioSidebarControls = document.getElementById(
  'audio-sidebar-controls'
);
const analyzeChordsBtn = document.getElementById('analyze-chords-btn');
export const downloadJAMSBtn = document.getElementById('download-jams-btn');

// Audio player bar controls
export const playerControls = document.querySelector('.player-controls');

// a) Left
export const zoomInBtn = playerControls.querySelector('#zoom-in-btn');
export const zoomOutBtn = playerControls.querySelector('#zoom-out-btn');
export const timeRulerBtn = playerControls.querySelector('#time-ruler-btn');
export const timeRulerValue = timeRulerBtn.querySelector('#time-ruler-value');
const audioDurationValue = timeRulerBtn.querySelector('#audio-duration-value');
// a) Center
const stopBtn = playerControls.querySelector('#stop-btn');
export const backwardBtn = playerControls.querySelector('#backward-btn');
export const playPauseBtn = playerControls.querySelector('#play-pause-btn');
export const playBtn = playPauseBtn.querySelector('.fa-play');
export const pauseBtn = playPauseBtn.querySelector('.fa-pause');
export const forwardBtn = playerControls.querySelector('#forward-btn');
export const recordBtn = playerControls.querySelector('#record-btn');
export const repeatBtn = playerControls.querySelector('#repeat-btn');
// a) Right
export const followPlaybackBtn = playerControls.querySelector(
  '#follow-playback-btn'
);
export const muteUnmuteBtn = playerControls.querySelector('#mute-unmute-btn');
export const muteBtn = muteUnmuteBtn.querySelector('.fa-volume-xmark');
export const unmuteBtn = muteUnmuteBtn.querySelector('.fa-volume-high');
export const volumeSlider = playerControls.querySelector('#volume-slider');

// Extract selectors IN TOOLTIPS.JS TODO

// State variables
let audioPlayerInitialized = false; //

export const playerStates = {
  FOLLOW_PLAYBACK: true,
  FOLLOW_PLAYBACK_OPTIONS: {
    destinationPoint: '0.20',
    pageTurnPoint: '0.80',
    scroll: false, // if scroll false then page turn
  },
  REPEAT: false,
  RECORD: false,
  LOOP_REGION: null,
  LOOP_SELECTION: false,
};

window.playerStates = playerStates;

// - Start of the application ||

toggleAudioInOutSidebarControls();

export let wavesurfer = initWavesurfer();

/* Loading file with Handlers about selection or dragging the appropriate files for app initialization */
// a) Importing audio
dragDropHandlers('#waveform', loadAudioFile, 'drag-over');
fileSelectHandlers('#import-audio-btn', loadAudioFile);
// b) Displaying annotation (JAMS)
fileSelectHandlers('#analyze-chords-btn', loadJAMS, '.jams');

/* Loading files from repository */
import audioFileURL1 from 'url:../../demo_files/test.mp3';
import annotationFile1 from 'url:../../demo_files/test.jams';

const urlParams = new URLSearchParams(window.location.search);
const urlFileName = urlParams.get('fileName');

if (window.location.hostname === 'localhost') {
  // A) Localhost (preload audio):
  loadFilesInOrder(audioFileURL1, annotationFile1);
} else if (
  window.location.hostname === 'musicolab.hmu.gr' &&
  urlFileName !== null
) {
  // B) MusiCoLab server:
  const urlFileNameWithoutExtension = urlFileName.substring(
    0,
    urlFileName.lastIndexOf('.')
  ); //  Starry+Night.mp3 --> Starry+Night

  const audioFileURL = `https://musicolab.hmu.gr/apprepository/downloadPublicFile.php?f=${urlFileName}`;
  const annotationFileUrl = `https://musicolab.hmu.gr/apprepository/downloadPublicFile.php?f=${urlFileNameWithoutExtension}.jams`;

  loadFilesInOrder(audioFileURL, annotationFileUrl);
} else {
  // In this case no audio loaded yet, so user is in the preface menu with description about how he can load audio file  (Drag & Drop audio file, 'Import audio' button, TODO: Record & Import from repository, moodle )
  resetAudioPlayer();
}

wavesurfer.on('loading', function (percent) {
  console.log('loading', percent);

  animateProgress(percent);
});

// catching wavesurfer errors
wavesurfer.on('error', function (error) {
  console.warn('Wavesurfer ☠️:', error);
});

wavesurfer.on('ready', function () {
  // display total audio duration in format: (00:00.0 min:sec.decisecond)
  const totalAudioDuration = formatTime(wavesurfer.getDuration());
  const displayedTotalDuration = `/ ${totalAudioDuration}`;
  audioDurationValue.textContent = displayedTotalDuration;

  //  make sure progress is 100% and then hide loading bar
  animateProgress(100, true);

  console.log('Waveform ready! 👍');
  console.log('     ------       ');
});

// -
function toggleAudioInOutSidebarControls() {
  audioSidebarText.addEventListener('click', e => {
    audioSidebarControls.classList.toggle('shown');
    audioSidebarText.classList.toggle('shown');
  });
}

function initWavesurfer() {
  const wavesurfer = WaveSurfer.create({
    container: '#waveform', // html element
    progressColor: 'rgba(244, 180, 38, 0.85)',
    minPxPerSec: 152,

    scrollParent: true,
    autoCenter: false, //(default: true)
    partialRender: false,
    forceDecode: true,

    cursorWidth: 2,
    barWidth: 2,
    normalize: true,

    // height: 128, // (default==128)
    // cursorColor: '#9e7215',
    // hideScrollbar: true,

    // Η ΠΗΓΗ ΤΟΥ ΚΑΚΟΥ: cursor plugin
    plugins: [
      cursorPlugin.create({
        showTime: true,
        opacity: 1,
        hideOnBlur: false,
        customShowTimeStyle: {
          backgroundColor: '#1996',
          color: '#fff',
          padding: '2px',
          'font-size': '10px',
          // transform: 'translate(0%, 150%)',
        },
      }),
      regionsPlugin.create({
        loop: true, // (default)
        drag: true, // (default)
        resize: true, // (default)
        id: 'loop-region',
        showTooltip: false,
        removeButton: true,
        dragSelection: true,
      }),
      markersPlugin.create(),
      timelinePlugin.create({
        container: '#wavetimeline',
        formatTimeCallback: formatTimeCallback,
        timeInterval: timeInterval,
        primaryLabelInterval: primaryLabelInterval,
        secondaryLabelInterval: secondaryLabelInterval,
        primaryColor: 'rgb(128, 128, 128)',
        primaryFontColor: 'rgb(128, 128, 128)',
        secondaryFontColor: 'black',
      }),
      minimapPlugin.create({
        height: 20,
        // progressColor: '#129',
        // waveColor: '#B5D8EB',
        // waveColor: '#A3C1AD',
        progressColor: '#777',
        // progressColor: 'rgba(244, 180, 38, 0.85)',
        cursorColor: '#999',
      }),
    ],
  });
  return wavesurfer;
}

function loadFilesInOrder(audioFileURL, annotationFileUrl) {
  console.log('Loading files...');

  loadAudioFile(audioFileURL);

  // On ready with loadFilesInOrder load and the annotation ONCE!
  wavesurfer.once('ready', function () {
    loadJAMS(annotationFileUrl);
  });
}

function loadAudioFile(input) {
  if (input === undefined) return;

  const [fileUrl, file] = loadFile(input);

  function loadAudio() {
    wavesurfer.empty();
    resetAudioPlayer();
    wavesurfer.load(fileUrl);
    initAudioPlayer();

    let fileName;
    wavesurfer.once('ready', function () {
      console.log('READY EVENT INSIDE loadAudioFile ✌️✅💪');

      // 3 cases:
      // a) import from handlers -drag or import buttons (use file.name)
      // b) repository link (retrieve name from URL)
      // c) localhost loading file (Use default: test.mp3)

      // prettier-ignore
      if (file !== undefined) {
        // a)
        fileName = file.name;
      } else if (file === undefined && window.location.hostname === 'musicolab.hmu.gr') {
        // b)
        fileName = urlFileName;
      } else if (file === undefined && window.location.hostname === 'localhost') {
        // c)
        fileName = 'test.mp3';
      }

      audioFileNamePreface.textContent = fileName.trim();
      audioFileName.textContent = audioFileNamePreface.textContent;

      activateAudioPlayerControls();
    });
  }

  if (file && !toolbarStates.SAVED) {
    const message = `You are about to import: <br> <span class="text-primary">${file.name}</span>.<br> Any unsaved changes on<br><span class="text-primary">${fileName}</span> will be <span class="text-warning">discarded.</span> <br><br><span class="text-info">Are you sure?</span> 🤷‍♂️`;

    // Change the state to true because the user selected to proceed (and visualizations depend on SAVED state)
    toolbarStates.SAVED = true;

    renderModalMessage(message)
      .then(() => {
        loadAudio();
        console.log(`New Audio imported while previous audio was NOT saved `);
      })
      .catch(() => {
        // User canceled || DON'T LOAD AUDIO!
      });
  } else {
    loadAudio();
    console.log(
      `New Audio imported while previous audio (if any) was saved (doesn't count for demo files)`
    );
  }
}

// -
function resetAudioPlayer() {
  // Reveal player and controls (useful for first load in slow connections)
  audioPlayerAndControlsContainer.classList.remove('d-none');

  // Edit options controls
  toolbar.classList.add('d-none'); //hide toolbar
  toolbar.classList.remove('editing-on'); // removing editing color

  // hide bpm
  mainWaveformBPM.classList.add('d-none');

  // Disable audio player controls while loading new audio file
  playerControls.classList.add('disabled');

  // Reset markers,regions & waveform
  wavesurfer.clearMarkers();
  wavesurfer.clearRegions();
  wavesurfer.empty();

  // Audio I/O
  analyzeChordsBtn.classList.add('disabled');
  downloadJAMSBtn.classList.add('disabled');

  console.log('resetAudioPlayer is complete 😁');
}

function initAudioPlayer() {
  // Setup events and tooltips ONCE (first webpage audio load)
  if (audioPlayerInitialized) return;

  /* Events (for audio player) */
  setupPlayerControlsEvents();

  mainWaveform.addEventListener('contextmenu', function (e) {
    e.preventDefault(); //prevent default behavior of right click
  });

  // not actually an event but it needs to be called ONCE
  tooltips.playerSingleton = createTippySingleton(
    '.player-controls .no-border',
    'data-tooltip',
    AUDIO_PLAYER_TOOLTIPS
  );

  console.log(
    'initAudioPlayer is complete! Events & tooltips for AUDIO PLAYER ready! ⚡'
  );
  audioPlayerInitialized = true;
}

function activateAudioPlayerControls() {
  // hide audio importing description
  prefaceAudioHelp.classList.add('d-none');
  prefaceAnnotationBar.classList.remove('d-none');

  // enable analyze button
  analyzeChordsBtn.classList.remove('disabled');

  // Re-enable player controls (new audio file is loaded)
  playerControls.classList.remove('disabled');

  // Left controls
  // zoomInBtn.classList.remove('disabled');
  // zoomOutBtn.classList.remove('disabled');

  // Center controls
  playBtn.classList.remove('d-none');
  pauseBtn.classList.add('d-none');

  recordBtn.classList.remove('record-enabled');
  playerStates.RECORD = false;

  repeatBtn.classList.remove('repeat-enabled');
  playerStates.REPEAT = false;

  muteBtn.classList.add('d-none');
  unmuteBtn.classList.remove('d-none');

  // Right controls
  volumeSlider.value = 0.5;
  wavesurfer.setVolume(0.5);

  console.log('activateAudioPlayerControls is complete 😁');
}

function animateProgress(progress, loadingComplete = false) {
  const loadingBar = document.querySelector('.waveform-loading-bar');
  const progressBar = document.querySelector('.waveform-progress');
  const progressValue = document.querySelector('.waveform-progress-value');

  // reveal loading bar
  loadingBar.classList.remove('no-opacity');

  // update loading bar progress width, and displayed values
  progressBar.style.width = progress + '%';

  if (Math.ceil(progress) >= 100) {
    progressValue.innerHTML = `<strong>Done!</strong>`;
  } else {
    progressValue.innerHTML = `Processing <strong>${Math.ceil(
      progress
    )}%</strong>`;
  }

  //  hide the loading bar on command
  if (loadingComplete) {
    setTimeout(loadingBar.classList.add('no-opacity'), 100);
  }
}

// - Functions for customization of Wavesurfer Timeline
/**
 * Formats time in minutes and seconds with variable precision
 *
 * e.g. 169 seconds will become 2:49 (2min & 49seconds)
 */
function formatTimeCallback(seconds, pxPerSec) {
  seconds = Number(seconds);
  const minutes = Math.floor(seconds / 60);

  // calculate the remainder of the division
  seconds %= 60;
  // Convert seconds to decimal format
  seconds /= 100;

  let secondsStr;
  if (pxPerSec > 300) {
    secondsStr = seconds.toFixed(3);

    // formatSecondsWithThreeDecimals (e.g.0.550 => 0.55 ||0.500 =>0.50  || 0.525 => 0.52:5)
    secondsStr = _formatSecondsWithThreeDecimals(secondsStr);
  } else {
    secondsStr = seconds.toFixed(2);
  }
  const parts = secondsStr.split('.');
  // join the rest of the parts starting from the second part
  const decimalPart = parts.slice(1).join('.');

  return `${minutes}:${decimalPart}`;
}

function _formatSecondsWithThreeDecimals(number) {
  const numberString = number.toString();
  const lastNumber = numberString.charAt(numberString.length - 1);

  if (lastNumber === '0') {
    return numberString.slice(0, -1);
  } else {
    const formattedNumber = numberString.slice(0, -1) + '.' + lastNumber;
    return formattedNumber;
  }
}

/**
 * Determines the time interval based on the pixels per second value
 */
function timeInterval(pxPerSec) {
  if (pxPerSec >= 300) {
    return 0.1;
  } else if (pxPerSec >= 50) {
    return 0.5;
  } else {
    return 1;
  }
}

/**
 *Determines the primary label interval based on the pixels per second value.
 */
function primaryLabelInterval(pxPerSec) {
  if (pxPerSec >= 600) {
    return Math.floor(0.1 / timeInterval(pxPerSec));
  } else if (pxPerSec >= 300) {
    return Math.floor(0.5 / timeInterval(pxPerSec));
  } else if (pxPerSec >= 150) {
    return Math.floor(2 / timeInterval(pxPerSec));
  }
}

/**
 * Determines the secondary label interval based on the pixels per second value.
 */
function secondaryLabelInterval(pxPerSec) {
  return Math.floor(1 / timeInterval(pxPerSec));
}

// -

function setupMetronomeMenu() {
  const metronomeSettingsMenu = document.querySelector('#metronome-btn');
  const metronomeSettingsIcon = document.querySelector('#metronome-icon');
  const metronomeModal = metronomeSettingsMenu.querySelector('.dropdown-menu');

  let metronomeModalEnabled = false;
  metronomeSettingsMenu.addEventListener('click', function (e) {
    console.log('-------------------------');

    // close metronome modal only on metronome icon click
    if (e.target.closest('#metronome-icon')) {
      metronomeModalEnabled = !metronomeModalEnabled;
      if (metronomeModalEnabled) {
        metronomeModal.style.display = 'block';
        metronomeSettingsIcon.classList.add('flip-horizontal');
      } else {
        metronomeModal.style.display = 'none';
        metronomeSettingsIcon.classList.remove('flip-horizontal');
      }
    }
  });
}
setupMetronomeMenu();
