'use strict';

// Created wavesurfer instance from audio-player.js
import {
  wavesurfer,
  audioPlayerAndControlsContainer,
  prefaceAnnotationBar,
  toolbar,
  mainWaveformBPM,
  downloadJAMSBtn,
} from './audio-player.js';
import { jamsFile } from './audio-player/render-annotations.js';

import {
  setupSnapOnBeatsEvent,
  setupClickTrackEvent,
} from './annotation-tools/left-toolbar-tools.js';

import {
  setupAnnotationListEvents,
  setupToggleEditEvent,
} from './annotation-tools/center-toolbar-tools.js';

import {
  setupEditChordEvents,
  setupSaveChordsEvent,
  setupCancelEditingEvent,
  setupSettingsMenu,
} from './annotation-tools/right-toolbar-tools.js';

import {
  setupAddBeatAndChordEvent,
  setupEditBeatTimingEvents,
  setupRemoveBeatAndChordEvent,
} from './annotation-tools/waveform-editing-tools.js';

import { createTooltipsChordEditor } from './components/tooltips.js';

import { downloadJAMS, resetToggle } from './components/utilities.js';

import {
  showChordEditorHTMLWithCategories,
  showChordEditorHTMLWithoutCategories,
} from './components/render_show-chord-editor.js';

/* Elements */

/* UI variables/states */
let annotationToolsInitialized = false; // this is used to avoid bugs that occur when a new annotation file is loaded and events are assigned again (so assigning events only on clean state).

/* Elements */
// Left controls
export const toggleSnapOnBeatsBtn = document.getElementById(
  'toggle-SnapOnBeats-btn'
);
export const toggleClickTrackBtn = document.getElementById(
  'toggle-clickTrack-btn'
);
//  Center controls
export const annotationList = document.getElementById('annotation-list');
export const deleteAnnotationBtn = document.querySelector(
  '#delete-annotation-btn'
);
export const toggleEditBtn = document.querySelector('#toggle-edit-btn');
// Right controls & related Edit Mode Controls(Editing)
export const editModeTools = document.querySelector('#right-toolbar-controls');
export const audioFileName = document.querySelector('#audio-file-name');
export const editChordBtn = document.querySelector('#edit-chord-btn');
export const saveChordsBtn = document.querySelector('#save-chords-btn');
export const cancelEditingBtn = document.querySelector('#cancel-editing-btn');

//  --Chord Editor table controls--
export let modalChordEditor;
export let chordEditor;
export let tableElements;
export let applyBtn;
export let cancelBtn;

export const toolbarStates = {
  SNAP_ON_BEATS: false,
  CLICK_TRACK: false,
  EDIT_MODE: false,
  COLLAB_EDIT_MODE: false,
  SAVED: true,
  IS_MODAL_TABLE_ACTIVE: false, // useful to disable some events while modal active
};

window.toolbarStates = toolbarStates;

// - EVENTS
export function initAnnotationTools() {
  if (annotationToolsInitialized) return;

  /* Chord Editor Modal - Creation, tooltips & events */
  createChordEditor(showChordEditorHTMLWithoutCategories);
  createTooltipsChordEditor();

  /* Events (for editor) */
  // // Default browsers warning when exiting without saving
  // window.addEventListener('beforeunload', function (e) {
  //   if (saveChordsBtn.classList.contains('disabled')) return;
  //   e.returnValue = '';
  // });

  /* --------------------- */
  /* Left controls events */
  /* -------------------- */

  setupSnapOnBeatsEvent();
  setupClickTrackEvent();

  /* ---------------------- */
  /* Center controls events */
  /* ---------------------- */

  setupAnnotationListEvents();
  setupToggleEditEvent();

  /* --------------------- */
  /* Right controls events */
  /* --------------------- */

  // Annotation tools (toolbar)
  setupEditChordEvents();
  setupSaveChordsEvent();
  setupCancelEditingEvent();

  // Annotation tools (waveform)
  setupAddBeatAndChordEvent();
  setupEditBeatTimingEvents();
  setupRemoveBeatAndChordEvent();

  // -
  setupSettingsMenu();

  /* ------- */
  /* OTHERS */
  /* ------ */
  setupDownloadJamsEvent();
  setupCalculateTempoEvent();

  console.log(
    'initAnnotationTools is complete! Events & tooltips for ANNOTATION TOOLS ready! ⚡'
  );

  annotationToolsInitialized = true;
}

