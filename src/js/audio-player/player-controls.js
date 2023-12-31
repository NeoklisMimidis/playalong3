import {
  wavesurfer,
  playerStates,
  fileName,
  filesToDelete,
} from '../audio-player.js';
import { jamsFile } from './render-annotations.js';

import {
  selectFollowPlaybackMode,
  enableFollowPlayback,
  disableFollowPlayback,
  disableFollowPlaybackWhenMovingScrollbar,
} from './follow-playback.js';

import { toolbarStates } from '../annotation-tools.js';
import { waveformInfo } from '../annotation-tools/left-toolbar-tools.js';

import {
  formatTime,
  downloadFile,
  checkFileType,
  jsonDataToJSONFile,
} from '../components/utilities.js';

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
  repeatBtn,
  // Right
  muteUnmuteBtn,
  muteBtn,
  unmuteBtn,
  volumeSlider,
} from '../audio-player.js';
import { defineIfSingleUser } from '../playalong/collab/awarenessHandlers.js';

// Extract selectors IN TOOLTIPS.JS TODO

// State variables
let prevVolumeSliderValue = 1;
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
        playerStates.FOLLOW_PLAYBACK_OPTIONS.resetPoint
      );
    } else {
      selectFollowPlaybackMode(
        currentTime,
        playerStates.FOLLOW_PLAYBACK_OPTIONS.resetPoint,
        playerStates.FOLLOW_PLAYBACK_OPTIONS.turnPoint
      );
    }
    timeRuler(currentTime);
  });

  const waveformOnlyNoMinimap = mainWaveform.querySelector('wave'); // waveformOnlyNoMinimap is created from wavesurfer.js programmatically when wavesurfer instance is created (DON'T MOVE TO TOP WITH OTHER ELEMENTS)
  waveformOnlyNoMinimap.addEventListener('mousedown', e => {
    disableFollowPlaybackWhenMovingScrollbar(e); // also removes previous loop-region accordingly!
  });

  setupPlaybackSpeedEvents();

  setupExportToDiskOrRepository();
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
    // record(e);
  } else if (key === 'KeyL') {
    repeat(e);
  } else {
    console.log(wavesurfer);
    // console.log(wavesurfer.regions.list);
    // console.log(wavesurfer.markers.markers);
  }
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

  // disable cursor bcs it creates various bugs: a) timeline bugs b) losing focus
  wavesurfer.cursor.hideCursor();

  wavesurfer.zoom(Math.round(wavesurfer.params.minPxPerSec / 2));

  zoomInBtn.classList.remove('disabled');
  const currProgress = wavesurfer.getCurrentTime() / wavesurfer.getDuration();
  wavesurfer.drawer.recenter(currProgress); // don't use seekAndCenter to avoid one bug with Edit Chord
  console.log(currProgress);

  // delay to avoid bugs
  setTimeout(function () {
    wavesurfer.cursor.showCursor();
  }, 300);

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
  speedSliderEnableCheck();
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
    speedSliderEnableCheck();

    playPauseBtn._tippy.setContent('Play (space)');
  } else {
    wavesurfer.setPlaybackRate(speed01); // !this needs to be before play to modify buffers with soundtouch
    wavesurfer.play();
    document.getElementById('speedSlider').disabled = true;

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

  wavesurfer.on('region-dblclick', (region, e) => {
    if (region.id === 'loop-region') {
      console.log('LOOP REGION DOUBLE CLICK!');
      // e.preventDefault();
      // e.stopPropagation();
      // wavesurfer.seekTo(region.start / wavesurfer.getDuration());

      // delayed execution leveraging JavaScript's event loop and setTimeout to prevent default cursor placement
      setTimeout(function () {
        wavesurfer.seekTo(region.start / wavesurfer.getDuration());
      }, 0);
    }
  });
}

function muteUnmute(e) {
  const muted = muteBtn.classList.contains('d-none');
  if (muted) {
    wavesurfer.setMute(true);
    volumeSlider.value = 0;
    muteBtn.classList.remove('d-none');
    unmuteBtn.classList.add('d-none');

    muteUnmuteBtn._tippy.setContent('Unmute (m)');
  } else {
    if (prevVolumeSliderValue === 0) {
      // ..do nothing
    } else {
      wavesurfer.setMute(false);
      volumeSlider.value = prevVolumeSliderValue;
      muteBtn.classList.add('d-none');
      unmuteBtn.classList.remove('d-none');

      muteUnmuteBtn._tippy.setContent('Mute (m)');
    }
  }
}

