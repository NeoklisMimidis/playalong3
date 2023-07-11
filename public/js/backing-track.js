'use strict';

var waveform0Container = document.getElementById('waveform0');
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

// -

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

// -
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

function displayContents(contents) {
  var element = document.getElementById('file-content');
  element.textContent = contents;
}

// FIXME is it needed TODO?
// document
//   .getElementById('file-input')
//   .addEventListener('change', readSingleFile, false);

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

//////
// /*
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
//   */
