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
  audioDataToWavFile,
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
export const waveformLoadingBar = document.getElementById(
  'waveform-loading-bar'
);
export const analysisLoadingBar = document.getElementById(
  'analysis-loading-bar'
);
// Audio I/O (Sidebar)
export const audioSidebarText = document.getElementById('audio-sidebar-text');
export const audioSidebarControls = document.getElementById(
  'audio-sidebar-controls'
);
const analyzeChordsBtn = document.getElementById('analyze-chords-btn');
const exportToDiskOrRepositoryBtn = document.getElementById(
  'export-to-disk-or-repository-btn'
);

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
export let fileName;

export const playerStates = {
  FOLLOW_PLAYBACK: true,
  FOLLOW_PLAYBACK_OPTIONS: {
    resetPoint: '0.20',
    turnPoint: '0.80',
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

window.loadAudioFile = loadAudioFile;
window.loadFilesInOrder = loadFilesInOrder; //needed for use in backing-track.js
window.createURLJamsFromRepository = createURLJamsFromRepository; //needed for use in backing-track.js

window.bTrackURL = '';
window.bTrackDATA = '';

window.audioExistsInRepo = false;

export let filesToDelete = [];

export let URLParamFileLoaded = false;

// - Start of the application ||

toggleAudioInOutSidebarControls();

export let wavesurfer = initWavesurfer();
window.backingTrack = wavesurfer;

/* Loading file with Handlers about selection or dragging the appropriate files for app initialization */
// a) Importing audio
// dragDropHandlers('#waveform', loadAudioFile, 'drag-over');
dragDropHandlers(
  '#waveform',
  audioUrl => {
    // loadAudioFile(audioUrl);
    loadFilesInOrder(
      audioUrl,
      'just random string to trigger loadJams from browser storage'
    );
  },
  'drag-over'
);
// fileSelectHandlers('#import-audio-btn', loadAudioFile);
fileSelectHandlers('#import-audio-btn', audioUrl => {
  // loadAudioFile(audioUrl);
  loadFilesInOrder(
    audioUrl,
    'just random string to trigger loadJams from browser storage'
  );
});
// b) Displaying annotation (JAMS) // TODO function that sends audio file to server and fetches analysis on completion
// fileSelectHandlers('#musicolab-logo', loadJAMS, '.jams'); // (just for testing load jams with musicolab logo)

analyzeChordsBtn.addEventListener('click', function () {
  console.log('click');

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
import { defineIfSingleUser } from './playalong/collab/awarenessHandlers.js';
import audioFileURL1 from '../demo_files/test.mp3';
const annotationFile1 = new URL('../demo_files/test.jams', import.meta.url)
  .href;
import audioFileURL2 from '../demo_files/bendir1.mp3';

const urlParams = new URLSearchParams(window.location.search);
const urlFileName = urlParams.get('f');

export function loadURLParamFileAsBT() {
  console.log('loading not shared audio file');

  if (window.location.hostname === 'localhost') {
    // A) Localhost (preload audio):
    resetAudioPlayer();
    // loadFilesInOrder(audioFileURL1);
    // loadFilesInOrder(audioFileURL2);
    // loadFilesInOrder(audioFileURL1, annotationFile1);
  } else if (
    window.location.hostname === 'musicolab.hmu.gr' &&
    urlFileName !== null
  ) {
    // B) MusiCoLab server:
    const audioFileURL = createURLFromRepository();
    const annotationFileUrl = createURLJamsFromRepository(urlFileName);

    loadFilesInOrder(audioFileURL, annotationFileUrl);
  } else {
    resetAudioPlayer();
  }

  URLParamFileLoaded = true;
}

//setTimeout needed because window.awareness used in defineIfSingleUser is set in setup.js, which hasn t yet been executed
setTimeout(() => {
  let sharedBT = false;
  if (Collab) {
    sharedBT =
      window.playerConfig.has('backingTrack') ||
      window.playerConfig.has('backingTrackRepository') ||
      window.playerConfig.has('backingTrackRecording');
  }
  //creates minor double loading same audiotrack bug. case: during session (in which no bt has been set)...
  //... all users are disconnected. in first user that reconnects loadURLParam will be activated twice: here and in playerConfig observer
  if (!Collab || (Collab && defineIfSingleUser() && !sharedBT))
    loadURLParamFileAsBT();
}, 2000);

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
  // // 0) (now for testing show preface & hide annotation)
  // toolbar.classList.add('d-none');
  // prefaceAnnotationBar.classList.remove('d-none');

  // 1) hide analysis description and button and then display analysis loading bar
  document.getElementById(`preface-annotation`).classList.add('d-none');
  document.getElementById(`analysis-loading-bar`).classList.remove('d-none');

  const ANALYSIS_SCRIPT_URL =
    'https://musicolab.hmu.gr/apprepository/analyzeChordsAudioResp.php';
  let annotationFileUrl;
  if (window.location.hostname === 'localhost') {
    annotationFileUrl = annotationFile1;
  } else {
    annotationFileUrl = createURLJamsFromRepository(fileName, true);
  }

  const audioDurationInSeconds = backingTrack.backend.buffer.duration;
  /**
   * Estimate analysis time based on audio duration using a simple linear regression model.
   * y = 0.1543x + 6.113, where y is the analysis time and x is the audio duration in seconds.
   * @param {number} audioDuration - The duration of the audio in seconds.
   * @returns {number} The estimated analysis time in seconds.
   */
  function estimateAnalysisTime(audioDuration) {
    const slope = 0.235;
    const intercept = 8.113;

    return slope * audioDuration + intercept;
  }
  // Also round up the result
  const estimatedAnalysisTime = Math.ceil(
    estimateAnalysisTime(audioDurationInSeconds)
  );
  // const estimatedAnalysisTime = 35;

  if (!!Collab) {
    window.awareness.setLocalStateField('BTAnalysis', {
      status: 'initiated',
    });
  }

  // 2) send audio to server & update progress bar and on completion visualize annotation
  doChordBeatAnalysis(
    ANALYSIS_SCRIPT_URL,
    annotationFileUrl,
    estimatedAnalysisTime
  );
}

function doChordBeatAnalysis(
  serverScriptURL,
  serverAnnotationUrl,
  estimatedAnalysisTime
) {
  console.log('doChordBeatAnalysis 👌');

  // 1) Construct FormData to encapsulate the information to be sent to the server
  let fd = new FormData();
  fd.append('action', 'chordBeatAnalysis');
  fd.append('theUrl', bTrackURL);
  fd.append('theaudio', bTrackDATA);

  if (audioExistsInRepo === 'private') {
    const urlParams = new URLSearchParams(window.location.search);
    const userID = urlParams.get('id'); //user id
    fd.append('userID', userID);
  } else if (audioExistsInRepo === 'course') {
    const urlParams = new URLSearchParams(window.location.search);
    const courseID = urlParams.get('courseid');
    fd.append('courseID', courseID);
  }

  fd.append('audioExistsInRepo', audioExistsInRepo);

  // 2) Monitor responses/events
  let ajax = new XMLHttpRequest();

  // Monitoring upload progress
  ajax.upload.onprogress = function (event) {
    if (event.lengthComputable) {
      targetProgress = event.loaded / event.total;
      currentProgress = targetProgress * uploadPortion;

      // audio upload progress bar
      animateProgressBar(analysisLoadingBar, currentProgress, 'Uploading');
    }
  };

  ajax.onreadystatechange = function () {
    if (ajax.readyState === 4 && ajax.status === 200) {
      executed = true;
      console.log('Chord analysis is complete!');

      function cb() {
        document
          .getElementById(`preface-annotation`)
          .classList.remove('d-none');
        loadJAMS(serverAnnotationUrl);

        document.getElementById(`analysis-loading-bar`).classList.add('d-none');

        if (!!Collab) {
          window.awareness.setLocalStateField('BTAnalysis', {
            status: 'completed',
            jamsURL: serverAnnotationUrl,
          });
        }
      }

      const serverResponse = JSON.parse(ajax.responseText);
      if (serverResponse.filename.length === 2) audioExistsInRepo = 'jams'; // gimich check if audio was uploaded successfully

      if (!!Collab) sharedBTFile.set('audioExistsInRepo', audioExistsInRepo);

      filesToDelete.push(...serverResponse.filename);
      console.log('filesToDelete:', filesToDelete);

      animateProgressBar(analysisLoadingBar, 100, 'Analysing', cb);
    } else if (ajax.readyState === 4 && ajax.status !== 200) {
      console.log('Error: ' + ajax.status);

      if (!!Collab) {
        window.awareness.setLocalStateField('BTAnalysis', {
          status: 'completed',
          jamsURL: 'none',
        });
      }

      const serverResponse = JSON.parse(ajax.responseText);
      alert(`Error ${ajax.status}: ${serverResponse.error}`);

      function cbError() {
        document.getElementById(`analysis-loading-bar`).classList.add('d-none');
        document
          .getElementById(`preface-annotation`)
          .classList.remove('d-none');
      }

      executed = true;
      animateProgressBar(analysisLoadingBar, 100, 'Error!', cbError);
    }
  };

  // 3) Logic behind animation of progress bar
  let targetProgress = 0;
  let currentProgress = 0;
  const uploadPortion = 35;
  const analysisPortion = 99 - uploadPortion;

  let analysisTime = estimatedAnalysisTime;
  let executed = false;
  let count = 1;

  // Update Progress bar update AFTER audio loaded
  let intervalId = setInterval(function () {
    if (executed) return;

    if (targetProgress < 1) {
      console.log(`uploading audio progress: ${targetProgress * 100} %`);
      return;
    } else if (targetProgress == 1) {
      if (currentProgress == uploadPortion) {
        console.log('AUDIO FILE UPLOADED!👌👌👌');

        if (!!Collab) {
          window.awareness.setLocalStateField('BTAnalysis', {
            status: 'inProgress',
            progress: 30,
          });
        }
      }

      if (currentProgress < 98.5) {
        // const resolution = analysisTime * 10;
        // resolution: is used to control the granularity of the progress bar's update for the analysis portion
        let resolution =
          currentProgress > 90 ? analysisTime * 22 : analysisTime * 10; // (slower when reaching the end)
        currentProgress += analysisPortion / resolution; // Increase progress

        switch (count) {
          case Math.round(resolution / 4):
          case Math.round(resolution / 2):
          case Math.round((resolution * 3) / 4): {
            if (!!Collab) {
              window.awareness.setLocalStateField('BTAnalysis', {
                status: 'inProgress',
                progress: currentProgress,
              });
            }
          }
        }

        count++;
      } else {
        currentProgress = 99;
        clearInterval(intervalId);
      }

      console.log('animate the progress bar!!', currentProgress, '%');
      animateProgressBar(analysisLoadingBar, currentProgress, 'Analysing');
    }
  }, 100); // Update every 100ms

  // 4) Send the request
  ajax.open('POST', serverScriptURL, true);
  ajax.send(fd);
}

// -

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

    height: 128, // (default==128)
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

function loadAudioFile(input, res = false) {
  if (input === undefined) return;

  const [fileUrl, file] = loadFile(input);

  console.log('load audio file input', input);
  // console.log('load audio file fileUrl', fileUrl);
  // console.log('load audio file file', file);

  function loadAudio() {
    wavesurfer.empty();
    resetAudioPlayer();

    if (res) {
      wavesurfer.loadBlob(input);
    } else wavesurfer.load(fileUrl);

    initAudioPlayer();

    wavesurfer.once('ready', function () {
      console.log('READY EVENT INSIDE loadAudioFile ✌️✅💪');

      // 4 cases:
      // a) use recording as backing track // TODO either first or later recording!
      // b) import from handlers -drag or import buttons (use file.name)
      // c) repository link (retrieve name from URL)
      // d) localhost loading file (Use default: test.mp3)

      // prettier-ignore
      if (recAsBackingTrack.hasBeenSet){
        // a)
        fileName = recAsBackingTrack.recName;
        
        bTrackDATA = audioDataToWavFile(wavesurfer.backend.buffer, fileName);
        bTrackURL = URL.createObjectURL(bTrackDATA);
        audioExistsInRepo = false
            
        updateURLParams({'f': fileName, 'type': ''}); // adds fileName removes type
        

      } else if (file !== undefined) {
        // b)
        fileName = file.name;

        bTrackDATA = file;
        bTrackURL = fileUrl;
        audioExistsInRepo = false        
   
        updateURLParams({ 'f': fileName, 'type': '' });

      } else if (window.location.hostname === 'musicolab.hmu.gr'){
        // c)       

        // Import from repository (button) case
        if (res){
          const url = new URL(res.url);
          const params = new URLSearchParams(url.search);
          const f = params.get('f');

          fileName = f
          bTrackDATA = res.url
          bTrackURL = res.url

          // Also try to load annotation, if it exists it will be loaded
          //(I don't like it that it executes here but.. whatever)
          const annotationFile = createURLJamsFromRepository(f)
          loadJAMS(annotationFile)

          // audioExistsInRepo & updateURLParams are updated from file-load-repository.js accordingly
        } else{
          // With link from repository (https://musicolab.hmu.gr/apprepository/downloadPublicFiles.php etc)
          fileName = urlFileName 
          bTrackDATA = fileUrl 
          bTrackURL = fileUrl

          const type = urlParams.get('type'); // public, private, course
          audioExistsInRepo = type// case of loading directly from repository button
          // updateURLParams({ 'f': fileName, 'type': type });//NO NEED ALREADY COMES WITH APPROPRIATE PARAMS!
        }
        console.log(fileName)

      } else if (file === undefined && window.location.hostname === 'localhost') {
        // d)
        fileName = 'test.mp3';

        bTrackDATA = fileUrl;
        bTrackURL = fileUrl;
        audioExistsInRepo = false  
      }

      if (!!Collab) sharedBTFile.set('audioExistsInRepo', audioExistsInRepo);

      console.log(`backing track URL : ${bTrackURL}`);
      console.log(`backing track DATA :  ${bTrackDATA}`);

      // console.log(fileName);

      audioFileNamePreface.textContent = fileName.trim();
      audioFileName.textContent = audioFileNamePreface.textContent;

      activateAudioPlayerControls();

      //restoring variables used in setting rec as b. track
      recAsBackingTrack.hasBeenSet = false;
      recAsBackingTrack.recName = null;

      hideUnhideElements(); // this is for playAll, stopAll mix from app.js
    });
    /* TODO. alx. isws volevei. an einai na xrismiopoioithei, kai i loadAudioFIle na trexei kai
    // ston loader kai stous collaborators, prepei na mpei ena flag isLoader gia na energopoieitai o sharing
    // mixanismos mono se auton. episis prepei na diaxwristoun cases analoga me to input gia na energopoieitai diaforetikos
    // sharing mixanismos analoga an paizei file(from disk), i url(rec, repository). Isws xreiazetai enopoiisi twn sharing
    // mixanismwn stin teliki. mexri to deadline commented out kai to vlepoume.
    // Neoklis: Alex or Dimitris: check if this part is required for collab
     if (!Collab) {
      document.querySelector('.users-online-container').style.display = 'none';//?? giati mpike edw?
    } else if (Collab && file instanceof File) {
      shareBackingTrack(file)
        .then(() => {
          console.log(`file ${file.name} was shared with peers`);
          removeFileURLParam();
        })
        .catch(err =>
          console.error(`failed to share file ${file.name} with peers`, err)
        );
    }
    */
  }

  if (file && !toolbarStates.SAVED) {
    const message = `You are about to import: <br> <span class="text-primary">${file.name}</span>.<br> Any unsaved changes on<br><span class="text-primary">${fileName}</span> will be <span class="text-warning">discarded.</span> <br><br><span class="text-info">Are you sure?</span> 🤷‍♂️`;

    renderModalMessage(message)
      .then(() => {
        // Change the state to true because the user selected to proceed (and visualizations depend on SAVED state)
        toolbarStates.SAVED = true;

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
/**
 * Reset player controls, markers, regions and previous waveform
 */
export function resetAudioPlayer() {
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
  exportToDiskOrRepositoryBtn.classList.add('disabled');
  // disable annotation export selection and uncheck  Yes/No annotation
  document.getElementById('annotation-yes-no').classList.add('disabled');
  document.querySelector('#yes-annotation').checked = false;
  document.querySelector('#no-annotation').checked = false;

  console.log('resetAudioPlayer is complete 😁');
}
window.resetAudioPlayer = resetAudioPlayer; //alx.needed for use in backing-track.js which is not a module and cannot import

/**
 * Setup events for audio player and create tooltips
 */
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

/**
 *  Enables audio player controls
 */
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
  wavesurfer.setMute(false);

  // Right controls
  volumeSlider.value = 1;
  wavesurfer.setVolume(volumeSlider.value * backingTrackVolumeFactor);

  // Audio I/O
  exportToDiskOrRepositoryBtn.classList.remove('disabled');

  console.log('activateAudioPlayerControls is complete 😁');
}

export function animateProgressBar(
  selector,
  progress,
  loadingBarText = 'Loading',
  callbackOnComplete = false
) {
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
    loadingBarProgressValue.innerHTML = `${loadingBarText} <strong>${Math.ceil(
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
window.animateProgressBar = animateProgressBar; //alx.needed for use in backing-track.js which is not a module and cannot import

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

function createURLJamsFromRepository(fileName, temporally = false) {
  const fileNameWithoutExtension = fileName.substring(
    0,
    fileName.lastIndexOf('.')
  ); //  Starry+Night.mp3 --> Starry+Night

  let annotationFileUrl;
  if (temporally) {
    annotationFileUrl = `https://musicolab.hmu.gr/jams/${fileNameWithoutExtension}.jams`;
    // https://musicolab.hmu.gr/jams/Cherokee.jams
  } else {
    const jamsFileName = `${fileNameWithoutExtension}.jams`;
    annotationFileUrl = createURLFromRepository(jamsFileName);
  }

  return annotationFileUrl;
}

export function createURLFromRepository(jamsFileName = null) {
  const urlParams = new URLSearchParams(window.location.search);

  const type = urlParams.get('type'); // public, private, course
  const user = urlParams.get('user'); // connected user
  const userID = urlParams.get('id'); // user id

  let file = jamsFileName || urlParams.get('f'); // loaded audio file

  let courseID = '';

  let phpFunction = 'downloadPublicFile.php';
  if (type === 'private') {
    phpFunction = 'downloadPrivateFile.php';
  } else if (type === 'course') {
    courseID = urlParams.get('courseid');
    phpFunction = 'downloadCourseFile.php';
  }

  const url = `https://musicolab.hmu.gr/apprepository/${phpFunction}?&user=${user}&u=${userID}&f=${file}&courseid=${courseID}`;
  console.log('❤️❤️❤️❤️❤️ url:', url);

  return url;
}
