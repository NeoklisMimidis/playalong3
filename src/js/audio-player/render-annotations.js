'use strict';

// Created wavesurfer instance from audio-player.js
import { wavesurfer, fileName } from '../audio-player.js';

import {
  initAnnotationTools,
  annotationList,
  deleteAnnotationBtn,
  toolbarStates,
  resetToolbar,
} from '../annotation-tools.js';

import { variations, accidentals, chordColor } from '../components/mappings.js';
import {
  tooltips,
  initDelegateInstance,
  REGIONS_DELEGATE_PROPS,
  MARKERS_SINGLETON_PROPS,
  createTippySingleton,
} from '../components/tooltips.js';
import { loadFile, renderModalMessage } from '../components/utilities.js';

import {
  EDIT_MODE_ENABLED_STYLE,
  EDIT_MODE_DISABLED_STYLE,
  NEW_MARKER_STYLE,
  EDITED_MARKER_STYLE,
} from '../config.js';

export let jamsFile;
let averageTempoWithoutSpeedFactor = 0;

//used in sharedBTMarkers observer (setup.js)
export let bTMarkersReady = false;

// -

export function loadJAMS(input) {
  if (input === undefined) return;
  console.log('loadJams() input:', input);

  const [fileUrl, file] = loadFile(input);

  // let jamsFile;
  let annotatedChordsAtBeatsData;

  function handleJAMSData(jamsData) {
    jamsFile = jamsData;

    // Reset markers,regions & toolbarStates
    wavesurfer.clearMarkers();
    wavesurfer.clearRegions();
    // init toolbar states: MUST HAPPEN BEFORE renderAnnotations() ❗ because states affect the rendering of the new annotation with updateMarkerDisplayWithColorizedRegions()

    // Init toolbar states
    Object.assign(toolbarStates, {
      EDIT_MODE: false,
      SNAP_ON_BEATS: false,
      CLICK_TRACK: false,
      SAVED: true,
    });
    // console.log('Toolbar states reset', toolbarStates);

    createAnnotationsList(jamsFile);

    //set collab annotation selection
    // if (Collab) {
    //   const annotationSelected =
    //     window.sharedBTEditParams?.get('annotationSel')?.value;
    //   annotationSelected ? (annotationList.value = annotationSelected) : null;
    // }
    // neoklis: // this condition creates BUG in collab url scenario at the selectedAnnotationData function!

    // Render first annotation
    annotatedChordsAtBeatsData = selectedAnnotationData(jamsFile);
    renderAnnotations(annotatedChordsAtBeatsData);

    // Assign the events for the toolbar and waveform (all the functionality about annotation-tools lies here!)
    initAnnotationTools();

    resetToolbar();

    console.log('Loading JAMS has been successfully completed! ✌️');
    bTMarkersReady = true;

    // Save to local storage, which is designed to store data in its original format
    localStorage.setItem(fileName, JSON.stringify(jamsFile));

    return annotatedChordsAtBeatsData;
  }

  // console.log('file url', fileUrl);
  // console.log('file', file);

  // Giving priority to fetch from server and NOT from browser's local storage
  fetch(fileUrl)
    .then(response => {
      // console.log('response:', response);
      return response.json();
    })
    .then(jams => {
      // console.log('jams', jams);
      jamsFile = jams;
      [annotatedChordsAtBeatsData] = handleJAMSData(jams);
    })
    .catch(error => {
      console.error('\n⚠️ FETCH ERROR :\n', error);

      // Attempt to load from local storage
      const jamsFromLocalStorage = JSON.parse(localStorage.getItem(fileName));
      console.log('trying to load annotation from local storage..');

      if (!jamsFromLocalStorage) {
        console.error('No matching JAMS file in local storage.');
        return;
      } else {
        const message = `An analysis was found in your browser's local storage that matches the currently loaded audio file: <span class="text-primary">"${fileName}"</span> <br><br><span class="text-info">Would you like to load this annotation?</span> 🤷‍♂️`;

        renderModalMessage(message)
          .then(() => {
            // User confirmed load from browser storage
            jamsFile = jamsFromLocalStorage;
            // annotatedChordsAtBeatsData = handleJAMSData(jamsFromLocalStorage);
            [annotatedChordsAtBeatsData] = handleJAMSData(jamsFromLocalStorage);
          })
          .catch(() => {
            // User canceled deletion
            console.log(
              `User selected to not load analysis from browser's local storage`
            );
          });
      }
    });

  return [annotatedChordsAtBeatsData, jamsFile];
}

