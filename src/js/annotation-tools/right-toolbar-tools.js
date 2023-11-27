// Created wavesurfer instance from audio-player.js
import { wavesurfer, fileName } from '../audio-player.js';
import {
  jamsFile,
  addMarkerAtTime,
  renderAnnotations,
  createAnnotationsList,
  selectedAnnotationData,
  updateMarkerDisplayWithColorizedRegions,
} from '../audio-player/render-annotations.js';

import {
  showChordEditorHTMLWithCategories,
  showChordEditorHTMLWithoutCategories,
} from '../components/render_show-chord-editor.js';

import { createTooltipsChordEditor } from '../components/tooltips.js';

import { settingsMenuFollowPlayback } from '../audio-player/follow-playback.js';

import { MARKER_LABEL_SPAN_COLOR, TABLE_SELECTION_COLOR } from '../config.js';

import { variations, accidentals } from '../components/mappings.js';

import {
  areObjectsEqual,
  stripHtmlTags,
  renderModalMessage,
  renderModalPrompt,
  jsonDataToJSONFile,
} from '../components/utilities.js';

import {
  toolbarStates,
  disableAnnotationListAndDeleteAnnotation,
  disableSaveChordsAndCancelEditing,
  createChordEditor,
  /* Elements */
  //  Center controls
  annotationList,
  deleteAnnotationBtn,
  // Right controls & related Edit Mode Controls(Editing)
  editChordBtn,
  saveEditingBtn,
  cancelEditingBtn,
  //  --Chord Editor table controls--
  modalChordEditor,
  chordEditor,
  tableElements,
  applyBtn,
  cancelBtn,
} from '../annotation-tools.js';
import { clearSharedMarkersInfo } from '../playalong/collab/sharedTypesHandlers.js';

/* UI variables/states */

let lastSelectedMarker;
let sameVariationAsLast;

let chord = {
  current: {
    root: '',
    accidental: '',
    variation: '',
  },
  new: {
    root: '',
    accidental: '',
    variation: '',
  },
};

// - Annotation tools (toolbar)

/**
 * [Edit chord] allows modifying the selected chord (marker) by popping up a modal table with chord roots,variations and accidentals
 */
export function setupEditChordEvents() {
  // Edit selected chord onPressingEditChordButton (enables button)
  wavesurfer.on('marker-click', selMarker => {
    console.log('click');

    enableEditChordButtonFunction(selMarker); // 😩😩
  });
  wavesurfer.on('seek', disableEditChordButtonFunction); // 😩😩 This needs to occur and when cancel, edit, save?, switch annotation?
  editChordBtn.addEventListener('click', function () {
    showChordEditor();

    //collably chord editing initiating
    !!Collab
      ? window.awareness.setLocalStateField('chordEdit', {
          status: 'started',
          selection: chord.current,
        })
      : null;
  });

  // /* Chord Editor Modal related events: */
  chordEditor.addEventListener('click', event => {
    if (
      (event.target.tagName !== 'TD' && event.target.tagName !== 'TEXT') || // Proceed if click is on el with class Root, Accidental or Variation
      (!!Collab && !toolbarStates.EDIT_MODE) // No click event for non editors
    ) {
      return;
    }

    // A loop to find the closest element with a class
    let closestElementWithClass = event.target;
    while (
      closestElementWithClass &&
      closestElementWithClass.className === ''
    ) {
      closestElementWithClass = closestElementWithClass.parentElement;
    }
    const selection = closestElementWithClass;
    const component = closestElementWithClass.className;

    select(selection, component);
    editChord();
    // Also colorize background of new selected chord for better usability
    lastSelectedMarker.elChordSymbolSpan.classList.add('span-chord-highlight');
  });

  // cancel click
  cancelBtn.addEventListener('click', () => {
    editChord(true);
    closeModal();

    //collably chord editing completing
    if (!!Collab) {
      window.awareness.setLocalStateField('chordEdit', {
        status: 'completed',
        completingAction: 'canceled',
      });
    }
  });

  // apply click
  applyBtn.addEventListener('click', () => {
    //collably chord editing completing
    if (!!Collab) {
      window.awareness.setLocalStateField('chordEdit', {
        status: 'completed',
        completingAction: 'applied',
        chordSelection: chord.new,
      });

      //updating shared markers map
      window.sharedBTMarkers.forEach((m, k, thisMap) => {
        if (m.time === lastSelectedMarker.time) {
          //find shared marker that corresponds to marker whose chord label has changed
          //defining new shared marker parameters
          const newStatus =
            m.status == 'unedited' || m.status.includes('edited')
              ? m.status.replace(/unedited|edited/, 'edited')
              : m.status.concat(', edited');

          const newMetadata = m.metadata;
          newMetadata.mirLabel = lastSelectedMarker.mirLabel;
          //updating shared marker
          thisMap.set(`${k}`, {
            time: m.time,
            status: newStatus,
            metadata: newMetadata,
          });
        }
      });
    }

    disableAnnotationListAndDeleteAnnotation();
    closeModal();
  });
}

