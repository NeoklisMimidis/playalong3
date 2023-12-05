var noChannels = 1; // no input recording || Choose 1 for mono, 2 for stereo TODO record mono
var ac = new AudioContext({ latencyHint: 0.00001 }); // FIXME?>?
let monitor = false; // turn recording monitor on or off

/**
 * 'resolvePreCount' is a function reference used to resolve the promise created in preCountRecordingModal. It is used to avoid a bug when early stopping the pre-count of a recording and then trying to record again
 */
let resolvePreCount;
var metronomeEvents = new EventTarget();
var preCountCanceled = false;

// AUDIO WORKLET PROCESSOR NODE
let initializedRecording = false;
var recordingNode;
// This enum states the current recording state.
const RecorderStates = {
  UNINITIALIZED: 0,
  RECORDING: 1,
  PAUSED: 2,
  FINISHED: 3,
};

let recordingState = RecorderStates.UNINITIALIZED;
let audioResources;

// - Setting recording & Worklet functions
// Wait for user interaction to initialize audio, as per
// specification.
recordButton.addEventListener('click', async () => {
  audioResources = await setupRecordingWorklet();
  await ac.resume();

  // Finally, start recording
  startRecording();
});

//////
/**
 * Define overall audio chain and initializes all functionality.
 */
async function setupRecordingWorklet() {
  if (initializedRecording === false) {
    const RecordingProcessorUrl = await URLFromFiles([
      'js/aw-recorder/recordingProcessor.js',
    ]);
    await ac.audioWorklet.addModule(RecordingProcessorUrl);

    initializedRecording = true;
  }

  const micStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      autoGainControl: false,
      noiseSuppression: false,
      latency: 0,
    },
  });

  const micSourceNode = new MediaStreamAudioSourceNode(ac, {
    mediaStream: micStream,
  });

  const recordingProperties = {
    numberOfChannels: micSourceNode.channelCount,
    sampleRate: ac.sampleRate,
    maxFrameCount: ac.sampleRate * 600, // Adjust as needed || 10 minutes
  };

  recordingNode = new AudioWorkletNode(ac, 'recording-processor', {
    processorOptions: recordingProperties,
  });

  // We can pass this port across the app and let components handle
  // their relevant messages.
  const recordingCallback = handleRecording(recordingProperties);

  recordingNode.port.onmessage = event => {
    recordingCallback(event);
  };

  micSourceNode.connect(recordingNode);

  return { ac, micStream, micSourceNode, recordingNode };
}

/**
 * Set events and define callbacks for recording start/stop events.
 * @param {object} recordingProperties Microphone channel count, for
 * accurate recording length calculations.
 * @return {function} Callback for recording-related events.
 */
function handleRecording(recordingProperties) {
  let recordingLength = 0;

  // If the max length is reached, we can no longer record. FIXME remove maxLength?
  const recordingEventCallback = async event => {
    if (event.data.message === 'UPDATE_RECORDING_LENGTH') {
      recordingLength = event.data.recordingLength;
    }
    if (event.data.message === 'SHARE_RECORDING_BUFFER') {
      const recordingBuffer = ac.createBuffer(
        recordingProperties.numberOfChannels,
        recordingLength,
        sampleRate
      );

      for (let i = 0; i < recordingProperties.numberOfChannels; i++) {
        recordingBuffer.copyToChannel(event.data.buffer[i], i, 0);
      }
      console.log('RECORDING COMPLETE!!');

      onSuccessfulRecording(recordingBuffer);
    }
  };

  // Remove existing event listeners from the previous audioWorkletNode
  pauseButton.removeEventListener('click', pauseRecording);
  stopButton.removeEventListener('click', stopRecording);

  // Add new event listeners to the new audio worklet
  pauseButton.addEventListener('click', pauseRecording);
  stopButton.addEventListener('click', stopRecording);

  return recordingEventCallback;
}