export function createAnnotationsList(jamsFile) {
  // Clear the existing options
  annotationList.innerHTML = '';

  jamsFile.annotations.forEach(annotation => {
    // Extract the JAMS annotations with namespace 'chord'
    if (annotation['namespace'] === 'chord') {
      const option = document.createElement('option');

      if (annotation.annotation_metadata.data_source === 'program') {
        option.text = '(automatic analysis)';
      } else if (annotation.annotation_metadata.data_source === 'user') {
        option.text = `Edit by ${annotation.annotation_metadata.curator.name}`;
      } else if (
        annotation.annotation_metadata.data_source === 'collaborative'
      ) {
        option.text = `Edit by ${annotation.annotation_metadata.curator.name}`;
      } else {
        console.error(
          `Not a valid JAMS 'data_source' in your namespace: 'chord' annotation file!`
        );
      }
      // Finally adding the option in the dropdown list
      annotationList.add(option);
    } else {
      console.error(
        'Sorry currently only JAMS annotation with chord namespace are supported!'
      );
    }
  });
}

// Return the annotation data of the selected annotation
export function selectedAnnotationData(jamsFile) {
  const selectedAnnotation = jamsFile.annotations[annotationList.selectedIndex];
  const currDataSource = selectedAnnotation.annotation_metadata.data_source;

  // console.log({ index: annotationList.selectedIndex, currDataSource });

  if (currDataSource === 'program') {
    deleteAnnotationBtn.classList.add('disabled');
  } else {
    deleteAnnotationBtn.classList.remove('disabled');
  }

  const annotationData = selectedAnnotation.data;
  return annotationData;
}

/*
The JAMS format for annotation data comprises a list of observations. Each observation includes: time || duration || value || confidence
  */
export function renderAnnotations(annotationData) {
  console.log('Rendering annotations ...');
  // Add regions and markers to the waveform
  annotationData.forEach((obs, i) => {
    const startTime = obs.time;
    // const endTime = obs.time + obs.duration; // not used because duration of annotations can change while editing annotations. Instead a separate function for the calculation of observation duration is utilized (check: updateMarkerDisplayWithColorizedRegions)
    const chordLabel = obs.value;

    // LABELS
    // a) Add a NON-DRAGGABLE marker for the first observation with start time: 0.0 and respective chord label, or create one NON-DRAGGABLE marker with the 'N' label.
    if (i === 0) {
      let firstMarkerLabel;
      if (startTime !== 0) {
        // This will be the second marker bcs one more will be added before after that if statement (below)
        addMarkerAtTime(startTime, chordLabel);

        firstMarkerLabel = 'N';
      } else {
        firstMarkerLabel = chordLabel;
      }
      const firstMarker = addMarkerAtTime(0.0, firstMarkerLabel, 'new', false);
    } else {
      addMarkerAtTime(startTime, chordLabel);
    }
  });
  console.log('Markers have been successfully rendered! ✌️');

  updateMarkerDisplayWithColorizedRegions(true);
}

