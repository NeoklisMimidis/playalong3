const calibrateBtn = document.getElementById('calibration-btn');
const closeCalibrationModalBtn = document.getElementById('close-calibration-modal-btn');
const recalibrateBtn = document.getElementById('recalibration-btn');

let calibrating = false;
let recordAudioContext;

// async function setupCalibrationTools() {
//     if (!window.AudioWorkletNode) {
//       alert("This calculation requires AudioWorklet interface, please update your browser");
//       return;
//     }

//     //$ = document.querySelectorAll.bind(document);
//     $("#stopCalibration")[0].disabled = true;

//     //loading the custom AudioWorkletProcessor
//     // const text = $('#processor')[0].innerText;
//     // const blob = new Blob([text], {type: "application/javascript"});
//     // const url = URL.createObjectURL(blob);

//     var ac = new AudioContext({latencyHint: 0.00001});
//     $("#sample-rate")[0].innerText = ac.sampleRate;
//     var canvas = $("#calibration-canvas")[0];
//     //var canvas_debug = $("canvas")[1];
//     if (window.innerWidth < 1024) {
//       canvas.width = window.innerWidth * 0.95;
//       canvas.height = canvas.width * 0.75;
//     }
//     var w = canvas.width;
//     var h = canvas.height;
//     var ctx = canvas.getContext("2d");
//     var analyser = new AnalyserNode(ac);
//     analyser.fftSize = 2048;
//     var buf = new Float32Array(analyser.frequencyBinCount);
//     var cvs_step = w / buf.length;
//     var initialSetup = false;
  
//     var inputProcessing = document.location.search.indexOf("input-processing") != -1;
//     // var debugCanvas = document.location.search.indexOf("debug") != -1;
  
//     console.log("Input processing: ", inputProcessing);
//     // // console.log("Debug canvas", debugCanvas);
  
//     // if (!debugCanvas) {
//     //   canvas_debug.remove();
//     // }
  
//     threshold = $("#calibration-input")[0].value;
  
//     function draw() {
//       ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
//       ctx.fillRect(0, 0, w, h);
//       ctx.fillStyle = "#333";
//       analyser.getFloatTimeDomainData(buf);
//       var acc = 0;
//       var t = true;
//       [parseFloat(threshold), -0.75,-0.5,-0.25, 0, 0.25, 0.5, 0.75].forEach(function(v) {
//         if (t) {
//           ctx.strokeStyle = "#a00";
//           t = false;
//         } else {
//           ctx.strokeStyle = "#aaa";
//         }
//         ctx.fillText(v, 3, h/2 - (v * h/2) + 3);
//         ctx.beginPath();
//         ctx.moveTo(30, h/2 - (v * h/2));
//         ctx.lineTo(w-30, h/2 - (v * h/2));
//         ctx.stroke();
//         ctx.closePath();
//       });
//       for (var i = 0; i < buf.length; i++) {
//         ctx.fillRect(acc, h/2, cvs_step, buf[i] * h / 2);
//         acc+=cvs_step;
//       }
//       requestAnimationFrame(draw);
//     }
  
//     if (calibrationStopped) {
//       requestAnimationFrame(draw);
//     }
  
//     function stop() {
//       ac.suspend();

//       $("#stopCalibration")[0].disabled = true;
//       $("#startCalibration")[0].disabled = false;

//       document
//         .getElementById("calibration-input")
//         .setAttribute("disabled", true);

//       calibrationStopped = true;
//     }


//     async function start () {
//       $("#stopCalibration")[0].disabled = false;
//       $("#startCalibration")[0].disabled = true;

//       document
//         .getElementById("calibration-input")
//         .removeAttribute("disabled");

//       calibrationStopped = false;

//       draw();
//       await ac.resume();
//       try {
//         await ac.resume();
//         if (!initialSetup) {
//           const url = await URLFromFiles(['js/roundtrip-latency/measureProcessor.js']);
//           await ac.audioWorklet.addModule(url);
//           var constraints = inputProcessing ? { audio : {
//             // disabling this because we're intentionally trying to echo 
//             echoCancellation: false,
//             noiseSupression: true,
//             autoGainControl: true
//           }} : { audio: {
//             echoCancellation: false,
//             noiseSupression: false,
//             autoGainControl: false
//           }};
//           let stream = await navigator.mediaDevices.getUserMedia(constraints);
  
//           var mic_source = ac.createMediaStreamSource(stream);
//           var worklet_node = new AudioWorkletNode(ac, 'measure-processor', {outputChannelCount: [1]});
//           worklet_node.channelCount = 1;
//           mic_source.connect(analyser);
//           mic_source.connect(worklet_node).connect(ac.destination);
  