function terminateAudio({ ac, micStream, micSourceNode, recordingNode }) {
  if (micSourceNode && recordingNode) {
    micSourceNode.disconnect(recordingNode);
    recordingNode.disconnect();
  }

  if (micStream) {
    micStream.getTracks().forEach(track => track.stop());
    micStream = null;
  }

  if (ac) {
    ac.suspend();
  }
}

// -
// - Recording callbacks
// -
async function startRecording() {
  // Collaboration check
  if (!!Collab && otherUserRecording) {
    notify("You can't record while someone else is recording.", 'danger');
    return false; // Indicate that recording did not start
  }

  // UI changes for recording
  document.getElementById('speedSlider').disabled = true;
  hideUnhideElements(true);

  recordButton.disabled = true;
  recordButton.setAttribute('title', '');

  stopButton.removeAttribute('hidden');
  stopButton.setAttribute('title', 'Stop recording');

  // display microphone (pink) container
  waveform_micContainer.removeAttribute('hidden');

  if (wavesurfer_mic.backend.ac !== 'running') {
    wavesurfer_mic.backend.ac.resume();
  }

  if (monitor) mic.connect(ac.destination); // monitor on

  // ac.resume().then(() => {
  // preCountRecordingModal().then(() => {
  await preCountRecordingModal();

  recordingState = RecorderStates.RECORDING;
  recordingNode.port.postMessage({
    message: 'UPDATE_RECORDING_STATE',
    setRecording: true,
  });

  // recording started so animation starts
  recordButton.classList.add('flash');
  //show microphone animation
  wavesurfer_mic.microphone.start();
  playAll();

  pauseButton.disabled = false;
  pauseButton.removeAttribute('hidden');
  pauseButton.setAttribute('title', 'Pause recording');

  if (!!Collab) {
    window.awareness.setLocalStateField('record', {
      status: 'start',
      recUserData: { id: idParam, name: userParam },
    });
  }

  return true; // Indicate that recording started successfully
  // });
}

function pauseRecording() {
  var pauseButtons = document.querySelectorAll('.pause-button');
  var playButtons = document.querySelectorAll('.play-button');
  var playPauseButtons = document.querySelectorAll('.play-pause-button');

  AUDIO_PLAYER_CONTROLS.playPauseBtn.click();

  if (RecorderStates.RECORDING) {
    recordingState = RecorderStates.PAUSED;
    recordingNode.port.postMessage({
      message: 'UPDATE_RECORDING_STATE',
      setRecording: false,
    });

    resetPlaybackVolume();

    wavesurfer_mic.microphone.pause();
    wavesurfer_mic.pause();

    if (document.querySelector('#countOn').checked) {
      parent.metronome.setPlayStop(false);
    }
    pauseButton.disabled = false;
    pauseButton.setAttribute('title', 'Resume recording');
    pauseButton.classList.add('flash');
    recordButton.disabled = true;
    recordButton.classList.remove('flash');

    for (var i = 0; i < pauseButtons.length; i++) {
      pauseButtons[i].click();
      playPauseButtons[i].innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
      playPauseButtons[i].setAttribute('title', 'Play');
    }
  } else {
    recordingState = RecorderStates.RECORDING;
    recordingNode.port.postMessage({
      message: 'UPDATE_RECORDING_STATE',
      setRecording: true,
    });

    setPlaybackVolume();

    wavesurfer_mic.microphone.start();
    if (document.querySelector('#countOn').checked) {
      parent.metronome.setPlayStop(true);
    }

    pauseButton.disabled = false;
    pauseButton.setAttribute('title', 'Pause recording');
    pauseButton.classList.remove('flash');
    recordButton.classList.add('flash');

    for (var i = 0; i < pauseButtons.length; i++) {
      playButtons[i].click();

      playPauseButtons[i].innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor"	class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
      playPauseButtons[i].setAttribute('title', 'Pause');
      recordButton.disabled = true;
    }
  }
}