export function addMarkerAtTime(
  time,
  label,
  markerType = 'new',
  draggable = true,
  color = 'grey',
  position = 'top',
  preventContextMenu = true
) {
  const chordParts = _getChordParts(label);

  const marker = wavesurfer.addMarker({
    time: time,
    tooltip: '"Click or drag left/right"',
    label: _simplifiedLabel(chordParts),
    draggable: draggable,
    markerElement: null,
    color: color,
    position: position,
    preventContextMenu: preventContextMenu, // prevents default right clicking menu
  });

  // Rendering label as chord symbol instead of text
  const markerLabel = marker.el.querySelector('.marker-label');
  const chordSymbolSpan = marker.el.querySelector('.marker-label span');

  // Adding classes to displayed spans, for easier manipulation of styles from CSS stylesheet
  chordSymbolSpan.classList.add('span-chord-symbol'); // add a class for easier manipulation from CSS stylesheet

  const [symbolLabel, symbolParts] = _mapChordTextToSymbol(chordParts);

  // display chord symbol and store chord parts for later usage in chord editor
  chordSymbolSpan.innerHTML = symbolLabel;
  marker.symbolParts = symbolParts;
  // -

  // allow pointer events ONLY on the label (from stylesheet CSS marker has 'none' pointer event)
  wavesurfer.util.style(markerLabel, {
    pointerEvents: 'auto',
  });

  // Add and store mir format label as a property (for colorizing reasons)
  marker.mirLabel = label; // CAREFUL: label ==! marker.label

  const markerLine = marker.el.querySelector('div:nth-child(1)');

  // Apply marker style depending on type
  if (markerType === 'new') {
    wavesurfer.util.style(markerLine, NEW_MARKER_STYLE);
  } else if (markerType === 'edited') {
    wavesurfer.util.style(markerLine, EDITED_MARKER_STYLE);
  } else if (markerType === 'replaced') {
    wavesurfer.util.style(markerLine, EDIT_MODE_ENABLED_STYLE);
  }

  // Storing references to frequently accessed child elements of the marker.
  // This is done to optimize performance by reducing the number of times the DOM tree is traversed
  marker.elLine = markerLine;
  marker.elLabel = markerLabel;
  marker.elLabelSvg = marker.el.querySelector('.marker-label svg');
  marker.elChordSymbolSpan = chordSymbolSpan;
  // NOTE {I could have also used DOM children method, instead of querySelector bcs for (e.g. markerLine === marker.el.children[0]) BUT if the marker structure changes then a lot of bugs will appear}

  return marker;
}

// CAREFUL:
// this function MUST be called every time a marker is dragged, added, removed!
export function updateMarkerDisplayWithColorizedRegions(editModeStyle = false) {
  // Object containing all created markers
  const markers = wavesurfer.markers.markers;
  // console.log('markers', markers);
  let prevChord = 'N';

  // Sort markers by using marker.time information
  markers.sort((a, b) => a.time - b.time);

  // Clear previous chord regions
  wavesurfer.clearRegions();

  // Create a delegateInstance: array of regular tippy instances(tippy step 1 -region tooltips)
  if (!tooltips.regions) {
    const parentEL = '#waveform > wave';
    tooltips.regions = initDelegateInstance(
      parentEL,
      '.chord-region',
      REGIONS_DELEGATE_PROPS
    );
  }

  let tempoMarkers = 0;
  markers.forEach(function (marker, index) {
    // Set style on marker depending on edit state
    if (editModeStyle) {
      _setStyleOnMarker(marker, prevChord, index);
    }

    _hideRepeatedSVG(marker, prevChord);

    // Calculate duration & add/update the required property for each marker.
    _addDurationToMarker(marker, index, markers);

    // Add a REGION for each wavesurfer.marker
    _colorizeChordRegion(marker, index); // Also adds region tooltips (tippy step 2 -region tooltips)

    // Store tooltip as an HTML element data attribute (tippy step 1 -markers tooltips)
    // set true to display additional metrics marker tooltips
    const markersTooltipContent = _createTooltipText(marker, true);
    marker.el.setAttribute('data-tooltip', markersTooltipContent);

    // Hold all beats to find the average beat
    const tempo = 60 / marker.duration;
    tempoMarkers += tempo;

    prevChord = marker.mirLabel;
  });

  const totalBeats = wavesurfer.markers.markers.length - 1;
  averageTempoWithoutSpeedFactor = tempoMarkers / totalBeats;
  updateAverageTempo();

  // Create a singleton: array of regular tippy instances(tippy step 2 -markers tooltips)
  tooltips.markersSingleton = createTippySingleton(
    '.wavesurfer-marker',
    'data-tooltip',
    MARKERS_SINGLETON_PROPS
  );

  // re-enable markers tooltips because they are disabled on various editing changes to avoid bugs
  tooltips.markersSingleton.enable();

  wavesurfer.enableDragSelection({
    loop: false, //depends on START of button! TODO FIXME
    color: 'rgba(0, 0, 0, 0.1)',
    id: 'loop-region',
    showTooltip: false,
    removeButton: true,
  });

  // collab info status depending on current state
  if (!!Collab) {
    // Select the element
    const infoSpan = document.querySelector('#infoSpan');
    if (!infoSpan) return;

    // Get the current text content
    const currentText = infoSpan.textContent;

    let newText;
    if (!toolbarStates.SAVED) {
      newText = currentText.replace(/will edit!/g, 'is editing!');
    } else {
      newText = currentText.replace(/is editing!/g, 'will edit!');
    }

    // Update the element's text content
    infoSpan.textContent = newText;
  }

  console.log('Chord regions have been successfully colorized! ✌️');
}