// -
export function resetToolbar() {
  // hide preface annotation bar(help + audio file name)
  prefaceAnnotationBar.classList.add('d-none');

  toolbar.classList.remove('d-none');

  // Left controls
  resetToggle('#toggle-SnapOnBeats-btn');
  resetToggle('#toggle-clickTrack-btn');

  // Middle controls
  annotationList.classList.remove('disabled');
  resetToggle('#toggle-edit-btn');

  // Right controls (Edit mode controls)
  audioFileName.classList.remove('d-none');
  editModeTools.querySelectorAll('.btn-edit-mode').forEach(button => {
    button.classList.add('d-none');
    button.classList.add('disabled');
  });

  // enable download again
  downloadJAMSBtn.classList.remove('disabled');

  // removing editing color
  toolbar.classList.remove('editing-on');

  // display bpm, prev chord, next chord
  mainWaveformBPM.classList.remove('d-none');

  editModeTools.classList.add('pointer-events-disabled');
  const questionIcon = document.querySelector('.fa-circle-question');
  const infoIcon = document.querySelector('.fa-circle-info');
  questionIcon.classList.remove('d-none');
  infoIcon.classList.add('d-none');

  console.log('resetToolbar is complete 😁');
}

export function disableSaveChordsAndCancelEditing() {
  annotationList.classList.remove('disabled');

  const selectedAnnotation = jamsFile.annotations[annotationList.selectedIndex];
  const currDataSource = selectedAnnotation.annotation_metadata.data_source;

  // ONLY remove IF not automatic analysis annotation
  if (currDataSource !== 'program') {
    deleteAnnotationBtn.classList.remove('disabled');
  }

  saveChordsBtn.classList.add('disabled');
  cancelEditingBtn.classList.add('disabled');

  // update the SAVED state
  toolbarStates.SAVED = true;

  toolbar.classList.remove('editing-on');
}

export function disableAnnotationListAndDeleteAnnotation() {
  annotationList.classList.add('disabled');
  deleteAnnotationBtn.classList.add('disabled');

  saveChordsBtn.classList.remove('disabled');
  cancelEditingBtn.classList.remove('disabled');

  // update the SAVED state
  toolbarStates.SAVED = false;

  console.log(' disableAnnotationListAndDeleteAnnotation');
  toolbar.classList.add('editing-on');
}

export function createChordEditor(chordEditorHTML) {
  audioPlayerAndControlsContainer.insertAdjacentHTML(
    'afterend',
    chordEditorHTML
  );

  modalChordEditor = document.getElementById('show-chord-editor');
  chordEditor = modalChordEditor.querySelector('#chord-editor');
  tableElements = modalChordEditor.querySelectorAll('#chord-editor td');
  applyBtn = modalChordEditor.querySelector('#apply-btn');
  cancelBtn = modalChordEditor.querySelector('#cancel-btn');
}

// - OTHERS ||TODO: probably move to waveform-editing-tools.js and rename that script as audio-player-editing-tools.js

function setupDownloadJamsEvent() {
  downloadJAMSBtn.addEventListener('click', () => {
    downloadJAMS(jamsFile);
  });
}

function setupCalculateTempoEvent() {
  //  Calculate tempo once in the start
  calculateTempo(wavesurfer.markers.markers[0].duration);
  // ..and now calculate beat for every region
  wavesurfer.on('region-in', region => {
    // console.log('Tempo:', 60 / (region.end - region.start));
    const beatDuration = region.end - region.start;
    calculateTempo(beatDuration);
  });
}

//  Just for now an easy to calculate tempo solution
function calculateTempo(beatDuration) {
  let tempo = 60 / beatDuration;
  tempo = Math.floor(tempo);

  // impose a lower and upper limit to the tempo
  const minTempo = 30;
  const maxTempo = 248;

  if (tempo < minTempo) {
    tempo = minTempo;
  } else if (tempo > maxTempo) {
    tempo = maxTempo;
  }

  const tempoValue = document.getElementById('tempo-value');
  tempoValue.textContent = tempo;
}