/**
 *  [Save] Saves stores locally changes made (at chords and beats) either as separate or replaced annotation (except original annotation)
 */
export function setupSaveChordsEvent() {
  saveEditingBtn.addEventListener('click', saveEditing);
}

/**
 *  [Cancel] Cancel reverts back without altering.
 */
export function setupCancelEditingEvent() {
  cancelEditingBtn.addEventListener('click', cancelEditingChords);
}

/**
 *  [Cancel] Cancel reverts back without altering. TODO
 */
export function setupSettingsMenu() {
  const playerSettingsBtn = document.querySelector('#player-settings-btn');
  const playerSettingsIcon = playerSettingsBtn.querySelector('.settings-icon');
  const playerSettingsModal = playerSettingsBtn.querySelector('.dropdown-menu');

  let rotateRight = true;

  playerSettingsIcon.addEventListener('click', function () {
    if (rotateRight) {
      playerSettingsIcon.classList.remove('rotate-left');
      playerSettingsIcon.classList.add('rotate-right');
      playerSettingsModal.style.display = 'block';
    } else {
      playerSettingsIcon.classList.remove('rotate-right');
      playerSettingsIcon.classList.add('rotate-left');
      playerSettingsModal.style.display = 'none';
    }
    rotateRight = !rotateRight;
  });

  settingsMenuChordEditorCategories();
  settingsMenuFollowPlayback();
}

/**
 * Configure Chord Categories in Chord Editor
 *
 * Allows the user to enable or disable the display of chord categories within the chord editor through radio buttons ("On" and "Off"). Supported categories include Major, Minor, Augmented, Diminished, Half Diminished, Fifth, Dominant, Add Chords, Suspended, Altered Chords, Dominant Altered, and Dominant Altered Seventh.
 *
 * @function settingsMenuChordEditorCategories
 */
function settingsMenuChordEditorCategories() {
  const chordCategoriesMenu = document.querySelector('#chord-categories-menu');

  let chordCategories = false;

  chordCategoriesMenu.addEventListener('click', e => {
    if (e.target.closest('#onChordCategories')) {
      chordCategories = true;
    } else if (e.target.closest('#offChordCategories')) {
      chordCategories = false;
    }

    if (chordCategories) {
      createChordEditor(showChordEditorHTMLWithCategories);
    } else {
      createChordEditor(showChordEditorHTMLWithoutCategories);
    }

    createTooltipsChordEditor();
    setupEditChordEvents();
  });
}

