import { toolbarStates } from '../annotation-tools.js';
import { waveformInfo } from '../annotation-tools/left-toolbar-tools.js';
import { wavesurfer, playerStates } from '../audio-player.js';

import { formatTime } from '../components/utilities.js';

import {
  selectFollowPlaybackMode,
  enableFollowPlayback,
  disableFollowPlayback,
  disableFollowPlaybackWhenMovingScrollbar,
} from './follow-playback.js';

// // // // // // // // // // // // // // // // // // // // // // // // // // //

/* Elements */
import {
  // Waveform
  mainWaveform,
  skipForwardCue,
  skipBackwardCue,
  // Audio player bar controls
  playerControls,
  // Left
  zoomInBtn,
  zoomOutBtn,
  timeRulerBtn,
  timeRulerValue,
  // Center
  playPauseBtn,
  playBtn,
  pauseBtn,
  recordBtn,
  repeatBtn,
  // Right
  muteUnmuteBtn,
  muteBtn,
  unmuteBtn,
  volumeSlider,
} from '../audio-player.js';

// Extract selectors IN TOOLTIPS.JS TODO

// State variables
let prevVolumeSliderValue = 0.5;
let timeoutSkipForward;
let timeoutSkipBackward;

export function setupPlayerControlsEvents() {
  playerControls.addEventListener('click', audioPlayerControls);
  setupLoopRegionEvents();
  document.addEventListener('keydown', keyboardAudioPlayerShortcuts);
  wavesurfer.on('finish', audioFinishedResetControls);

  /* Events that are updated continuously while audio is playing or user interacts with waveform */
  wavesurfer.on('seek', progress => {
    if (playerStates.LOOP_SELECTION === false) {
      enableFollowPlayback(progress);
    }
    timeRuler(progress);
  });

  wavesurfer.on('audioprocess', currentTime => {
    if (playerStates.FOLLOW_PLAYBACK_OPTIONS.scroll) {
      selectFollowPlaybackMode(
        currentTime,
        playerStates.FOLLOW_PLAYBACK_OPTIONS.destinationPoint
      );
    } else {
      selectFollowPlaybackMode(
        currentTime,
        playerStates.FOLLOW_PLAYBACK_OPTIONS.destinationPoint,
        playerStates.FOLLOW_PLAYBACK_OPTIONS.pageTurnPoint
      );
    }
    timeRuler(currentTime);
  });

  const waveformOnlyNoMinimap = mainWaveform.querySelector('wave'); // waveformOnlyNoMinimap is created from wavesurfer.js programmatically when wavesurfer instance is created (DON'T MOVE TO TOP WITH OTHER ELEMENTS)
  waveformOnlyNoMinimap.addEventListener('mousedown', e => {
    disableFollowPlaybackWhenMovingScrollbar(e); // also removes previous loop-region accordingly!
  });
}

function audioPlayerControls(e) {
  // left audio player controls
  if (e.target.closest('#zoom-in-btn')) {
    zoomIn(e);
  } else if (e.target.closest('#zoom-out-btn')) {
    zoomOut(e);
  } else if (e.target.closest('#time-ruler-btn')) {
    timeRuler(e);
    // Center audio player controls
  } else if (e.target.closest('#stop-btn')) {
    stop(e);
  } else if (e.target.closest('#backward-btn')) {
    backward(e);
  } else if (e.target.closest('#play-pause-btn')) {
    playPause(e);
  } else if (e.target.closest('#forward-btn')) {
    forward(e);
  } else if (e.target.closest('#record-btn')) {
    record(e);
  } else if (e.target.closest('#repeat-btn')) {
    repeat(e);
    // Right audio player controls
  } else if (e.target.closest('#follow-playback-btn')) {
    enableFollowPlayback(e);
  } else if (e.target.closest('#mute-unmute-btn')) {
    muteUnmute(e);
  } else if (e.target.closest('#volume-slider')) {
    setVolumeWithSlider(e.target.value);
  }
}