function setVolumeWithSlider(value) {
  const volumeValue = parseFloat(value);
  console.log(volumeValue);

  prevVolumeSliderValue = volumeValue;
  if (volumeValue === 0) {
    wavesurfer.setMute(true);
    muteBtn.classList.remove('d-none');
    unmuteBtn.classList.add('d-none');
  } else {
    wavesurfer.setMute(false);
    muteBtn.classList.add('d-none');
    unmuteBtn.classList.remove('d-none');
  }

  wavesurfer.setVolume(volumeValue * backingTrackVolumeFactor);
  wavesurfer.savedVolume = wavesurfer.backend.getVolume();
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

  resetStopAllButton();
}

function setupPlaybackSpeedEvents() {
  wavesurfer.on('ready', function () {
    // console.log(`🚀: - SoundTouch:`);
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
    wavesurfer.on('finish', function () {
      speedSliderEnableCheck();
    });
  });
}

// - Audio I/O export to disk
function setupExportToDiskOrRepository() {
  // 1) Icon button of export to disk or repository functionality
  const exportToDiskOrRepositoryBtn = document.getElementById(
    'export-to-disk-or-repository-btn'
  );
  exportToDiskOrRepositoryBtn.addEventListener('click', e => {
    const exportMusicolabBtn = document.querySelector(
      '#export-musicolab button'
    );
    const exportMusicolabSel = document.querySelector(
      '#export-musicolab select'
    );

    const loadingSpinner = document.getElementById('export-musicolab-spinner');
    if (!loadingSpinner.classList.contains('d-none')) return;
    // userParam global from app.js!
    if (userParam) {
      exportMusicolabBtn.disabled = false;
      exportMusicolabSel.disabled = false;
    } else {
      exportMusicolabBtn.disabled = true;
      exportMusicolabSel.disabled = true;
    }

    const courseID = new URLSearchParams(window.location.search).get(
      'courseid'
    );
    if (courseID) {
      exportMusicolabSel[2].disabled = false;
    } else {
      exportMusicolabSel[2].disabled = true;
    }
  });
  // ALSO, the modal opens (shown) with html bootstrap

  // 2) modal window of export to disk or repository functionality
  const exportToDiskRepository = document.getElementById(
    'exportToDiskRepository'
  );
  // $(exportToDiskRepository).modal('show'); // just for testing!

  exportToDiskRepository.addEventListener('click', e => {
    const includeBtrack = document.querySelector('#yes-btrack').checked;
    const includeAnnotation = document.querySelector('#yes-annotation').checked;

    const fNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));

    const jamsToBeExported = jsonDataToJSONFile(
      jamsFile,
      fNameWithoutExt,
      'jams'
    );
    console.log('---------------------------');
    console.log(jamsToBeExported);

    //
    if (e.target.classList.contains('export-musicolab')) {
      console.log('Export to musicolab button clicked!');

      toggleExportControls(true);

      if (includeBtrack) {
        if (audioExistsInRepo) {
          finalizeFileStorage(fileName, 'copy', audioExistsInRepo); //  'jams' or 'private' (or 'course' if import from course)
        } else {
          // upload audio
          finalizeFileStorage(bTrackDATA, 'upload');
        }
      }

      if (includeAnnotation) {
        // always upload jams, small files and avoid a lot of status variables
        finalizeFileStorage(jamsToBeExported, 'upload');
      }

      // HIDE MODAL
      $(exportToDiskRepository).modal('hide');
    } else if (e.target.classList.contains('export-disk')) {
      console.log('Export to disk button clicked!');

      if (includeBtrack) {
        downloadFile(bTrackDATA, bTrackURL);
      }

      if (includeAnnotation) {
        downloadFile(jamsToBeExported);
      }

      // HIDE MODAL
      $(exportToDiskRepository).modal('hide');
    }
  });
}

// -