function stopRecording() {
  // stop metronome & hide pre count modal (& and check if preCountCanceled)
  preCountRecordingModal();
  // onPreCountMeasuresComplete();

  resetPlaybackVolume();

  if (audioResources) {
    terminateAudio(audioResources);
    audioResources = null;
  }

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
    playPauseButtons[i].setAttribute('title', 'Play');
  }

  AUDIO_PLAYER_CONTROLS.stopBtn.click(); // backing track stop

  //disable the stop button, enable the record too allow for new recordings
  stopButton.hidden = true;
  stopButton.setAttribute('title', '');

  recordButton.disabled = false;
  recordButton.setAttribute('title', 'Start recording');

  pauseButton.hidden = true;
  pauseButton.setAttribute('title', '');

  recordButton.classList.remove('flash');
  pauseButton.classList.remove('flash');

  playPauseAllButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
  playPauseAllButton.title = 'Play all';

  //reset button just in case the recording is stopped while paused
  pauseButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';

  //stop microphone animation
  wavesurfer_mic.microphone.stop();
  wavesurfer_mic.microphone.pause(); // this is necessary to prevent the visualization of the next recording while the pre-count modal is still active

  waveform_micContainer.setAttribute('hidden', 'true');

  stopAllButton.disabled = true;
  console.log('disabled StopALl button');
  stopAllButton.setAttribute('title', '');

  // a small time out
  setTimeout(() => hideUnhideElements(), 250);

  // DON'T execute the rest of the code if recording was canceled while pre count was up
  if (preCountCanceled) {
    actOnInvalidRecord();
    return;
  }

  recordingState = RecorderStates.FINISHED;
  recordingNode.port.postMessage({
    message: 'REQUEST_RECORDING_BUFFER', // TODO TODO TODO
    setRecording: false,
  });
  recordingNode = null;
}

// -
function actOnInvalidRecord() {
  !!Collab
    ? window.awareness.setLocalStateField('record', {
        status: 'stop',
        recUserData: { id: idParam, name: userParam },
        isValid: false,
      })
    : null;

  if (count == 1) {
    //if no other recording --> rehide not needed buttons...
    const initialButtons = [
      'recordButton',
      'start-close-call-btn',
      'metronome-btn',
      'recalibration-btn',
    ];

    [...document.getElementById('controls').children]
      .filter(e => e.tagName === 'BUTTON' && !initialButtons.includes(e.id))
      .forEach(e => e.setAttribute('hidden', true));
  }
  //...and disable the playback speed bar
  document.getElementById('speedSlider').disabled = false;
}

function onSuccessfulRecording(audioBuffer) {
  let monoBuffer = audioBuffer;
  if (audioBuffer.numberOfChannels === 2) {
    monoBuffer = convertStereoToMono(audioBuffer);
  }
  const latencyCompensation = localStorage.getItem('latency-compensation');
  const latencySamples = Math.ceil(
    +latencyCompensation * 0.001 * ac.sampleRate
  );
  const buffer = [monoBuffer.getChannelData(0).slice(latencySamples)];

  const data = Array.from(buffer[0]);
  let blob = recordingToBlob(data);

  // accept ONLY recordings larger than 1s
  if (data.length > sampleRate) {
    noRecordings++;
    recordedBuffers.push(buffer); //push the buffer to an array

    !!Collab
      ? window.awareness.setLocalStateField('record', {
          status: 'stop',
          recUserData: { id: idParam, name: userParam },
          isValid: true,
        })
      : null;

    if (!!Collab && window.sharedRecordedBlobs != null) {
      const obj = {
        id: generateID(),
        speed: speed01,
        set_pitch: 1 / speed01,
        userName: userParam,
        userId: idParam,
        sampleRate,
        count,
        clientId: window.awareness.clientID
      };
      addSharedBuffer(data, obj);
    }

    if (!Collab) {
      createRecordingTrack(blob);
    }
    recordedBlobs.push(blob);

    console.log('recordedBlobs', recordedBlobs);
    console.log('recordedBuffers = ', recordedBuffers);
  } else {
    actOnInvalidRecord();
    return;
  }
}