// -
export function editChord(cancel = false, selection) {
  // revertChord: is the marker that is now being edited
  const revertChord = _mapChordSymbolToText(chord.current);

  // selectedChord returns the label in marker.mirLabel format
  const selectedChord = toolbarStates.COLLAB_EDIT_MODE
    ? _mapChordSymbolToText(selection) //its given as argument only when function is called inside collab functions
    : _mapChordSymbolToText(chord.new);

  // remove the selected marker because ...
  const lastSelectedMarkerTime = toolbarStates.COLLAB_EDIT_MODE //lastSelectedMarker does not hold the last selection in collab non editors
    ? window.sharedBTEditParams.get('selectedMarker')
    : lastSelectedMarker.time;
  toolbarStates.COLLAB_EDIT_MODE
    ? wavesurfer.markers.remove(
        wavesurfer.markers.markers.find(m => m.time == lastSelectedMarkerTime)
      )
    : wavesurfer.markers.remove(lastSelectedMarker);

  // ... a later one will replace him with:
  // selectedChord or on Cancel revertChord
  const label = cancel ? revertChord : selectedChord;

  // all markers draggable EXCEPT first marker (at time 0.0)
  const draggable = lastSelectedMarkerTime === 0.0 ? false : true;

  const newSelectedMarker = addMarkerAtTime(
    lastSelectedMarkerTime,
    label,
    'replaced',
    draggable
  );

  if (toolbarStates.COLLAB_EDIT_MODE) {
    _setMarkerSpanColor(
      newSelectedMarker,
      wavesurfer.markers.markers.find(m => m.time == lastSelectedMarkerTime),
      MARKER_LABEL_SPAN_COLOR
    );

    newSelectedMarker.elChordSymbolSpan.classList.add('span-chord-highlight');
  } else {
    // Colorizing again the span (label element font color NOT BACKGROUND)
    _setMarkerSpanColor(
      newSelectedMarker,
      lastSelectedMarker,
      MARKER_LABEL_SPAN_COLOR
    );
    // Update lastSelectedMarker with the new one
    lastSelectedMarker = newSelectedMarker;
  }

  updateMarkerDisplayWithColorizedRegions();
}

function saveEditing() {
  //  NOTE:⚡
  // Serialization of the data happens with 'Export to disk disk or repository'
  // Instead here the annotation will be saved in browser's local storage
  // (With that way we avoid redundancy and distinguish similar features between 'Export to disk disk or repository' and 'Save'.)

  let message;
  let index = annotationList.selectedIndex;

  console.log(jamsFile);
  const selectedAnnotation = jamsFile.annotations[index];
  const currDataSource = selectedAnnotation.annotation_metadata.data_source;

  // Disable replace button on first (show original) annotation
  const replacePromptBtn = document.getElementById('replacePrompt');
  if (currDataSource === 'program') {
    message = `Do you want to <span class="text-success">save</span> <span class="text-warning">${annotationList.value}</span> as a separate annotation? 🤷‍♂️`;
    replacePromptBtn.classList.add('d-none');
  } else {
    replacePromptBtn.classList.remove('d-none');
    message = `Do you want to <span class="text-primary">replace</span> the existing annotation<br><span class="text-warning">${annotationList.value}</span> or <span class="text-success">save</span> it as a separate annotation? 🤷‍♂️`;
  }

  renderModalPrompt(message, jamsFile)
    .then(choice => {
      const newAnnotation = _createNewAnnotation();

      // this needs to be before updateMarkerDisplayWithColorizedRegions so visualizations are rendered correctly
      disableSaveChordsAndCancelEditing();

      disableEditChordButtonFunction(); //diselect marker

      console.log(newAnnotation);
      if (choice === 'replace') {
        // Replace existing annotation
        wavesurfer.clearMarkers();
        jamsFile.annotations[index] = newAnnotation;
        renderAnnotations(selectedAnnotationData(jamsFile));
      } else if (choice === 'save') {
        // Save as separate annotation
        jamsFile.annotations.push(newAnnotation);
        index = annotationList.length;
        updateMarkerDisplayWithColorizedRegions(true);
      }

      // In the annotation list include information about modification date! TODO. otan to kaneis pes mou na allaxw kai ta collaborative events.alx
      createAnnotationsList(jamsFile);
      annotationList.selectedIndex = index;

      // reset delete button if any new annotation was created
      deleteAnnotationBtn.classList.remove('disabled');

      // TODO: When analysis comes, the data is stored in local storage, this format of storage ALWAYS asks user permission if he wants to load it. In addition you can also update the content of that file saved in local storage with the save editing functions which is enabled after user has edited the file in some way
      // Save to local storage, which is designed to store data in its original format
      localStorage.setItem(fileName, JSON.stringify(jamsFile));
      // option to delete this storage? --button? or in settings menu?

      if (!!Collab) {
        // Neoklis pros Alex: Balto ama einai na ginetai mono se collab gia na min yparxoyn tzampa requests ston server
        const fNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
        const jamsToBeExported = jsonDataToJSONFile(
          jamsFile,
          fNameWithoutExt,
          'jams'
        );
        exportTempFolderRepo(jamsToBeExported);

        const newAnnotationData = _extractModalPromptFields();
        const action =
          choice === 'replace'
            ? 'saved, replacedCurrentAnnotation'
            : 'saved, savedAsSeparateAnnotation';
        window.awareness.setLocalStateField('cancelSaveEdit', {
          action,
          newAnnotationData,
        });

        //in case of save annotation list index changes
        //collably transmitting event with late-only param
        //lateOnly use: collaborators present at the time of save click, change annotationList index when...
        //... act OnSaveCancelEditStateUpdate (awarenessHandlers.js) runs
        if (choice === 'save') {
          window.sharedBTEditParams.set('annotationSel', {
            value: annotationList.value,
            selector: userParam,
            lateOnly: true
          });
        }

        //1. restoring shared markers object as modified jams has been saved in server temporary folder and late...
        //...gets markers' modifications from there
        //2.clearing shared marker selection
        clearSharedMarkersInfo();
      }
    })
    .catch(() => {
      // User canceled
      console.log('catch renderModalPrompt executed (User canceled)');
    });
}