function _getChordParts(chordLabel) {
  let chordParts = {
    rootNote: '',
    accidental: '',
    shorthand: '',
    bassNote: '',
  };

  // Root is always the first letter
  if (chordLabel === 'N' || chordLabel === 'X') {
    chordParts.rootNote = '';
    chordParts.shorthand = chordLabel;
  } else {
    chordParts.rootNote = chordLabel.charAt(0);
  }

  if (chordParts.shorthand !== 'N' && chordParts.shorthand !== 'X') {
    const colonIndex = chordLabel.indexOf(':');
    // Accidental is after the first letter but before column (:)
    chordParts.accidental = chordLabel.substring(1, colonIndex) || '';
    // Shorthand & Bass note is the part after column (:)
    const afterColumn = chordLabel.substring(colonIndex + 1);
    // Shorthand is the part before forward slash (/)
    chordParts.shorthand = afterColumn.split('/')[0] || '';
    // Bass note is the part after forward slash (/)
    chordParts.bassNote = afterColumn.split('/')[1] || '';
  }
  return chordParts;
}

function _createTooltipText(marker, extraMetrics = false) {
  const chordParts = _getChordParts(marker.mirLabel);
  const { rootNote, accidental, shorthand, bassNote } = chordParts;

  let tooltip;
  variations.forEach(el => {
    if (el.shorthand !== shorthand) return;
    tooltip = el.description || '';
  });

  const tooltipSimplifiedLabel = marker.label;

  const tooltipTime = Math.round(marker.time * 100) / 100;
  const tooltipDuration = Math.round(marker.duration * 100) / 100;

  if (extraMetrics) {
    tooltip = `🎶 ${tooltipSimplifiedLabel}
  <br>Time: <span class="text-secondary">${tooltipTime}s</span>
  <br>Duration: <span class="text-secondary">${tooltipDuration}s</span>`;
  } else {
    tooltip = `🎶 ${rootNote}${accidental}  ${
      shorthand === 'maj' ? '' : ' '
    }${tooltip}${bassNote !== '' ? '/' + bassNote : ''}`;
  }

  return tooltip;
}

/**
 * Simplifies 67 chord shorthands (65 regular and 2 special cases) as per mapping defined in mapping.js.
 *
 * While existing algorithms primarily identify major and minor chords (including inversions), few extend to the comprehensive Tetrads vocabulary (min, maj, min7, maj7, minmaj7, 7, sus2, sus4, min6, maj6, dim, aug, dim7, hdim7). This vocabulary constitutes a small part of possible chord variations.
 *
 * To accommodate these variations, additional shorthands are mapped to their MIREX equivalents, as per Christopher Harte's methodology. This enables chord evaluation tools like mireval to handle a wider array of chords, ensuring future compatibility in the annotation storage process. It's worth mentioning that these annotations are stored in JAMS (Json Annotated Music Specification), a format widely adopted within the MIREX community.
 *
 * MIREX chord symbols are formatted as follows: {string Root Accidental (# or b) : Shorthand / bass note}. For example, "C#:min/3" in MIREX is simplified to "C# m/3".
 *
 * @returns string displayedLabel
 */
