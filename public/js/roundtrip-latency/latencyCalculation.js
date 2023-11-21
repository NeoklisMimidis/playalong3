const calibrateBtn = document.getElementById('calibration-btn');
const closeCalibrationModalBtn = document.getElementById(
  'close-calibration-modal-btn'
);
const recalibrateBtn = document.getElementById('recalibration-btn');

let calibrating = false;
let recordAudioContext;

getLocalStorages();

recalibrateBtn.addEventListener('click', () => {
  $('#calibration-modal').modal({
    backdrop: 'static',
    keyboard: false,
  });
});

calibrateBtn.addEventListener('click', async () => {
  calibrating ? await stopCalibrate() : await startCalibrate();
  // await setupRecording(); // TODO REMOVE
});

closeCalibrationModalBtn.addEventListener('click', async () => {
  calibrating ? await stopCalibrate() : null;
  // await setupRecording(); // TODO REMOVE
  $('#calibration-modal').modal('hide');
});

async function startCalibrate() {
  await setupCalibrationWorklet();
  await recordAudioContext.resume();

  calibrating = true;

  calibrateBtn.innerText = 'Stop Calibration';
}

async function stopCalibrate() {
  await recordAudioContext.close();

  calibrating = false;

  calibrateBtn.innerText = 'Start Calibration';
}

async function setupCalibrationWorklet() {
  recordAudioContext = new AudioContext({ latencyHint: 0.00001 });
  await recordAudioContext.suspend();

  const MeasureProcessorUrl = await URLFromFiles([
    'js/roundtrip-latency/measureProcessor.js',
  ]);
  await recordAudioContext.audioWorklet.addModule(MeasureProcessorUrl);

  const constraints = {
    audio: {
      echoCancellation: false,
      noiseSupression: false,
      autoGainControl: false,
    },
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  const mic = recordAudioContext.createMediaStreamSource(stream);

  const workletNode = new AudioWorkletNode(
    recordAudioContext,
    'measure-processor',
    { outputChannelCount: [1] }
  );

  workletNode.channelCount = 1;
  workletNode.port.postMessage({ threshold: 0.2 });

  workletNode.port.onmessage = e => {
    const roundtripLatency = e.data.latency * 1000;

    // const outputLatency = recordAudioContext.outputLatency * 1000;
    // const inputLatency = roundtripLatency - outputLatency;

    document.getElementById('latency-compensation').innerText =
      roundtripLatency.toString(); // use roundtrip NOT inputLatency;
    localStorage.setItem(
      'latency-compensation',
      roundtripLatency.toFixed(2).toString()
    );
  };

  mic.connect(workletNode).connect(recordAudioContext.destination);
}

function getLocalStorages() {
  if (localStorage.getItem('latency-compensation') !== null) {
    const latencyCompensation = localStorage.getItem('latency-compensation');

    document.getElementById('latency-compensation').innerText =
      latencyCompensation;
  }
}