function cancelEditingChords() {
  const message = `You are about to cancel editing.<br> Any unsaved changes will be <span class="text-warning">discarded.</span> <br><br><span class="text-info">Are you sure?</span> 🤷‍♂️`;

  console.log('before modal render!');
  renderModalMessage(message)
    .then(() => {
      // User confirmed
      wavesurfer.clearMarkers();
      // This needs to be before (for similar reason as stated in saveEditing)
      disableSaveChordsAndCancelEditing();
      renderAnnotations(selectedAnnotationData(jamsFile));

      if (!!Collab) {
        
        window.awareness.setLocalStateField('cancelSaveEdit', {
          action: 'canceled',
        });

        //edit canceled -->
        //1. restoring shared markers object
        //2. clearing shared markers selection
        clearSharedMarkersInfo();
      }
    })
    .catch(() => {
      // User canceled
    });
}

export function _createNewAnnotation(annotationData) {
  let annotatorName, annotationDataSource, annotationDescription;
  if (toolbarStates.COLLAB_EDIT_MODE) {
    [annotatorName, annotationDataSource, annotationDescription] =
      annotationData;
  } else {
    [annotatorName, annotationDataSource, annotationDescription] =
      _extractModalPromptFields();
  }

  const newAnnotation = {
    annotation_metadata: {
      curator: {
        name: `${annotatorName}`,
        email: '',
      },
      annotator: {},
      version: '',
      corpus: '',
      annotation_tools: `ChordFinder`,
      annotation_rules: '',
      validation: '',
      data_source: `${annotationDataSource}`,
    },
    namespace: 'chord',
    data: '',
    sandbox: {
      description: `${annotationDescription}`,
    },
    time: 0,
    duration: null,
  };

  // Create the annotations.data
  let annotationsData = [];
  wavesurfer.markers.markers.forEach(marker => {
    const obs = {
      time: marker.time,
      duration: marker.duration,
      value: marker.mirLabel,
      confidence: null,
    };
    annotationsData.push(obs);
  });

  // Assign annotationsData value to the newAnnotation obj
  newAnnotation.data = annotationsData;

  return newAnnotation;
}

function _extractModalPromptFields() {
  const annotatorNameInput = document.getElementById('annotatorName');
  const annotationDataSourceInput = document.getElementById(
    'annotationDataSource'
  );
  const annotationDescriptionInput = document.getElementById(
    'annotationDescription'
  );

  const annotationDataSource = annotationDataSourceInput.value;
  const annotationDescription = annotationDescriptionInput.value;
  // ..setting some default values in cases of blank text input forms
  const annotatorName =
    annotatorNameInput.value !== '' ? annotatorNameInput.value : 'Anonymous';

  return [annotatorName, annotationDataSource, annotationDescription];
}