function _simplifiedLabel(chordParts) {
  const { rootNote, accidental, shorthand, bassNote } = chordParts;

  const matchingEl = variations.find(
    mappingEl => mappingEl.shorthand === shorthand
  );

  const bassNoteWithSlash = bassNote !== '' ? '/' + bassNote : '';

  const displayedLabel = `<strong>${rootNote}</strong>${accidental}${
    shorthand === 'maj' ? '' : ' '
  }${matchingEl.simplified}${bassNoteWithSlash}`;

  return displayedLabel;
}

/**
 * Map MIREX chord format to Genius Jam Tracks font symbol display [According to: SVG_fonts.otf (fonts file)]
 *
 * @return formatted innerHTML for symbol display (font) based on label and the symbol parts
 */
function _mapChordTextToSymbol(chordParts) {
  const { rootNote, accidental, shorthand, bassNote } = chordParts;

  // 1)Displayed root is same as root from MIREX format
  const displayedRootNote = `<strong class='root'>${rootNote}</strong>`;

  // 2)Displayed accidental according to the font mapping
  let displayedAccidental;
  const matchingAccidental = accidentals.find(
    mappingEl => mappingEl.simplified === accidental
  );
  if (matchingAccidental) {
    displayedAccidental =
      `<strong class='accidental'>${matchingAccidental.encoded}</strong>` || '';
  }

  // 3)Displayed shorthand according to the font mapping
  let displayedShorthand;
  const matchingShorthand = variations.find(
    mappingEl => mappingEl.shorthand === shorthand
  );
  if (matchingShorthand) {
    // in the case of maj assign '' otherwise the encoded font
    displayedShorthand =
      shorthand === 'maj'
        ? ''
        : `<text class='variation'>${matchingShorthand.encoded}</text>` || '';
  }

  // 4)Displayed bass note plus adding a forward slash in front
  const bassNoteWithSlash = bassNote !== '' ? '/' + bassNote : '';
  const displayedBassNote = `<text>${bassNoteWithSlash}</text>`;

  // ..and finally the encoded innerHTML for symbol display on top of markers
  const encodedFontSymbol = `${displayedRootNote}${displayedAccidental}${
    shorthand === 'maj' ? '' : ' '
  }${displayedShorthand}${displayedBassNote}`;

  // .. and the parts separate for other use cases
  const symbolParts = {
    root: rootNote,
    accidental: matchingAccidental.encoded,
    variation: matchingShorthand.encoded,
    inversion: bassNoteWithSlash,

    displayedRootNote: displayedRootNote,
    displayedAccidental: displayedAccidental,
    displayedVariation: displayedShorthand,
    displayedInversion: displayedBassNote,
  };

  return [encodedFontSymbol, symbolParts];
}

/*
 * Set style on markers depending on edit state
 *
 * This function sets the style of Wavesurfer markers based on whether edit mode is enabled, hiding repeated chord labels in normal mode, and disabling dragging in normal mode. The "None" chord label is only visible in edit mode.
 *
 */
