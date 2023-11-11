var recorderWorklet, mic;
var noChannels = 1; // no input recording || Choose 1 for mono, 2 for stereo
var ac = new AudioContext();
var exports = {};
var monitor = false; // turn recording monitor on or off

URLFromFiles([
  'js/audioworklet-to-worker/recorder-worklet.js',
  'js/audioworklet-to-worker/ringbuffer/index.js',
]).then(e => {
  if (ac.audioWorklet === undefined) {
    alert('No AudioWorklet, try another browser.');
  } else {
    ac.audioWorklet.addModule(e).then(() => {
      // 1)
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
      // 2)
      pauseButton.addEventListener('click', pauseRecording);
      // 3)
      stopButton.addEventListener('click', stopRecording);

      // Init getUserMedia & setup Worker & Recording
      setupRec.disabled = false;

      setupRec.onclick = async function () {
        // One second of stereo Float32 PCM ought to be plentiful.
        var sab = RingBuffer.getStorageForCapacity(
          ac.sampleRate * noChannels,
          Float32Array
        );

        await setupWorker(sab, ac.sampleRate);
        await setupRecording(ac, sab);
      };
    });
  }
});

// - Setting recording & Worklet functions
async function setupWorker(sab, sampleRate) {
  await URLFromFiles([
    'js/audioworklet-to-worker/wav-writer.js',
    'js/audioworklet-to-worker/ringbuffer/index.js',
  ]).then(e => {
    /*
  The Web Worker can receive three types of commands:

  a) "init": Initializes the worker with necessary data structures and configurations. 
    - Sets up an AudioReader with a shared RingBuffer for audio data.
    - Configures channel count and sample rate for the audio stream.
    - Prepares arrays for storing PCM data and audio buffer.
    - Initializes a staging array for intermediate audio data processing.

  b) "startWorker": Starts a routine to periodically read data from the audio queue.
    - Sets an interval to repeatedly invoke the readFromQueue function every 100ms.

  c) "stopAndSendAsBuffer": Stops the data reading routine and processes the accumulated audio data.
    - Clears the interval set by "startWorker" to stop reading from the queue.
    - Drains any remaining data from the ring buffer.
    - Sends the accumulated audio buffer back to the main thread.
    - Resets the worker's state for potential reuse, reinitializing data structures.
  */

    // Init worker
    worker = new Worker(e);

    // Send to worker
    worker.postMessage({
      command: 'init',
      sab: sab,
      channelCount: noChannels,
      sampleRate: sampleRate,
    });

    // Listen from worker
    worker.onmessage = async function (e) {
      switch (e.data.command) {
        case 'audioBufferFinal': {
          // Create an audio buffer from the PCM data.
          // convert e.data into a Float32Array
          const pcm = new Float32Array(e.data.buffer);

          // Create an AudioBuffer from the PCM data.
          let audioBuffer = new AudioBuffer({
            length: noChannels === 1 ? pcm.length : pcm.length / 2,
            sampleRate: sampleRate,
            numberOfChannels: noChannels,
          });

          const channelData = audioBuffer.getChannelData(0);

          if (noChannels === 1) {
            // Mono file: Copy PCM data directly to the audio buffer
            for (let i = 0; i < pcm.length; i++) {
              channelData[i] = pcm[i];
            }
          } else if (noChannels === 2) {
            // Stereo file: Split PCM data into left and right channels
            const right = audioBuffer.getChannelData(1);
            for (let i = 0; i < pcm.length; i += 2) {
              channelData[i / 2] = pcm[i];
              right[i / 2] = pcm[i + 1];
            }
          }

          onSuccessfulRecording(audioBuffer);

          break;
        }
        default: {
          throw Error('Case not handled');
        }
      }
    };
  });
}

async function setupRecording(ac, sab) {
  ac.resume();
  recorderWorklet = new AudioWorkletNode(ac, 'recorder-worklet', {
    processorOptions: sab,
  });
  recorderWorklet?.port.postMessage({
    numChannels: noChannels,
  });

  const constraints = {
    audio: {
      // channelCount: 1, // doesn't seem to affect mono or stereo
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  };
  let stream = await navigator.mediaDevices.getUserMedia(constraints);

  // Create MediaStreamAudioSourceNode with microphone input
  mic = new MediaStreamAudioSourceNode(ac, {
    mediaStream: stream,
  });
  mic.connect(recorderWorklet);
}

// - Recording callbacks
function startRecording() {
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
  preCountRecordingModal().then(() => {
    // execute the rest of the code IF pre count finished successfully
    worker.postMessage({
      command: 'startWorker',
    });

    recorderWorklet?.port.postMessage({
      startRecording: true,
    });
    recorderWorklet.recording = true;

    // recording started so animation starts
    recordButton.classList.add('flash');
    //show microphone animation
    wavesurfer_mic.microphone.start();
    playAll();

    pauseButton.disabled = false;
    pauseButton.removeAttribute('hidden');
    pauseButton.setAttribute('title', 'Pause recording');
  });
}

function pauseRecording() {
  var pauseButtons = document.querySelectorAll('.pause-button');
  var playButtons = document.querySelectorAll('.play-button');
  var playPauseButtons = document.querySelectorAll('.play-pause-button');

  AUDIO_PLAYER_CONTROLS.playPauseBtn.click();

  if (recorderWorklet.recording) {
    //pause recording
    recorderWorklet?.port.postMessage({
      stopRecording: true,
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
    recorderWorklet.recording = false;
  } else {
    //resume recording
    recorderWorklet?.port.postMessage({
      startRecording: true,
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

    recorderWorklet.recording = true;
  }
}

function stopRecording() {
  // stop metronome & hide pre count modal (& and check if preCountCanceled)
  preCountRecordingModal(); //TODO move preCountRecordingModal here!

  resetPlaybackVolume();

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

  // mic.disconnect(recorderWorklet);
  if (monitor) mic.disconnect(ac.destination); // monitor OFF
  recorderWorklet?.port.postMessage({
    stopRecording: true,
  });
  // ac.suspend();

  worker.postMessage({
    command: 'stopAndSendAsBuffer',
  });
  recorderWorklet.recording = false;
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
  const buffer = [monoBuffer.getChannelData(0)];
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
    // EXTRA: display warning modal about headphones before pre count? (optional) TODO

    const currentMeasure = parent.metronome.bar + 1;
    const preCountModalEl = document.getElementById('preCountModal');
    // User's selected in Metronome settings pre count measures
    const preCountMeasures = document.getElementById('precount').selectedIndex;

    if (preCountMeasures === 0) resolve(); // no pre count

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
      createModalPreCount();

      //stop metronome
      parent.metronome.setPlayStop(false);
      parent.metronome.bar = -1;
    }

    function onPreCountMeasuresComplete() {
      console.log(
        'Pre count measures complete, resolving preCountRecordingModal'
      );
      // Remove listener to prevent re-trigger within the same cycle.

      metronomeEvents.removeEventListener(
        'preCountMeasuresComplete',
        onPreCountMeasuresComplete
      );
      resolve();
    }

    // Listen for the custom event
    metronomeEvents.addEventListener(
      'preCountMeasuresComplete',
      onPreCountMeasuresComplete
    );
  });
}