// -
export function enableEditChordButtonFunction(selMarker) {
  console.log('selected marker:', selMarker);
  console.log(selMarker.el._tippy);
  //  NOTE: marker-click event only trigger on span element click!

  if (!!Collab) {
    window.sharedBTEditParams.set('selectedMarker', selMarker.time);
  }

  // Color selected marker ONLY
  _setMarkerSpanColor(selMarker, lastSelectedMarker, MARKER_LABEL_SPAN_COLOR);

  lastSelectedMarker = selMarker;
  console.log(lastSelectedMarker, '🤷‍♂️🤷‍♂️🤷‍♂️');

  // Enable the editChordBtn
  editChordBtn.classList.remove('disabled');
}

export function disableEditChordButtonFunction() {
  editChordBtn.classList.add('disabled');
  if (lastSelectedMarker !== undefined) {
    _setMarkerSpanColor(lastSelectedMarker, lastSelectedMarker, '');
  }
}

function _setMarkerSpanColor(selMarker, lastSelectedMarker, color) {
  const symbolSpan = selMarker.elChordSymbolSpan;
  symbolSpan.style.color = color;

  if (lastSelectedMarker !== undefined) {
    if (selMarker !== lastSelectedMarker) {
      const lastSymbolSpan = lastSelectedMarker.elChordSymbolSpan;
      symbolSpan.style.color = color;
      lastSymbolSpan.style.color = '';
    }
  } else {
    // first case scenario
    symbolSpan.style.color = color;
  }
}

// - Modal Chord Editor
export function showChordEditor(collabEditSelection) {
  // Set the flag to indicate that the modal is active
  toolbarStates.IS_MODAL_TABLE_ACTIVE = true;

  if (!toolbarStates.COLLAB_EDIT_MODE) {
    console.log(lastSelectedMarker, '🌍🌍🌍');
    chord.current.root = stripHtmlTags(lastSelectedMarker.symbolParts.root); // (removing <strong></strong>)
    chord.current.accidental = lastSelectedMarker.symbolParts.accidental;
    chord.current.variation = lastSelectedMarker.symbolParts.variation;

    console.log(chord.current);
    console.log(lastSelectedMarker.symbolParts.root);
  }
  // Open chord editor indicating the last selected chord
  !toolbarStates.COLLAB_EDIT_MODE
    ? _colorizeTableSelections(chord.current)
    : _colorizeTableSelections(collabEditSelection);

  modalChordEditor.style.display = 'block';
  applyBtn.style.visibility = 'hidden';
  cancelBtn.style.visibility = toolbarStates.COLLAB_EDIT_MODE
    ? 'hidden'
    : 'visible';
}

function select(selection, component) {
  console.log('selected table element:', selection);
  console.log('component:', component);
  // console.log('last selected marker:', lastSelectedMarker);

  _updateChordVariable(selection, component);
  _colorizeTableSelections(chord.new);

  // Show Apply button if the current chord is different from the new one
  if (!areObjectsEqual(chord.new, chord.current)) {
    applyBtn.style.visibility = 'visible';
  } else {
    applyBtn.style.visibility = 'hidden';
  }

  //transmitting the selection if in collab mode
  !!Collab
    ? window.sharedBTEditParams.set('chordSel', {
        value: chord.new,
        selector: userParam,
      })
    : null;
}

export function closeModal() {
  modalChordEditor.style.display = 'none';
  toolbarStates.IS_MODAL_TABLE_ACTIVE = false;
}

/**
 * Colorizes table elements based on matching values from the `chordParts` object.
 * If an element's `innerHTML` matches any of the non-empty values in `chord.new.root`, `chord.new.accidental`, or `chord.new.variation`, the element is colored (according to config.js TABLE_SELECTION_COLOR).
 * Otherwise, the color of the element is reset to an empty string.
 */
export function _colorizeTableSelections(chordParts) {
  let selectedElements = [];
  tableElements.forEach(element => {
    const matchingChordPart = Object.values(chordParts).find(chordPart => {
      return chordPart !== '' && element.innerHTML.trim() === chordPart;
    });

    if (matchingChordPart) {
      element.style.color = TABLE_SELECTION_COLOR;
      selectedElements.push(element);
    } else {
      element.style.color = ''; // Reset color if no match is found
    }
  });
  return selectedElements;
}

