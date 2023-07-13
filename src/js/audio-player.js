'use strict';

import WaveSurfer from 'wavesurfer.js';

import cursorPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.cursor.min.js';
import minimapPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.minimap.min.js';

import regionsPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.regions.min.js';
import timelinePlugin from 'wavesurfer.js/dist/plugin/wavesurfer.timeline.min.js';
import markersPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.markers.min.js';

import { loadJAMS } from './audio-player/render-annotations.js';

import { toolbarStates } from './annotation-tools.js';

import { setupPlayerControlsEvents } from './audio-player/player-controls.js';

import {
  tooltips,
  AUDIO_PLAYER_TOOLTIPS,
  createTippySingleton,
} from './components/tooltips.js';

import {
  loadFile,
  fileSelectHandlers,
  dragDropHandlers,
  renderModalMessage,
  formatTime,
} from './components/utilities.js';

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
const waveformLoadingBar = document.getElementById('waveform-loading-bar');
const analysisLoadingBar = document.getElementById('analysis-loading-bar');
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
  LOOP_REGION: null,
  LOOP_SELECTION: false,
};

window.playerStates = playerStates;

const AUDIO_PLAYER_CONTROLS = {
  playPauseBtn,
  stopBtn,
};
window.AUDIO_PLAYER_CONTROLS = AUDIO_PLAYER_CONTROLS;

window.backingTrackVolumeFactor = 1;

// - Start of the application ||

toggleAudioInOutSidebarControls();

export let wavesurfer = initWavesurfer();
window.backingTrack = wavesurfer;

/* Loading file with Handlers about selection or dragging the appropriate files for app initialization */
// a) Importing audio
dragDropHandlers('#waveform', loadAudioFile, 'drag-over');
fileSelectHandlers('#import-audio-btn', loadAudioFile);
// b) Displaying annotation (JAMS) // TODO function that sends audio file to server and fetches analysis on completion
fileSelectHandlers('#analyze-chords-btn', loadJAMS, '.jams');

// TODO later on instead of fileSelectHandlers('#analyze-chords-btn', loadJAMS, '.jams') use :
// analyzeChordsBtn.addEventListener('click', function () {
//   console.log('click');
//   sendAudioAndFetchAnalysis();
// });

document.querySelector('#musicolab-logo').addEventListener('dblclick', e => {
  const message = `Analysis may require some time.<br><br><span class="text-info">Are you sure you want to proceed?</span>🤷‍♂️`;

  renderModalMessage(message)
    .then(() => {
      sendAudioAndFetchAnalysis();
    })
    .catch(() => {
      // User canceled || DON'T EXECUTE ANALYSIS
    });
});

/* Loading files from repository */
import audioFileURL1 from '../demo_files/test.mp3';
const annotationFile1 = new URL('../demo_files/test.jams', import.meta.url)
  .href;

const urlParams = new URLSearchParams(window.location.search);
const urlFileName = urlParams.get('fileName');

if (window.location.hostname === 'localhost') {
  // A) Localhost (preload audio):
  resetAudioPlayer();
  // loadFilesInOrder(audioFileURL1);
  // loadFilesInOrder(audioFileURL1, annotationFile1);
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
  // console.log('loading', percent);
  animateProgressBar(waveformLoadingBar, percent);
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

function sendAudioAndFetchAnalysis() {
  // 0) (now for testing show preface & hide annotation)
  toolbar.classList.add('d-none');
  prefaceAnnotationBar.classList.remove('d-none');

  // 1) send audio to server TODO

  // 2) hide analysis description and button and then display analysis loading bar
  document.getElementById(`preface-annotation`).classList.add('d-none');
  document.getElementById(`analysis-loading-bar`).classList.remove('d-none');

  // 3) estimate time of upload audio and analysis TODO function?
  const estimatedTime = 5;

  // 4) update progress bar and on completion visualize annotation
  updateProgressBar(estimatedTime, 0.1);
}

function updateProgressBar(totalTime, updateIntervalInSeconds = 0.2) {
  let elapsedTime = 0;
  let intervalId = setInterval(() => {
    elapsedTime += updateIntervalInSeconds;
    let percent = (elapsedTime / totalTime) * 100;
    animateProgressBar(analysisLoadingBar, percent);

    if (elapsedTime >= totalTime) {
      clearInterval(intervalId);
      loadJAMS(annotationFile1);
    }
  }, updateIntervalInSeconds * 1000);
}

function initWavesurfer() {
  const wavesurfer = WaveSurfer.create({
    container: '#waveform', // html element
    progressColor: 'rgba(244, 180, 38, 0.70)',
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
    console.log(file);
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

      setPlaybackVolume();
    });

    // Neoklis: Alex or Dimitris: check if this part is required for collab
    !Collab
      ? (document.querySelector('.users-online-container').style.display =
          'none')
      : null;

    if (courseParam?.length > 0) {
      document.getElementById('repository-files-course').textContent =
        courseParam;
      window.initRepositoryTrackList(courseParam);
    }
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

  // Re-enable player controls (new audio file is loaded)
  playerControls.classList.remove('disabled');

  // Center controls
  playBtn.classList.remove('d-none');
  pauseBtn.classList.add('d-none');

  repeatBtn.classList.remove('repeat-enabled');
  playerStates.REPEAT = false;

  muteBtn.classList.add('d-none');
  unmuteBtn.classList.remove('d-none');

  // Right controls
  volumeSlider.value = 1;
  wavesurfer.setVolume(1 * backingTrackVolumeFactor);

  console.log('activateAudioPlayerControls is complete 😁');
}

function animateProgressBar(selector, progress, callbackOnComplete = false) {
  const loadingBarContainer = selector;
  const loadingBarProgress = selector.querySelector('.loading-bar-progress');
  const loadingBarProgressValue = selector.querySelector(
    '.loading-bar-progress-value'
  );

  // reveal loading bar
  loadingBarContainer.classList.remove('no-opacity');

  // update loading bar progress width, and displayed values
  loadingBarProgress.style.width = progress + '%';

  if (Math.ceil(progress) >= 100) {
    loadingBarProgressValue.innerHTML = `<strong>Done!</strong>`;
  } else {
    loadingBarProgressValue.innerHTML = `Processing <strong>${Math.ceil(
      progress
    )}%</strong>`;
  }

  //  hide the loading bar on command
  if (progress === 100) {
    setTimeout(function () {
      loadingBarContainer.classList.add('no-opacity');

      if (callbackOnComplete) callbackOnComplete();
    }, 500);
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
