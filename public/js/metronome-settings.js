var start_bar_no = 0;
var stop_bar_no = 2;
var metro_measures = 2;

// initialise UI

// Tempo
var tempoValue = document.getElementById('tempoValue');
var tempoVolume = document.getElementById('volumeValue');

var tempoInputValue = document.getElementById('tempoSlider');
var tempoInputVolumeValue = document.getElementById('volumeSlider');

var tempoInput = document.getElementById('bpmInput');
var tempoVolumeInput = document.getElementById('number-box');
// console.log(tempoInput.innerHTML);
// console.log(tempoVolumeInput.innerHTML);

// tempo-menu
// // bpmInput
// // // next box prev
// // tempoVolumeInput
// // // dial & number-box

//
tempoValue.innerHTML = document.getElementById('tempoSlider').value;
tempoVolume.innerHTML = document.getElementById('volumeSlider').value;

// tempoValue.innerHTML = tempoInput.
tempoVolume.innerHTML = document.getElementById('volumeSlider').value;

// Rhythm
var timeSignatureNumerator = document.getElementById('TSNumerator');
var timeSignatureDenominator = document.getElementById('TSDenominator');
var resolution = document.getElementById('resolution');
var playStop = document.getElementById('playStop');

// Initial values
timeSignatureNumerator.selectedIndex = 5;
timeSignatureDenominator.selectedIndex = 1;
resolution.selectedIndex = 2;
playStop.checked = false;

// 1 -- communicate changes to the metronome through these functions
function setNumerator(v) {
  //console.log('numerator changed to: ', v);
  parent.metronome.setNumerator(v);
  window.playerConfig?.set('numerator', v);
}
function setDenominator(v) {
  //console.log('denominator changed to: ', v);
  parent.metronome.setDenominator(v);
  window.playerConfig?.set('denominator', v);
}
function setTempo(t) {
  parent.metronome.setTempo(t);
  document.getElementById('tempoValue').innerHTML = t;
  window.playerConfig?.set('tempoValue', t);
}
function setResolution(r) {
  //console.log('resolution changed to: ', r);
  parent.metronome.setResolution(r);
}
function setPlayStop(b) {
  parent.metronome.setPlayStop(b);
  //console.log('playStop changed to: ', b);
}

// viglis
function setMetroCont(c) {
  parent.metronome.setMetroCont(c);
  //console.log('Metronome will play continuously during recording:',c);
  if (c == true) {
    document.getElementById('startBarInput').disabled = true;
    document.getElementById('stopBarInput').disabled = true;
    document.getElementById('metro_measures').setAttribute('hidden', 'true');
    document.getElementById('metro_infinite').removeAttribute('hidden');
    //console.log("metronome will play for ever");
    //console.log("no input allowed");
  } else {
    document.getElementById('startBarInput').disabled = false;
    document.getElementById('stopBarInput').disabled = false;
    document.getElementById('metro_measures').removeAttribute('hidden');
    document.getElementById('metro_infinite').setAttribute('hidden', 'true');
    //console.log("metronome will play for ",metro_measures,"measures");
    //console.log("input allowed");
  }
}

function setVolume(vo) {
  parent.metronome.setVolume(vo);
  document.getElementById('volumeValue').innerHTML = vo;
}

function setStartBar(start_value) {
  const numberValue = Number(start_value);

  if (isNaN(numberValue) || numberValue < -5 || numberValue > stop_bar_no) {
    // If the value is not within the allowed range, display an error message
    alert('Please enter a valid bar# greater than -5 ');
    document.getElementById('startBarInput').value = start_bar_no;
    return;
  } else {
    // If the value is within the allowed range, update the UI
    start_bar_no = start_value;
    document.getElementById('startBarInput').value = start_value;
    // and send the value to metronome.js
    parent.metronome.setStartBar(start_value);
    //console.log('metronome will start from bar# ',start_value);
  }
}

function setStopBar(stop_value) {
  const numberValue = Number(stop_value);
  if (isNaN(numberValue) || numberValue < start_bar_no) {
    // If the value is not within the allowed range, display an error message
    alert('Please enter a valid bar#');
    document.getElementById('stopBarInput').value = stop_bar_no;
    return;
  } else {
    // If the value is within the allowed range, update the UI
    stop_bar_no = stop_value;
    document.getElementById('stopBarInput').value = stop_value;
    // and send the value to metronome.js
    parent.metronome.setStopBar(stop_value);
    //console.log('metronome will stop at the beginning of bar# ',stop_value);
  }
}

function setMetroMeasures(m) {
  //console.log("metronome will play for ",m,"measures");
  metro_measures = m;
  stop_bar_no = start_bar_no + m;
  //console.log("stop_bar_no=",stop_bar_no);
  setStopBar(stop_bar_no);
}
// \viglis