// attach Keyboard Shortcuts to keyboard events
function keyboardAudioPlayerShortcuts(e) {
  if (toolbarStates.IS_MODAL_TABLE_ACTIVE) return; // If the modal is active, don't execute the event listener
  const key = e.code;
  if (key === 'Space') {
    e.preventDefault();
    playPause(e);
  } else if (key === 'KeyM') {
    e.preventDefault();
    muteUnmute(e);
  } else if (key === 'Digit0' || key === 'Numpad0') {
    e.preventDefault();
    stop(e);
  } else if (key === 'ArrowUp') {
    if (prevVolumeSliderValue === 1) return;
    e.preventDefault();
    setVolumeWithSliderShortcut(+0.05);
  } else if (key === 'ArrowDown') {
    if (prevVolumeSliderValue === 0) return;
    e.preventDefault();
    setVolumeWithSliderShortcut(-0.05);
  } else if (key === 'ArrowRight') {
    e.preventDefault();
    if (wavesurfer.getCurrentTime() < wavesurfer.getDuration() - 2) {
      forward(e);
    } else {
      // this condition is used to avoid repeating the song again if not repeat enabled
      wavesurfer.pause();
      wavesurfer.seekTo(1);
    }
  } else if (key === 'ArrowLeft') {
    e.preventDefault();
    backward(e);
  } else if (key === 'Equal' || key === 'NumpadAdd') {
    zoomIn(e);
  } else if (key === 'Minus' || key === 'NumpadSubtract') {
    zoomOut(e);
  } else if (key === 'KeyR') {
    record(e);
  } else if (key === 'KeyL') {
    repeat(e);
  } else {
    console.log(wavesurfer);
    // console.log(wavesurfer.regions.list);
    // console.log(wavesurfer.markers.markers);
  }
}

// - testing button

function record(e) {
  // DON'T USE  e.target.closest bcs the event bugs when it is triggered from the keyboard shortcut

  // if not already enabled then  enable it
  if (playerStates.RECORD) {
    playerStates.RECORD = false;
    recordBtn.classList.remove('record-enabled');
    recordBtn._tippy.setContent('Enable recording (r)');
  } else {
    playerStates.RECORD = true;
    recordBtn.classList.add('record-enabled');
    recordBtn._tippy.setContent('Disable recording (r)');
  }

  console.log('O lalalal');
  // TODO the rest of Viglis code goes here

  // console.log('-----------')
  // console.log('1, 2, 3 .. testing!');
}

export function zoomIn(e) {
  // If the zoom level is already at the maximum, just return and do nothing
  if (wavesurfer.params.minPxPerSec >= 600) {
    return;
  }

  wavesurfer.zoom(wavesurfer.params.minPxPerSec * 2);
  zoomOutBtn.classList.remove('disabled');

  // If after zooming in the minPxPerSec is at or above the maximum, disable the zoomIn button
  if (wavesurfer.params.minPxPerSec >= 600) {
    zoomInBtn.classList.add('disabled');
  }
}

export function zoomOut(e) {
  // If the zoom level is already at the minimum, just return and do nothing
  if (wavesurfer.params.minPxPerSec <= 50) {
    return;
  }

  wavesurfer.zoom(Math.round(wavesurfer.params.minPxPerSec / 2));

  zoomInBtn.classList.remove('disabled');

  // If after zooming out the minPxPerSec is at or below the minimum, disable the zoomOut button
  if (wavesurfer.params.minPxPerSec <= 50) {
    zoomOutBtn.classList.add('disabled');
  }
}

function timeRuler(e) {
  // 00:00.0 (min):(sec).(deciseconds)
  // TODO On press of timeRulerBtn change display to  bar beats e.g. (003 bar 04 beat)
  // timeRulerBtn.

  const currTime = formatTime(wavesurfer.getCurrentTime());
  timeRulerValue.textContent = currTime;
}

function stop(e) {
  playBtn.classList.remove('d-none');
  pauseBtn.classList.add('d-none');
  wavesurfer.stop();
  wavesurfer.seekAndCenter(0);
}

function forward(e) {
  if (toolbarStates.SNAP_ON_BEATS) {
    skipForwardCue.querySelector('.skip-cue-tooltip').textContent = 'next beat';
    wavesurfer.seekAndCenter(waveformInfo.nextBeatStartTimeInProgress);
  } else {
    skipForwardCue.querySelector('.skip-cue-tooltip').textContent = '2 seconds';
    wavesurfer.skipForward(2);
  }

  skipForwardCue.style.display = 'flex';

  // Clear the previous timeout if it exists
  if (timeoutSkipForward) {
    clearTimeout(timeoutSkipForward);
  }

  // Hide the BACKWARD cue if there
  skipBackwardCue.style.display = 'none';

  // Set a new timeout
  timeoutSkipForward = setTimeout(function () {
    skipForwardCue.style.display = 'none';
  }, 650);
}

function backward(e) {
  if (toolbarStates.SNAP_ON_BEATS) {
    skipBackwardCue.querySelector('.skip-cue-tooltip').textContent =
      'prev beat';
    wavesurfer.seekAndCenter(waveformInfo.prevBeatStartTimeInProgress);
  } else {
    skipBackwardCue.querySelector('.skip-cue-tooltip').textContent =
      '2 seconds';
    wavesurfer.skipBackward(2);
  }

  skipBackwardCue.style.display = 'flex';

  // Clear the previous timeout if it exists
  if (timeoutSkipBackward) {
    clearTimeout(timeoutSkipBackward);
  }
  // Hide the FORWARD cue if there
  skipForwardCue.style.display = 'none';

  // Set a new timeout
  timeoutSkipBackward = setTimeout(function () {
    skipBackwardCue.style.display = 'none';
  }, 650);
}

