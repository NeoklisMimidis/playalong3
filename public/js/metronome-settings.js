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
setTempo(bpmOptions.default);

const defaultTempoVolume = 0.5;
setVolume(defaultTempoVolume * 100); //takes values from 0-100

// Rhythm
timeSignatureNumerator.value = 2; // values between 1-7
timeSignatureDenominator.value = 4; // values: 4 or 8
resolution.value = 4; // values: 4, 8 or 16 (ths)
setNumerator(timeSignatureNumerator.value);
setDenominator(timeSignatureDenominator.value);
setResolution(resolution.value);

setMetroCont(false); // true or false 'Continuous' option

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

function setMetroCont(continuous) {
  document.querySelector(continuous ? '#countOn' : '#countOff').checked = true;
  parent.metronome.setMetroCont(continuous);
}

// - - - - - -
//  Metronome settings menu
function setupMetronomeMenu() {
  const metronomeSettingsMenu = document.querySelector('#metronome-btn');
  const metronomeSettingsIcon = document.querySelector('#metronome-icon');
  const metronomeModal = metronomeSettingsMenu.querySelector('.dropdown-menu');

  metronomeSettingsTempo();
  createModalPreCount(); // create initial pre count modal

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
      createModalPreCount(); // update pre count modal
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
    createModalPreCount(); // update pre count modal
  });

  timeSignatureDenominator.addEventListener('change', function (event) {
    setDenominator(event.target.value);
    createModalPreCount(); // update pre count modal
  });

  resolution.addEventListener('change', function (event) {
    setResolution(event.target.value);
    createModalPreCount(); // update pre count modal
  });
}

function metronomeSettingsTempo() {
  const bpmInput = document.querySelector('#bpmInput');
  assignInputFieldEvents(bpmInput, bpmOptions);
  createVolumeDialAndNumberBox();
}

function createModalPreCount() {
  // console.log('-modal pre count updated 😍');

  const preCountMeasures = document.getElementById('precount').selectedIndex;
  // console.log('pre count measures:', preCountMeasures);

  const beatsPerMeasure = parent.metronome.numerator;
  // console.log('beats per measure', beatsPerMeasure);

  const clicksPerBeat =
    parent.metronome.noteResolution / parent.metronome.denominator;
  // console.log('clicks per beat:', clicksPerBeat);

  // HTML creations
  let clicksPerBeatHTML = '';
  if (clicksPerBeat === 0.5) {
    const clicksPerMeasure = parent.metronome.numerator / (clicksPerBeat * 4);
    clicksPerBeatHTML = `${clicksPerMeasure} clicks per measure`;
  } else if (clicksPerBeat === 1) {
    clicksPerBeatHTML = `${clicksPerBeat} click per beat`;
  } else {
    clicksPerBeatHTML = `${clicksPerBeat} clicks per beat`;
  }

  const dotsMeasureHTML = `
<div class="dots-measure">
 ${'<div class="dot"></div>'.repeat(beatsPerMeasure)}
</div>
  `;

  // final HTML pre count
  const preCountHTML = `
<div class="title"><span>Get Ready!</span></div>
  <div class="beats-info"><span>${clicksPerBeatHTML}</span></div>
  <div class="dots">
    ${dotsMeasureHTML}

    ${
      preCountMeasures === 2
        ? `<div class="dots-measure-separator"></div>${dotsMeasureHTML}`
        : ''
    } 

</div>
`;

  // replace old html with the new one
  const preCountModalEl = document.getElementById('preCountModal');
  preCountModalEl.innerHTML = preCountHTML;
}

// this function is being invoked in the metronome.js!! with the scheduler()
function updatePreCountDot(beatNumber) {
  // console.log('check me!!', beatNumber);
  const denominator = parent.metronome.denominator;
  const currentMeasure = parent.metronome.bar + 1;

  const preCountModalEl = document.getElementById('preCountModal');

  // User's selected in Metronome settings pre count measures
  const preCountMeasures = document.getElementById('precount').selectedIndex;

  // hide pre count modal after pre count measures ended
  if (currentMeasure === preCountMeasures + 1) {
    if (preCountModalEl.classList.contains('d-none')) return;

    preCountModalEl.classList.add('d-none');

    // Dispatch a custom event
    metronomeEvents.dispatchEvent(new Event('preCountMeasuresComplete'));
  } else if (currentMeasure > preCountMeasures + 1) return;

  if (beatNumber % (16 / denominator) === 0) {
    // console.log('beat');

    // (e.g. if 4 beats per measure and 3rd is played then currentBeatPosition = 3)
    const currentBeatPosition = beatNumber / (16 / denominator) + 1;

    // first div:nth-child selects measure (because of the measure-separator 2nd measure is 3rd child)
    // second div:nth-child selects specific dot for current beat
    const currentDot = preCountModalEl.querySelector(
      `div.dots > div:nth-child(${currentMeasure === 2 ? 3 : 1})
       > div:nth-child(${currentBeatPosition})`
    );
    currentDot?.classList.add('dot-played');
  } else {
    // console.log('tick');
  }
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
    // console.log(selection);
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
    // console.log('blur');
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
