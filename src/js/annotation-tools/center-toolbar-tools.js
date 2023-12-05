// Created wavesurfer instance from audio-player.js
import { fileName, wavesurfer } from '../audio-player.js';
import { zoomIn, zoomOut } from '../audio-player/player-controls.js';
import {
  jamsFile,
  renderAnnotations,
  selectedAnnotationData,
  updateMarkerDisplayWithColorizedRegions,
} from '../audio-player/render-annotations.js';

import { tooltips } from '../components/tooltips.js';

import { findPrevNextBeatsStartTime } from '../annotation-tools/left-toolbar-tools.js';

import { renderModalMessage, createToggle, jsonDataToJSONFile } from '../components/utilities.js';

/* Elements */
import {
  toolbarStates,
  // Center controls
  annotationList,
  deleteAnnotationBtn,
  toggleEditBtn,
  editModeTools,
  // Right controls & related Edit Mode Controls(Editing)
  audioFileName,
} from '../annotation-tools.js';
import { clearSharedMarkersInfo } from '../playalong/collab/sharedTypesHandlers.js';
import { exportTempFolderRepo } from './right-toolbar-tools.js';

// - 'Annotation list' and 'Edit' mode toggle switch
/**
 *  [Annotation drop down list & Delete] Change displayed annotation or delete selected
 */

export function setupAnnotationListEvents() {
  // On annotationList change, Clear previous & render the new selected annotation
  annotationList.addEventListener('change', function (event) {
    // DESTROY previous tooltips (new ones are created with renderAnnotations)
    tooltips.markersSingleton.destroy();
    console.log(event.isTrusted);

    // clear previous markers and regions
    wavesurfer.clearMarkers();
    wavesurfer.clearRegions();
    console.log({ value: this.value, jamsFile });

    // render new selected annotations
    renderAnnotations(selectedAnnotationData(jamsFile));

    // This sets the correct start time for the next beat, part of the 'snap on beats' function
    findPrevNextBeatsStartTime(
      wavesurfer.getCurrentTime() / wavesurfer.getDuration()
    );

    //if event fired by js code, i.e. handleAnnotationSelection...
    //...in sharedTypesHandlers.js (runs in collaborators when annotation changes), isTrusted is false
    //so only user that clicks change, and not collaborators, runs the following
    if (Collab && event.isTrusted){
      //collably changing the annotation selected
      window.sharedBTEditParams.set('annotationSel', {
        value: this.value,
        selector: userParam,
      });
      //restore shared markers and clear shared marker selection
      clearSharedMarkersInfo();
    }
  });

  deleteAnnotationBtn.addEventListener('click', () => {
    deleteAnnotation();
  });
}

/**
 *  [Edit] Grants access to Edit mode and a set of tools designed for modifying selected annotations.
 */
export function setupToggleEditEvent() {
  toggleEditBtn.addEventListener('click', function () {
    //collably initiating edit
    if (!!Collab) {
      const status = `${
        toolbarStates.EDIT_MODE ? 'editCompleted' : 'editInitiated'
      }`;
      const bTrackState = {
        status,
        editTime: wavesurfer.getCurrentTime(),
      };
      status == 'editCompleted'
        ? (bTrackState.completingAction = 'editOff')
        : null;
      window.awareness.setLocalStateField('bTrackEdit', bTrackState);
    }

    toggleEdit();
  });
}

// - Center controls
function deleteAnnotation() {
  const message = `You are about to delete <span class="text-danger">${annotationList.value}.</span><br><br><span class="text-info">Are you sure?</span> 🤷‍♂️`;
  const delAnnotation = annotationList.value;

  renderModalMessage(message)
    .then(() => {
      // User confirmed
      wavesurfer.clearMarkers();
      //  Remove annotation from JAMS file
      jamsFile.annotations.splice(annotationList.selectedIndex, 1);
      // Removes selected annotation from annotationList drop-down list
      annotationList.remove(annotationList.selectedIndex);
      // Render the annotation (by default first drop-down list option)
      renderAnnotations(selectedAnnotationData(jamsFile));
      // Save to local storage, which is designed to store data in its original format
      localStorage.setItem(fileName, JSON.stringify(jamsFile));

      if (Collab) {
        //collably deleting annotation
        console.log({userParam, delAnnotation});
        window.awareness.setLocalStateField('deleteAnnotation', {
          status: true,
          deleter: userParam,
          delAnnotation
        });
        //updating server's jam in temp folder, so that late gets the correct version
        const fNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
        const jamsToBeExported = jsonDataToJSONFile(
          jamsFile,
          fNameWithoutExt,
          'jams'
        );
        exportTempFolderRepo(jamsToBeExported);
        //deleting shared annotation selection (late automatically loads the first drop-down selection, no shared selection needed)
        window.sharedBTEditParams.delete('annotationSel');
        //restoring shared markers and clearing shared marker selection since annotation has changed
        clearSharedMarkersInfo();
      }
          })
    .catch(() => {
      // User canceled
    });
}

function toggleEdit() {
  // Create toggle functionality for edit button
  let [editModeState, _, __] = createToggle('#toggle-edit-btn');
  toolbarStates.EDIT_MODE = editModeState;
  console.log(
    `Edit ${toolbarStates.EDIT_MODE ? 'enabled! Have fun 😜!' : '..disabled'} `
  );

  // zoom once in or out when entering edit mode
  toolbarStates.EDIT_MODE ? zoomIn() : zoomOut();

  if (wavesurfer.getCurrentTime() === wavesurfer.getDuration()) {
    // this fixes a buggy situation that cursor stats at max audio duration and Edit toggle is pressed
    wavesurfer.seekTo(0);
  } else {
    const progress = wavesurfer.getCurrentTime() / wavesurfer.getDuration();
    wavesurfer.seekAndCenter(progress);
  }

  // Edit mode controls  #buttons: Edit chords || Save || Cancel
  audioFileName.classList.toggle('d-none');
  editModeTools.querySelectorAll('.btn-edit-mode').forEach(button => {
    button.classList.toggle('d-none');
  });

  updateMarkerDisplayWithColorizedRegions(true);

  // Tippy (tooltips) related functionality
  const questionIcon = document.querySelector('.fa-circle-question');
  const infoIcon = document.querySelector('.fa-circle-info');
  if (toolbarStates.EDIT_MODE) {
    editModeTools.classList.remove('pointer-events-disabled');
    questionIcon.classList.add('d-none');
    infoIcon.classList.remove('d-none');
    tooltips.regions[0].disable(); //disable region tooltips while on edit mode (markers tooltip are still there)
  } else {
    editModeTools.classList.add('pointer-events-disabled');
    questionIcon.classList.remove('d-none');
    infoIcon.classList.add('d-none');
    tooltips.regions[0].enable();
  }
}