function _setStyleOnMarker(marker, prevChord, index) {
  // a) Enable/disable dragging of marker depending on edit state
  const markerLabel = marker.elLabel;
  if (index === 0) {
    markerLabel.style.marginLeft = '4px';
  }

  //  also note that markers coming from editor collaborator are always disabled, because EDIT_MODE is false for collaborator which does not edit
  wavesurfer.util.style(markerLabel, {
    pointerEvents: toolbarStates.EDIT_MODE ? 'auto' : 'none',
  });

  // b) Hide marker-labels depending on edit mode state
  const chordSymbolSpan = marker.elChordSymbolSpan;

  const chordLabel = marker.mirLabel;
  if (chordLabel === 'N') {
    // Handle the No chord 'N' case || only visible on edit
    if (toolbarStates.EDIT_MODE || toolbarStates.COLLAB_EDIT_MODE) {
      {
        chordSymbolSpan.classList.remove('invisible-up');
      }
    } else {
      chordSymbolSpan.classList.add('invisible-up');
    }
  }

  if (chordLabel === prevChord && chordLabel !== 'N') {
    // add class ONLY if satisfying Element doesn't contain it
    if (!chordSymbolSpan.classList.contains('invisible-up')) {
      chordSymbolSpan.classList.toggle('invisible-up');
    }

    // Display labels & tooltip on edit
    if (toolbarStates.EDIT_MODE || toolbarStates.COLLAB_EDIT_MODE) {
      chordSymbolSpan.classList.toggle('invisible-up');
    }
  }

  // proceed with the following ONLY when changes are saved
  if (!toolbarStates.SAVED) return;

  // c) Style marker line depending on edit state
  const markerLine = marker.elLine;
  if (index === 0) {
    markerLine.style.width = '0px';
  } else {
    wavesurfer.util.style(
      markerLine,
      toolbarStates.EDIT_MODE || toolbarStates.COLLAB_EDIT_MODE
        ? EDIT_MODE_ENABLED_STYLE
        : EDIT_MODE_DISABLED_STYLE
    );
  }

  // d) revert background color (cases where a chord was change with Edit chord)
  chordSymbolSpan.classList.remove('span-chord-highlight');
}

function _hideRepeatedSVG(marker, prevChord) {
  const chordLabel = marker.mirLabel;

  const markerLabelSvg = marker.elLabelSvg;
  if (chordLabel === prevChord || marker.time === 0) {
    markerLabelSvg.classList.add('hidden');
  } else {
    markerLabelSvg.classList.remove('hidden');
  }
}

function _addDurationToMarker(marker, index, markers) {
  const currentMarkerTime = marker.time;
  const nextMarkerTime =
    index === markers.length - 1 // check if it is last marker - condition
      ? wavesurfer.getDuration() // last marker case - if true
      : markers[index + 1].time; // next marker time -if false

  const duration = nextMarkerTime - currentMarkerTime;

  // round a number to three decimal places //  needs testing because sometimes it leads BUGs with less decimals
  marker.duration = Math.round(duration * 10000) / 10000;
}

function _colorizeChordRegion(marker, index) {
  // Add a REGION for each wavesurfer.marker
  const region = wavesurfer.addRegion({
    start: marker.time,
    end: marker.time + marker.duration,
    data: {
      mirex_chord: marker.mirLabel,
      displayed_chord: marker.label,
    },
    // color: _getChordColor(marker.mirLabel) || 'transparent', // returns color depending on chord root note
    color: _getChordColor(marker.mirLabel) || 'rgba(255, 0, 0, 0.9)', // else(||) case useful, to find unmatched labels
    loop: false,
    drag: false,
    resize: false,
    showTooltip: false,
    id: index + 1,
    removeButton: false,
  });

  region.element.classList.add('chord-region');
  // console.log(region.element);

  const regionsTooltipContent = _createTooltipText(marker, false);
  region.element.setAttribute('data-tooltip', regionsTooltipContent);
}

function _getChordColor(chordLabel) {
  const { rootNote, accidental } = _getChordParts(chordLabel);
  // Get root with accidental (or 'X' , 'N' cases)
  const rootWithAccidental = rootNote + accidental || chordLabel;

  // Get color as assigned in chordColor mapping
  const matchedRootWithAccidental = Object.keys(chordColor).find(
    noteMatch => rootWithAccidental === noteMatch
  );

  return chordColor[matchedRootWithAccidental];
}

export function updateAverageTempo() {
  const averageTempo = Math.floor(averageTempoWithoutSpeedFactor * speed01);
  const bpmBox = document.querySelector('#bpmInput > div > span.box');
  bpmBox.innerText = averageTempo;
  window.metronome.setTempo(averageTempo);

  // console.log('----------------------------');
  // console.log('average tempo changed!:');
  // console.log(averageTempo);
}