parent.document.addEventListener('startedSoundEvent', function (e) {
  document.getElementById('playStop').checked = true;
});
parent.document.addEventListener('stoppedEvent', function (e) {
  document.getElementById('playStop').checked = false;
});

// Set metronome values on collaboration mode
function setTempoValueRemote(tempo) {
  parent.metronome.setTempo(tempo);
  document.getElementById('tempoSlider').value = tempo;
  document.getElementById('tempoValue').innerHTML = tempo;
}

function setNumeratorRemote(v) {
  parent.metronome.setNumerator(v);
  timeSignatureNumerator.value = v;
}
function setDenominatorRemote(v) {
  parent.metronome.setDenominator(v);
  timeSignatureDenominator.value = v;
}

// -

function setupMetronomeMenu() {
  const metronomeSettingsMenu = document.querySelector('#metronome-btn');
  const metronomeSettingsIcon = document.querySelector('#metronome-icon');
  const metronomeModal = metronomeSettingsMenu.querySelector('.dropdown-menu');

  let metronomeModalEnabled = false;
  metronomeSettingsMenu.addEventListener('click', function (e) {
    console.log('-------------------------');

    // close metronome modal only on metronome icon click
    if (e.target.closest('#metronome-icon')) {
      metronomeModalEnabled = !metronomeModalEnabled;
      if (metronomeModalEnabled) {
        toolbarStates.IS_MODAL_TABLE_ACTIVE = true;
        metronomeModal.style.display = 'block';
        metronomeSettingsIcon.classList.add('flip-horizontal');
      } else {
        toolbarStates.IS_MODAL_TABLE_ACTIVE = false;
        metronomeModal.style.display = 'none';
        metronomeSettingsIcon.classList.remove('flip-horizontal');
      }
    }
  });

  metronomeSettingsTempo();
}
setupMetronomeMenu();

function metronomeSettingsTempo() {
  const bpmInput = document.querySelector('#bpmInput');
  const bpmOptions = {
    default: 60,
    step: 1.0,
    min: 30,
    max: 300,
    current: null,
  };
  assignInputFieldEvents(bpmInput, bpmOptions);
}

function assignInputFieldEvents(selector, options) {
  const box = selector.querySelector('.box');
  const next = selector.querySelector('.next');
  const prev = selector.querySelector('.prev');

  box.innerText = options.default;
  options.current = options.default;

  next.addEventListener('click', () => {
    let currentValue = parseFloat(box.innerText);
    if (currentValue < options.max) {
      currentValue += options.step;
      box.innerText = currentValue;
      options.current = currentValue;
    }
  });

  prev.addEventListener('click', () => {
    let currentValue = parseFloat(box.innerText);
    if (currentValue > options.min) {
      currentValue -= options.step;
      box.innerText = currentValue;
      options.current = currentValue;
    }
  });

  box.addEventListener('keypress', e => {
    let maxLength = Math.max(
      options.min.toString().length,
      options.max.toString().length
    );

    let inputChar = String.fromCharCode(e.which);
    let caretPosition = window.getSelection().anchorOffset;
    let nextValue =
      box.innerText.slice(0, caretPosition) +
      inputChar +
      box.innerText.slice(caretPosition);

    // Only accept numeric input
    if (!inputChar.match(/[0-9]/)) {
      e.preventDefault();
    }
    // Don't allow values larger than options.max and length bigger than maxLength
    else if (+nextValue > options.max || nextValue.length > maxLength) {
      e.preventDefault();
    }
  });

  box.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      box.blur();
    }
  });

  box.addEventListener('blur', () => {
    let currentValue = parseInt(box.innerText);
    if (isNaN(currentValue)) {
      box.innerText = options.default;
      options.current = options.default;
    } else if (currentValue < options.min) {
      box.innerText = options.min;
      options.current = options.min;
    } else if (currentValue > options.max) {
      box.innerText = options.max;
      options.current = options.max;
    } else {
      box.innerText = currentValue;
      options.current = currentValue;
    }
  });
}

var dial = new Nexus.Dial('#dial', {
  size: [35, 35],
  interaction: 'vertical', // "radial", "vertical", or "horizontal"
  mode: 'absolute', // "absolute" or "relative"
  min: 0,
  max: 1,
  step: 0,
  value: 0,
});

dial.value = 0.5;
// dial.colorize('fill', '#fffcf1');
// dial.colorize('accent', 'rgb(255, 242, 194)');
// dial.colorize('accent', '#111');
// dial.colorize('accent', '#ff0');
dial.colorize('accent', '#777');

var number = new Nexus.Number('#number-box', {
  size: [50, 25],
  value: 0,
  min: 0,
  max: 1,
  step: 0.05,
});

number.link(dial);
// number.colorize('accent', 'rgb(255, 242, 194)');