function finalizeFileStorage(file, action, sfolder = null) {
  console.log(`permanently store the file in the server 👌`);

  // const exportLocation = checkFileType(); // 'public' 'private' 'course'
  let selectedValue = document.querySelector('#export-musicolab select').value;
  const exportLocation = selectedValue; // 'public' 'private' 'course'
  console.log(exportLocation);

  // Cases of audio already in repository:
  // 1)'jams' -->analysis
  // 2) 'public' 'private' 'course' --? Import from repository
  const currentRepoLocation = sfolder;
  if (currentRepoLocation) {
    if (currentRepoLocation === exportLocation) {
      toggleExportControls(false);
      alert(`File already in ${currentRepoLocation}!`);
      return;
    } else {
      console.log(`Copying from ${currentRepoLocation} to ${exportLocation}`);
    }
  }

  // 1) Construct FormData to encapsulate the information to be sent to the server
  let fd = new FormData();
  fd.append('action', action); // 'move' or 'upload' // ⚠️
  fd.append('f', file); // ⚠️
  fd.append('ufolder', exportLocation);
  fd.append('sfolder', currentRepoLocation);

  const courseID = new URLSearchParams(window.location.search).get('courseid');
  if (courseID) {
    fd.append('courseID', courseID);
  }

  // 2) Monitor responses/events
  const ajax = new XMLHttpRequest();

  ajax.addEventListener('load', () => {
    console.log(ajax.responseText); // Printing server-side echo response

    if (ajax.status >= 200 && ajax.status < 300) {
      const serverResponse = JSON.parse(ajax.responseText);

      if (
        serverResponse.fileStatus === 'File copied successfully' ||
        serverResponse.fileStatus === 'File uploaded successfully'
      ) {
        if (file.type !== 'application/json') {
          const urlParams = new URLSearchParams(window.location.search);
          const type = urlParams.get('type');

          toggleExportControls(false);

          // If NOT already loaded a file from repo, which means type is not set, and not private case
          // (this logic helps to for loading immediately a file with the appropriate url)
          if (!type) {
            if (!!Collab && exportLocation === 'private') {
              // Early quit if Collab & private
              alert(
                `File has been successfully processed and exported to your ${exportLocation} files.`
              );
              return;
            } else {
              // The following code will be skipped if the above condition is true.
              audioExistsInRepo = exportLocation;
              updateURLParams({ type: exportLocation });

              bTrackDATA = window.location.href;
              bTrackURL = window.location.href;

              // Update collaborator location of file if exported to 'private' or 'course'
              if (!!Collab) {
                sharedBTFile.set('audioExistsInRepo', audioExistsInRepo);
                sharedBTFile.set('bTrackDATA', bTrackDATA);
                sharedBTFile.set('bTrackURL', bTrackURL);
              }
            }
          }
        }

        alert(
          `File has been successfully processed and exported to your ${exportLocation} files.`
        );
      } else {
        alert(`Failed to process file: ${serverResponse.fileStatus}`);
      }
      // if (providedOnLoadCallback) providedOnLoadCallback();
    } else {
      alert(
        `HTTP Error: Failed to export file to your ${exportLocation} files. Status code: ${ajax.status}`
      );
    }
  });

  ajax.addEventListener('error', () => {
    alert(
      `Network Error: Failed to export file to your ${exportLocation} files`
    );
  });

  // 3) Send the request
  ajax.open(
    'POST',
    'https://musicolab.hmu.gr/apprepository/finalizeFileStoragePAT.php',
    true
  );
  ajax.send(fd);
}

function toggleExportControls(isDisabled) {
  const exportMusicolabBtn = document.querySelector('#export-musicolab button');
  const selectionControls = document.getElementById('export-selections');
  const loadingSpinner = document.getElementById('export-musicolab-spinner');

  exportMusicolabBtn.disabled = isDisabled;
  selectionControls.disabled = isDisabled;
  isDisabled
    ? loadingSpinner.classList.remove('d-none')
    : loadingSpinner.classList.add('d-none');
}

// On progress
window.addEventListener('beforeunload', function (event) {
  //if in collab mode and i m not the last collab user dont proceed to temporary jams deletion requests...
  if (Collab && !defineIfSingleUser()) return;

  if (filesToDelete.length === 0) return;
  // // Files you want to delete || imported from audio-player.js
  // e.g. const filesToDelete = ['disco0.mp3', 'egoDeath2.jams'];

  // Prepare data to send to the server
  const formData = new FormData();
  formData.append('files_to_delete', JSON.stringify(filesToDelete));

  // Send a POST request to the PHP script
  fetch(
    'https://musicolab.hmu.gr/apprepository/deleteTempAnalysisFilesPAT.php',
    {
      method: 'POST',
      body: formData,
      keepalive: true,
    }
  );
});
