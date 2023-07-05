/* Elements */
// Tempo
const tempoInput = document.querySelector('#bpmInput .box');
let dial, numberBox; // *  tempoVolume Controls: dial & numberBox

// Rhythm
const timeSignatureNumerator = document.getElementById('TSNumerator');
const timeSignatureDenominator = document.getElementById('TSDenominator');
const resolution = document.getElementById('resolution');

/* Initial variables values & initialize UI*/
// Tempo
const bpmOptions = {
  default: 90,
  step: 1.0,
  min: 30,
  max: 300,
  current: null,
};
const defaultTempoVolume = 0.5;

setVolume(defaultTempoVolume * 100); //takes values from 0-100

// Rhythm
timeSignatureNumerator.selectedIndex = 0; // 2
timeSignatureDenominator.selectedIndex = 0; // 4
resolution.selectedIndex = 0; // 4ths
setNumerator(2);
setDenominator(4);
setResolution(4);

setupMetronomeMenu();

// - - - - - -
// Metronome functionality
// 1 -- communicate changes to the metronome through these functions
function setTempo(t) {
  parent.metronome.setTempo(t);
  window.playerConfig?.set('tempoValue', t);
}
function setVolume(vo) {
  parent.metronome.setVolume(vo);
}

function setNumerator(v) {
  // console.log('numerator changed to: ', v);
  parent.metronome.setNumerator(v);
  window.playerConfig?.set('numerator', v);
}
function setDenominator(v) {
  // console.log('denominator changed to: ', v);
  parent.metronome.setDenominator(v);
  window.playerConfig?.set('denominator', v);
}
function setResolution(r) {
  // console.log('resolution changed to: ', r);
  parent.metronome.setResolution(r);
}

// Set metronome values on collaboration mode
function setTempoValueRemote(tempo) {
  parent.metronome.setTempo(tempo);
  tempoInput = tempo;
}

function setNumeratorRemote(v) {
  parent.metronome.setNumerator(v);
  timeSignatureNumerator.value = v;
}
function setDenominatorRemote(v) {
  parent.metronome.setDenominator(v);
  timeSignatureDenominator.value = v;
}

// - - - - - -
//  Metronome settings menu
function setupMetronomeMenu() {
  const metronomeSettingsMenu = document.querySelector('#metronome-btn');
  const metronomeSettingsIcon = document.querySelector('#metronome-icon');
  const metronomeModal = metronomeSettingsMenu.querySelector('.dropdown-menu');

  metronomeSettingsTempo();

  let metronomeModalEnabled = false;
  metronomeSettingsMenu.addEventListener('click', function (e) {
    console.log('-------------------------');

    // Show/hide metronome settings menu || Tempo BPM || Measures Pre-count & Count
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
    } else if (e.target.closest('#bpmInput')) {
      setTempo(bpmOptions.current);
    } else if (e.target.closest('#precount')) {
      const preCountEl = e.target.closest('#precount');
      parent.metronome.setStopBar(preCountEl.selectedIndex);
    } else if (e.target.closest('#countOn')) {
      parent.metronome.setMetroCont(true);
    } else if (e.target.closest('#countOff')) {
      parent.metronome.setMetroCont(false);
    }
  });

  // Tempo Volume (dial & numberBox)
  dial.on('change', function (v) {
    setVolume(+v.toFixed(2) * 100);
  });

  numberBox.on('change', function (v) {
    setVolume(+v.toFixed(2) * 100);
  });

  // Rhythm  Time signature & Resolution
  timeSignatureNumerator.addEventListener('change', function (event) {
    setNumerator(event.target.value);
  });

  timeSignatureDenominator.addEventListener('change', function (event) {
    setDenominator(event.target.value);
  });

  resolution.addEventListener('change', function (event) {
    setResolution(event.target.value);
  });
}

function metronomeSettingsTempo() {
  const bpmInput = document.querySelector('#bpmInput');
  assignInputFieldEvents(bpmInput, bpmOptions);
  createVolumeDialAndNumberBox();
}

// - - - - - -
// Utilities functions for the creation of custom inputs

/**
 * This function assigns appropriate event handlers to a custom number input component. It manages user interactions
 * including increment, decrement and direct input, and ensures the input values stay within the defined min-max range.
 *
 * @param {Object} selector - DOM element that encapsulates the custom input component.
 * @param {Object} options - An object defining the properties of the custom number input.
 * @param {Number} options.default - The default value of the input.
 * @param {Number} options.step - The increment/decrement step for the next and previous actions.
 * @param {Number} options.min - The minimum value that the input can take.
 * @param {Number} options.max - The maximum value that the input can take.
 * @param {Number} options.current - The current value of the input, updated upon user interaction.
 *
 * The function:
 * 1. Assigns click event listeners to the 'next' and 'previous' controls to increment/decrement the value.
 * 2. Handles direct input from the user ensuring it is numeric, within the defined range and of a valid length.
 * 3. Handles 'Enter' keydown event to defocus the input field.
 * 4. Handles 'blur' event to sanitize and set the input value according to defined constraints.
 */
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

    let selection = window.getSelection();
    console.log(selection);
    let startPosition = Math.min(selection.anchorOffset, selection.focusOffset);
    let endPosition = Math.max(selection.anchorOffset, selection.focusOffset);

    let nextValue =
      box.innerText.slice(0, startPosition) +
      inputChar +
      box.innerText.slice(endPosition);

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
    console.log('blur');
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

    // Also trigger a click event to update caller only with addEventLister on click
    box.click();
  });
}

function createVolumeDialAndNumberBox() {
  dial = new Nexus.Dial('#dial', {
    size: [35, 35],
    interaction: 'vertical', // "radial", "vertical", or "horizontal"
    mode: 'absolute', // "absolute" or "relative"
    min: 0,
    max: 1,
    step: 0,
    value: 0,
  });

  dial.value = defaultTempoVolume;
  // dial.colorize('fill', '#fffcf1'); 'rgb(255, 242, 194)'
  dial.colorize('accent', '#777');

  numberBox = new Nexus.Number('#number-box', {
    size: [50, 25],
    value: 0,
    min: 0,
    max: 1,
    step: 0.05,
  });

  numberBox.link(dial);
  numberBox.colorize('accent', '#777');
}
