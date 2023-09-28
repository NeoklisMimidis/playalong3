import tippy from 'tippy.js';
import {
  _colorizeTableSelections,
  editChord,
} from '../../annotation-tools/right-toolbar-tools';
import { mainWaveform, wavesurfer } from '../../audio-player';
import { MARKER_LABEL_SPAN_COLOR } from '../../config';
import {
  annotationList,
  chordEditor,
  disableAnnotationListAndDeleteAnnotation,
  toolbarStates,
} from '../../annotation-tools';
import {
  COLLAB_CHORD_SELECTION_TIPPY_PROPS,
  tooltips,
} from '../../components/tooltips';
import {
  addMarkerAtTime,
  updateMarkerDisplayWithColorizedRegions,
} from '../../audio-player/render-annotations';

/**
 * @param event {Y.YArrayEvent}
 */
export function handleSharedRecordingDataEvent(event) {
  const array = event.target;
  const parentMap = array.parent;
  const downloadProgress = (array.length / parentMap.get('total')) * 100;
  console.log('current progress', downloadProgress);
  const count = parentMap.get('count');

  const progressBar = updateProgressBar(
    downloadProgress,
    `#progressBar${count}`
  );

  if (downloadProgress === 100.0) {
    const f32Array = Float32Array.from(array.toArray());
    const blob = window.recordingToBlob(f32Array, parentMap.get('sampleRate'));
    let url = window.URL.createObjectURL(blob);
    let wavesurfer = window.wavesurfers.find(
      wavesurfer => +wavesurfer.container.id.match(/\d+/)[0] === count
    );
    wavesurfer?.load(url);

    progressBar?.parentElement.remove();
    window.addBlobUrlToDownload(url, count);

    if (!event.transaction.local) {
      window.recordedBuffers.push([f32Array]);
    }
  }

  // this is needed to show or hide: playAll, stopAll, mix&download, playback speed
  window.hideUnhideElements();
}

/**
 * @param event {Y.YMapEvent}
 */
export function handleSharedRecordingResetEvent(event) {
  const ymap = event.target;
  for (let key of event.keysChanged) {
    if (key === 'data' && event.keysChanged.size === 1) {
      let indexToUpdate = -1;
      for (let i = 0; i < sharedRecordedBlobs.length; i++) {
        if (sharedRecordedBlobs.get(i).get('id') === ymap.get('id')) {
          indexToUpdate = i;
          break;
        }
      }
      console.log(
        'handleSharedRecordingMetaEvent indexToUpdate',
        indexToUpdate
      );
      if (
        indexToUpdate > -1 &&
        window.recordedBuffers[indexToUpdate]?.length > 0 &&
        !event.transaction.local
      ) {
        window.recordedBuffers[indexToUpdate][0] = [0];
      }
    }
  }
}

export function handleSharedBTEditParamsEvent(value, key) {
  //console.log({key, value});
  switch (key) {
    case 'annotationSel':
      handleAnnotationSelection(value);
      break;
    case 'chordSel':
      handleChordSelection(value);
      break;
    case 'selectedMarker':
      handleMarkerSelection(value);
      break;
  }
}

export function handleSharedBTMarkersEvent(collabEditedMarker, key) {
  switch (collabEditedMarker.status) {
    //final values
    case 'edited':
      handleMarkerChordEditing(collabEditedMarker);
      break;
    case 'added':
      handleMarkerAddition(collabEditedMarker);
      break;
    case 'deleted':
      handleMarkerDeletion(collabEditedMarker);
    case 'moved':
      handleMarkerMoving(collabEditedMarker, key);
      break;
    case 'added, edited':
      {
        handleMarkerAddition(collabEditedMarker);
        handleMarkerChordEditing(collabEditedMarker);
      }
      break;
    //final and intermediary values
    case 'moved, edited':
    case 'edited, moved':
      {
        handleMarkerMoving(collabEditedMarker, key);
        handleMarkerChordEditing(collabEditedMarker);
      }
      break;
    //intermediary values between editor drag-drop events
    //dragging
    case 'to be moved':
    case 'added, to be moved':
    case 'edited, to be moved':
    case 'to be moved, edited':
    case 'added, edited, to be moved':
    case 'added, to be moved, edited':
    //dropping
    case 'added, moved': //after handleMarkerMoving call --> added
    case 'added, edited, moved': //after handleMarkerMoving call --> added, edited
    case 'added, moved, edited':
      handleMarkerMoving(collabEditedMarker, key); //after handleMarkerMoving call --> added, edited
      break;
  }
}

function handleMarkerChordEditing(collabEditedMarker) {
  //excluding cases that chord editing has already happened
  //i.e. when an (added and) edited marker is moved and the shared marker object is updated in handleMarkerMoving
  const correspondingMarker = wavesurfer.markers.markers.find(
    m => m.time == collabEditedMarker.time
  );
  if (correspondingMarker.mirLabel === collabEditedMarker.metadata.mirLabel)
    return;

  //needed in case chord edit apply event hasn t preceded, i.e. when a user is 'late'
  //not needed in opposite cases, because it s called during chord edit apply event
  //no harm calling it twice though
  disableAnnotationListAndDeleteAnnotation();

  wavesurfer.markers.remove(correspondingMarker);
  const newMarker = addMarkerAtTime(
    collabEditedMarker.time,
    collabEditedMarker.metadata.mirLabel,
    'replaced',
    false
  );
  newMarker.elChordSymbolSpan.classList.add('span-chord-highlight');
  newMarker.elChordSymbolSpan.style.color = MARKER_LABEL_SPAN_COLOR;
}