function playPause(e) {
  playBtn.classList.toggle('d-none');
  pauseBtn.classList.toggle('d-none');

  if (wavesurfer.isPlaying()) {
    wavesurfer.pause();
    playPauseBtn._tippy.setContent('Play (space)');
  } else {
    wavesurfer.play();
    playPauseBtn._tippy.setContent('Pause (space)');
  }
}

function repeat(e) {
  // DON'T USE  e.target.closest (.. same reason as record())

  // if not already enabled then  enable it
  if (playerStates.REPEAT) {
    playerStates.REPEAT = false;
    repeatBtn.classList.remove('repeat-enabled');
    repeatBtn._tippy.setContent('Enable loop (𝓁)');
  } else {
    playerStates.REPEAT = true;
    repeatBtn.classList.add('repeat-enabled');
    repeatBtn._tippy.setContent('Disable loop (𝓁)');
  }

  playerStates.LOOP_SELECTION = !playerStates.LOOP_SELECTION;

  if (
    playerStates.LOOP_REGION === null ||
    playerStates.LOOP_REGION === undefined
  )
    return;

  if (playerStates.LOOP_SELECTION) {
    playerStates.LOOP_REGION.setLoop(true);
    playerStates.LOOP_REGION.element.classList.add('region-loop-on');
  } else {
    playerStates.LOOP_REGION.setLoop(false);
    playerStates.LOOP_REGION.element.classList.remove('region-loop-on');
  }
}

function setupLoopRegionEvents() {
  wavesurfer.on('region-created', region => {
    if (region.id === 'loop-region') {
      console.log(region, 'loop region 🤷‍♂️🤷‍♂️🤷‍♂️');

      playerStates.LOOP_REGION = region;

      if (playerStates.LOOP_SELECTION) {
        playerStates.LOOP_REGION.setLoop(true);
        playerStates.LOOP_REGION.element.classList.add('region-loop-on');
      }
    }
  });

  // This additional check is helpful to avoid buggy situations of wavesurfer loop-region enabled not working correctly
  wavesurfer.on('region-out', region => {
    if (region.id === 'loop-region') {
      if (playerStates.LOOP_SELECTION) {
        console.log(region, '✅');
        wavesurfer.setCurrentTime(region.start);
        disableFollowPlayback();
      }
    }
  });
}

function muteUnmute(e) {
  const muted = muteBtn.classList.contains('d-none');
  if (muted) {
    volumeSlider.value = 0;
    muteBtn.classList.remove('d-none');
    unmuteBtn.classList.add('d-none');
    wavesurfer.setVolume(0);

    muteUnmuteBtn._tippy.setContent('Unmute (m)');
  } else {
    if (prevVolumeSliderValue === 0) {
      // ..do nothing
    } else {
      volumeSlider.value = prevVolumeSliderValue;
      muteBtn.classList.add('d-none');
      unmuteBtn.classList.remove('d-none');
      wavesurfer.setVolume(prevVolumeSliderValue);

      muteUnmuteBtn._tippy.setContent('Mute (m)');
    }
  }
}

function setVolumeWithSlider(volumeValue) {
  volumeValue = parseFloat(volumeValue);

  prevVolumeSliderValue = volumeValue;
  if (volumeValue === 0) {
    muteBtn.classList.remove('d-none');
    unmuteBtn.classList.add('d-none');
  } else {
    muteBtn.classList.add('d-none');
    unmuteBtn.classList.remove('d-none');
  }
  wavesurfer.setVolume(volumeValue);
}

function setVolumeWithSliderShortcut(stepValue) {
  const newVolumeSliderValue = parseFloat(
    (prevVolumeSliderValue + stepValue).toFixed(2)
  );
  setVolumeWithSlider(newVolumeSliderValue);
  volumeSlider.value = newVolumeSliderValue;
}

// enable follow playback & update time ruler when user (clicks waveform, minimap, skips forward e.t.c.)
function audioFinishedResetControls() {
  console.log('finished!');

  wavesurfer.drawer.wrapper.scrollLeft = 0;
  playerStates.FOLLOW_PLAYBACK = true;

  if (playerStates.REPEAT) {
    wavesurfer.seekTo(0);
    wavesurfer.play();
    console.log('Play again bcs repeat is on ! 😁');
  } else {
    playBtn.classList.remove('d-none');
    pauseBtn.classList.add('d-none');
  }
}
