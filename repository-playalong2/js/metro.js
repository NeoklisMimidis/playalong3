/*const metronome = document.getElementById("metronome");
const bpmInput = document.getElementById("bpm");
const startMetro = document.getElementById("start_metro");
const stopMetro = document.getElementById("stop_metro");

let intervalId;

startButton.addEventListener("click", function() {
  const bpm = bpmInput.value;
  const interval = (60 / bpm) * 1000;
  
  metronome.currentTime = 0;
  metronome.play();
  
  intervalId = setInterval(function() {
    metronome.currentTime = 0;
    metronome.play();
  }, interval);
});

stopMetro.addEventListener("click", function() {
  clearInterval(intervalId);
}); 
*/
const bpmInput = document.querySelector('#bpm');

var bpm = bpmInput.value
var startMetro = document.getElementById("start_metro");
var stopMetro = document.getElementById("stop_metro");
startMetro.addEventListener('click', startMetronome);
stopMetro.addEventListener('click', stopMetronome);

var audio = new Audio("audio/metronome.wav");
// Set the tempo (in beats per minute)
var tempo = 120;

// Calculate the interval between beats (in milliseconds)
var interval = 60000 / tempo;

// Initialize the metronome
function stopMetronome() {
    clearInterval(interval);
}

function startMetronome() {
  interval = setInterval(function() {
      audio.currentTime = 0;
      audio.play();
  }, 60000 / tempo);
}

function countdown() {
  let count = 0;
  let interval = setInterval(function() {
    if (count >= 4) {
      clearInterval(interval);
      return;
    }
    audio.currentTime = 0;
    audio.play();
    count++;
  }, 1000);
}