function handleMarkerDeletion(collabEditedMarker) {
  const markerToBeDeleted = wavesurfer.markers.markers.find(
    m => m.time == collabEditedMarker.time
  );

  //excluding cases of non existent marker, i.e. when markerToBeDeleted has been added during edit
  // and user enters at a later moment in the session so marker addition events haven t occured
  if (!markerToBeDeleted) return;

  wavesurfer.markers.remove(markerToBeDeleted);
  disableAnnotationListAndDeleteAnnotation();

  tooltips.markersSingleton.disable(); //to be re-enabled in next function call
  updateMarkerDisplayWithColorizedRegions();
}

function handleMarkerAddition(collabEditedMarker) {
  //excluding cases that marker has already been added
  //i.e. when an added (and edited) marker is moved and the shared marker object is updated in handleMarkerMoving
  const existingMarker = wavesurfer.markers.markers.find(
    m => m.time === collabEditedMarker.time
  );
  if (existingMarker) return;

  addMarkerAtTime(
    collabEditedMarker.time,
    collabEditedMarker.metadata.mirLabel,
    'new',
    false
  );
  disableAnnotationListAndDeleteAnnotation();
  tooltips.markersSingleton.disable(); // to be re-enabled in the next function call
  updateMarkerDisplayWithColorizedRegions();

  wavesurfer.seekAndCenter(collabEditedMarker.time / wavesurfer.getDuration());
}

function handleMarkerMoving(collabEditedMarker, key) {
  const allMarkers = wavesurfer.markers.markers;
  const status = collabEditedMarker.status;
  const metadata = collabEditedMarker.metadata;

  if (status.includes('to be moved')) {
    //editor drags

    //removing the marker that editor moves
    const markerToBeMarked = allMarkers.find(
      m => m.time === collabEditedMarker.time
    );

    wavesurfer.seekAndCenter(
      collabEditedMarker.time / wavesurfer.getDuration()
    );
    disableAnnotationListAndDeleteAnnotation();

    markerToBeMarked.collabEditStatus = 'to be moved';
  } else if (status.includes('moved')) {
    //editor drops

    const markerToBeRemoved = allMarkers.find(
      m => m.time == metadata.timeOfMarkerToBeRemoved
    );
    //excluding cases where handleMarkerMoving has been entered after a marker, that has been previously moved,
    //is chord edited. In those cases, status= moved, edited || status= edited, moved
    if (!markerToBeRemoved) return;
    //removing old marker
    markerToBeRemoved ? wavesurfer.markers.remove(markerToBeRemoved) : null;

    //adding new marker...
    const newMarker = addMarkerAtTime(
      collabEditedMarker.time,
      markerToBeRemoved.mirLabel,
      'edited',
      false
    );
    tooltips.markersSingleton.disable(); //to be re-enabled in the next function call
    updateMarkerDisplayWithColorizedRegions();

    //modifying shared marker object, in case marker is added during editing, so as:
    //1.added, moved --> added || added, edited, moved --> added, edited || added, moved, edited --> added, edited
    //2.metadata doesn t include original time since it has no value
    //reason of modification: if a marker is added, we don t care if it is additionaly moved. In case someone enters
    //in the middle of an edit session, a marker will be added at its final timing (time property of shared marker object)
    if (status.includes('added')) {
      const newStatus = status.replace(', moved', '');
      delete metadata.originalTime;
      window.sharedBTMarkers.set(`${key}`, {
        time: collabEditedMarker.time,
        status: newStatus,
        metadata,
      });
    }
  }
}

export function handleMarkerSelection(selectedMarkerTime) {
  //In cases where user enters in the middle of edit session return
  //Marker selection is set to occur just after edit initiated events (awarenessHandlers.js --> actOnBTrackEditStateUpdate)
  if (!toolbarStates.COLLAB_EDIT_MODE) return;
  //decolorizing-resetting prev selection
  const prevSelection = mainWaveform.querySelector(
    '.collaboratively-selected-marker'
  );
  prevSelection
    ? (prevSelection.querySelector('.span-chord-symbol').style.color = '')
    : null;
  //centering waveform view at selected marker time
  const progress = selectedMarkerTime / wavesurfer.getDuration();
  wavesurfer.seekAndCenter(progress);
  //selecting new one
  const markerSelected = wavesurfer.markers.markers.find(
    marker => marker.time === selectedMarkerTime
  );
  markerSelected.el.classList.add('collaboratively-selected-marker');
  markerSelected.elChordSymbolSpan.style.color = MARKER_LABEL_SPAN_COLOR;
}

function handleChordSelection(selection) {
  //in cases where user enters in the middle of chord edit during BT edit session, return
  //Chord selection is set to occur just after chord started events (awarenessHandlers.js --> )
  if (!toolbarStates.COLLAB_EDIT_MODE) return;
  //removing all previous selector popovers
  chordEditor.querySelectorAll(`.collaboratively-selected`).forEach(prevSel => {
    prevSel._tippy.destroy();
    prevSel.classList.remove(`collaboratively-selected`);
  });

  const selectedElements = _colorizeTableSelections(selection.value);

  selectedElements.forEach(el => {
    el.classList.add(`collaboratively-selected`);
    //making a popover with selector's name
    const tippyInstance = tippy(el, COLLAB_CHORD_SELECTION_TIPPY_PROPS);
    tippyInstance.setContent(selection.selector);
    tippyInstance.show();
  });
}

function handleAnnotationSelection(selection) {
  //if annotation list has not yet been created or if new sel=prev sel dont run
  if (!annotationList.options.length || annotationList.value == selection.value)
    return;

  //changing the annotation
  annotationList.value = selection.value;
  annotationList.dispatchEvent(new Event('change'));

  //notifying user that annotation has changed
  const notifText = `${selection.selector} has changed the annotation.`;
  const notifContext = 'info';
  notify(notifText, notifContext);
}