// - Pre count
function preCountRecordingModal() {
  return new Promise((resolve, reject) => {
    const currentMeasure = parent.metronome.bar + 1;
    const preCountModalEl = document.getElementById('preCountModal');
    const preCountMeasures = document.getElementById('precount').selectedIndex;

    // Assign the resolve function to the external variable
    resolvePreCount = resolve;

    function onPreCountMeasuresComplete() {
      console.log(
        'Pre count measures complete, resolving preCountRecordingModal'
      );
      metronomeEvents.removeEventListener(
        'preCountMeasuresComplete',
        onPreCountMeasuresComplete
      );
      resolvePreCount();
    }

    if (preCountMeasures === 0) {
      resolve();
      return;
    }

    if (currentMeasure === 0) {
      if (preCountMeasures != 0) {
        console.log('Pre count measures exist');
        // show pre count modal
        preCountModalEl.classList.remove('d-none');

        parent.metronome.setPlayStop(true);
      } else if (window.continuous_play && preCountMeasures === 0) {
        console.log('NO Pre count measures, but continuous play enabled');
        parent.metronome.setPlayStop(true);
      }
    } else {
      // check if pre count was canceled with measures information
      preCountCanceled = currentMeasure <= preCountMeasures ? true : false;

      const preCountModalEl = document.getElementById('preCountModal');
      preCountModalEl.classList.add('d-none');
      createModalPreCount(); // reset pre-count modal

      //stop metronome
      parent.metronome.setPlayStop(false);
      parent.metronome.bar = -1;

      // Resolve & Return
      onPreCountMeasuresComplete();
      return;
    }

    metronomeEvents.addEventListener(
      'preCountMeasuresComplete',
      onPreCountMeasuresComplete
    );
  });
}

async function generateRecordingFilename(fileExtension = '.wav') {
  let date = new Date();
  let dayStr = ('0' + date.getDate()).slice(-2); // gets the day as a two-digit string
  let monthStr = ('0' + (date.getMonth() + 1)).slice(-2); // gets the month as a two-digit string
  let yearStr = date.getFullYear().toString().slice(-2); // gets the last two digits of the year
  let hourStr = ('0' + date.getHours()).slice(-2); // gets the hour as a two-digit string
  let minStr = ('0' + date.getMinutes()).slice(-2); // gets the minute as a two-digit string
  let secStr = ('0' + date.getSeconds()).slice(-2); // gets the second as a two-digit string

  let fileName = `rec_${dayStr}${monthStr}${yearStr}_${hourStr}:${minStr}:${secStr}`;

  return await setRecordingFileName(fileName, fileExtension);
}

function setRecordingFileName(generatedRecFilename, fileExtension) {
  return new Promise((resolve, reject) => {
    const recNameModal = document.querySelector('#modal_recname');
    const recNameModalInput = recNameModal.querySelector('#setRecnameInput');
    const recNameModalBtn = recNameModal.querySelector('#setRecnameBtn');
    const recNameExtension = recNameModal.querySelector('#recnameExtension');

    // Set filename and extension, placeholders, default values
    recNameExtension.value = fileExtension;
    recNameModalInput.value = generatedRecFilename;
    recNameModalInput.placeholder = recNameModalInput.value;

    // Display modal
    recNameModal.style.display = 'block';

    // Assign events
    recNameModalBtn.removeEventListener('click', getFileName);
    recNameModalBtn.addEventListener('click', getFileName);

    function getFileName() {
      let inputValue =
        recNameModalInput.value || generatedRecFilename || 'recordingName';
      let recFilename = inputValue + fileExtension;
      console.log('New filename set: ' + recFilename);
      recNameModal.style.display = 'none';
      resolve(recFilename);
    }
  });
}