function _updateChordVariable(selection, component) {
  // Selected text in inner HTML format
  const selectedHTMLtext = selection.innerHTML.trim();

  // Checking conditions on trimmed like text with innerText & replace
  const selectedText = selection.innerText;

  // Decodes HTML entities in a string and returns the decoded string (e.g. '>' is automatically converted to '&gt;' etc).
  function decodeHtmlEntities(str) {
    var textArea = document.createElement('textarea');
    textArea.innerHTML = str;
    return textArea.value;
  }

  // this is still the previous selected variation
  let trimmedPrevVariation = decodeHtmlEntities(
    stripHtmlTags(chord.new.variation)
  );

  // Condition to uncheck all other cases except 'N.C.' & '??'
  if (selectedText === '??' || selectedText === 'N.C.') {
    chord.new.root = '';
    chord.new.accidental = '';
    chord.new.variation = selectedHTMLtext;

    sameVariationAsLast = false; // DON'T assign major in those cases
  } else {
    // Condition to uncheck N.C. or ?? when not selected
    if (trimmedPrevVariation === '??' || trimmedPrevVariation === 'N.C.') {
      chord.new.variation = '';
    } else {
      chord.new.variation = chord.new.variation;
    }

    // Decide if click was on the same variation
    if (component === 'variation') {
      sameVariationAsLast = selectedText === trimmedPrevVariation;
    } else {
      sameVariationAsLast = false;
    }

    // Otherwise assigning selections component
    chord.new[component] = selectedHTMLtext;

    // handles root after '??' 'N.C.' for required fields
    chord.new.root = chord.new.root === '' ? 'C' : chord.new.root;

    if (sameVariationAsLast) {
      // assign major chord if same click as before
      chord.new.variation = '(M)';
    } else if (chord.new.variation === '') {
      // handles variation after '??' 'N.C.' for required fields
      chord.new.variation = '(M)';
    } else {
      // update variation with the new selected (all other cases)
      chord.new.variation;
    }
  }
}

function _mapChordSymbolToText(encodedChord) {
  let foundRootNote;
  let foundAccidental;

  function combineEncodedChord(chord) {
    if (chord === null || chord === undefined) return null;
    return `${chord.root}${chord.accidental}${chord.variation}`;
  }

  // conditional variable to check if same chord as before
  const sameAsLastChord =
    combineEncodedChord(encodedChord) ===
    combineEncodedChord(lastSelectedMarker?.symbolParts);

  // 1) Find shorthand according to the font mapping
  let foundShorthand;
  const matchingShorthand = variations.find(mappingEl => {
    return mappingEl.encoded === encodedChord.variation;
  });
  // console.log(matchingShorthand);

  if (matchingShorthand) foundShorthand = matchingShorthand.shorthand || '';

  let column = ':';
  if (foundShorthand === 'N' || foundShorthand === 'X') {
    foundRootNote = '';
    foundAccidental = '';
    column = '';
  } else {
    // 1) Displayed root is same as root from MIREX format
    foundRootNote = encodedChord.root;

    // 2)Displayed accidental according to the font mapping
    foundAccidental;
    const matchingAccidental = accidentals.find(
      mappingEl => mappingEl.encoded === encodedChord.accidental
    );
    if (matchingAccidental) {
      foundAccidental = matchingAccidental.simplified || '';
    }
  }

  // Same chord as last && click is on variation EXCEPT N.C. or ?? --> 'maj'
  if (sameAsLastChord && sameVariationAsLast) foundShorthand = 'maj';

  const mirLabel = `${foundRootNote}${foundAccidental}${column}${foundShorthand}`;

  return mirLabel;
}

export function exportTempFolderRepo(file) {
  // 1) Construct FormData to encapsulate the information to be sent to the server
  let fd = new FormData();
  fd.append('action', 'upload');
  fd.append('f', file);
  fd.append('ufolder', 'jams');

  const ajax = new XMLHttpRequest();
  ajax.addEventListener('load', () => {
    console.log(ajax.responseText); // Printing server-side echo response
    // alert(`File has been exported to temporaly jams folder`);
  });
  ajax.addEventListener('error', () => {
    alert(`Failed to export file to temporally jams folder`);
  });

  ajax.open(
    'POST',
    'https://musicolab.hmu.gr/apprepository/finalizeFileStoragePAT.php',
    true
  );
  ajax.send(fd);
}