//           worklet_node.port.postMessage({threshold: $("#calibration-input")[0].value });
  
  
//           worklet_node.port.onmessage = function(e) {
//             // if (debugCanvas) {
//             //   var c2 = canvas_debug.getContext("2d");
//             //   var w2 = canvas_debug.width;
//             //   var h2 = canvas_debug.height;
//             //   var between_peaks = e.data.array;
//             //   var len = e.data.array.length;
//             //   var wstep = w2 / len;
  
//             //   c2.clearRect(0, 0, w2, h2);
  
//             //   c2.fillStyle = "#000";
//             //   var x = 0;
//             //   for (var i = 0; i < len; i++) {
//             //     c2.fillRect(x, h2/2, wstep, between_peaks[i] * h2/2);
//             //     x += wstep;
//             //   }
//             //   c2.fillStyle = "#f00";
//             //   c2.fillRect(w2 - wstep * e.data.offset, 0, wstep, h);
  
//             //   c2.fillRect(w2 - wstep * e.data.delay_frames - wstep * e.data.offset, h2 *
//             //       0.75, w2 - wstep * e.data.delay_frames, 4);
//             // }
//             //console.log(e.data.latency, ac.outputLatency);
//             $("#roundtripLatency")[0].innerText = (e.data.latency * 1000) + "ms"
//             $("#outputLatency")[0].innerText = (ac.outputLatency * 1000)+ "ms"
//           }
  
//           $("#calibration-input")[0].oninput = (e) => {
//             threshold = e.target.value;
//             worklet_node.port.postMessage({threshold: e.target.value});
//           };
//           initialSetup = true;
//         }
//       } catch (e) {
//         console.error(e);
//       }
//     }

//     // let startCalBtn = document.getElementById("startCalibration").onclick = start;
//     // const stopCalBtn = document.getElementById("stopCalibration").onclick = stop;
//     // $("#startCalibration")[0].onclick = start;
//     // $("#stopCalibration")[0].onclick = stop;
// }

// // setupCalibrationTools();

recalibrateBtn.addEventListener('click', () => {
  $('#calibration-modal').modal({
    backdrop: 'static',
    keyboard: false
  })
})

calibrateBtn.addEventListener('click', async () => {
  calibrating
    ? await stopCalibrate()
    : await startCalibrate();
})

closeCalibrationModalBtn.addEventListener('click', async () => {
  calibrating
   ? await stopCalibrate()
   : null;
  
  $('#calibration-modal').modal('hide');  
})

closeCalibrationModalBtn.setAttribute('hidden', true);

async function startCalibrate () {
  await setupWorklet();
  await recordAudioContext.resume();

  calibrating = true;

  calibrateBtn.innerText = 'Stop Calibration';
}

async function stopCalibrate () {
  await recordAudioContext.close();

  calibrating = false;

  calibrateBtn.innerText = 'Start Calibration';
  closeCalibrationModalBtn.removeAttribute('hidden');
}

async function setupWorklet () {
  recordAudioContext = new AudioContext({latencyHint: 0.00001});
  await recordAudioContext.suspend();

  const MeasureProcessorUrl = await URLFromFiles(['js/roundtrip-latency/measureProcessor.js']);
  await recordAudioContext.audioWorklet.addModule(MeasureProcessorUrl);

  const constraints = { audio: {
    echoCancellation: false,
    noiseSupression: false,
    autoGainControl: false
    }
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  const mic = recordAudioContext.createMediaStreamSource(stream);

  const workletNode = new AudioWorkletNode(recordAudioContext, 'measure-processor', {outputChannelCount: [1]});

  workletNode.channelCount = 1;
  workletNode.port.postMessage({threshold: 0.20 });

  workletNode.port.onmessage = (e) => {
    const roundtripLatency = e.data.latency * 1000;

    const outputLatency = recordAudioContext.outputLatency * 1000;
    const inputLatency = roundtripLatency - outputLatency;

    document.getElementById("latency-compensation").innerText = inputLatency;
    localStorage.setItem("latency-compensation", inputLatency.toFixed(2).toString());
  }

  mic.connect(workletNode).connect(recordAudioContext.destination);
}

function getLocalStorages() {
  if (localStorage.getItem("latency-compensation") !== null) {
      const latencyCompensation = localStorage.getItem("latency-compensation");

      document.getElementById("latency-compensation").innerText = latencyCompensation;
  }
}