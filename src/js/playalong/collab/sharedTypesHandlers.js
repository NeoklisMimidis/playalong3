import tippy from 'tippy.js';
import {
  _colorizeTableSelections,
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
import { annotationChangeAfterSaveReceived } from './awarenessHandlers';


/**
 * @param event {Y.YArrayEvent}
 */
export function handleSharedRecordingDataEvent(event) {
  const array = event.target;
  const parentMap = array.parent;
  const downloadProgress = (array.length / parentMap.get('total')) * 100;
  console.log('current progress', downloadProgress);
  //Commented out because it creates bug in the following case:...
  //...user records --> deletes the rec --> late enters with count var having been re-set to 1
  //  a: late records, passes the count=1 property --> collaborator runs fillRecordingTemplate with count=2 (count hasn t been re-set here) --> count=1 is used here to determine the right wavesurfer --> no wavesurfer with that count 
  //  b: non-late records, passes the count=2 property --> late collaborator runs fillRecordingTmplate with count=1 (count has been re-set) --> count=2 is used here to determinne the right wavesurfer --> no wavesurfer with that count
  //const count = parentMap.get('count');

  const progressBar = updateProgressBar(
    downloadProgress,
    `#progressBar${count}`
  );

  if (downloadProgress === 100.0) {
    console.log(`rec reception is complete. Count variable=${count}`);

    const f32Array = Float32Array.from(array.toArray());
    const blob = window.recordingToBlob(f32Array, parentMap.get('sampleRate'));
    let url = window.URL.createObjectURL(blob);
    let wavesurfer = window.wavesurfers.find(
      wavesurfer => +wavesurfer.container.id.match(/\d+/)[0] === count
    );
    wavesurfer?.load(url);

    progressBar?.parentElement.remove();
    window.addBlobUrlToDownload(url, count);
    
    //count gets augmented HERE (and not in fillRecordingTemplate), because here is it s final use in the collab rec's creation
    count++;

    if (!event.transaction.local) {
      window.recordedBuffers.push([f32Array]);
      window.recordedBlobs.push(blob);
    }

    //needed to fix bug relevant to recorder deleting his/her recording while collaborators havent yet received it    
    if (event.transaction.local) {
      window.sharedRecReception.set(userParam, parentMap.get('id'));
    } else {
      window.sharedRecReception.set(userParam, true);
    }


    // this is needed to show or hide: playAll, stopAll, mix&download, playback speed
    window.hideUnhideElements();
  }
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
    case 'annotationSel':{
      if(!value)
        return;
      if (value.lateOnly) {
        !annotationChangeAfterSaveReceived
          ? setTimeout(()=>handleAnnotationSelection(value), 7000)
          : null;
      } else
        handleAnnotationSelection(value);
    }
      break;
    case 'chordSel':
      value ? handleChordSelection(value) : null;
      break;
    case 'selectedMarker':
      value ? handleMarkerSelection(value) : null;
      break;
  }
}

export function handleSharedBTMarkersEvent(collabEditedMarker, key) {
  console.log({collabEditedMarker, key});
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
  if (correspondingMarker.mirLabel === collabEditedMarker.metadata.mirLabel) {
    correspondingMarker.el.classList.add('collaboratively-selected-marker');
    updateMarkerDisplayWithColorizedRegions(true); // true so can the marker label gets none pointer events
    return;
  }

  //needed in case chord edit apply event hasn t preceded, i.e. when a user is 'late'
  //not needed in opposite cases, because it s called during chord edit apply event
  //no harm calling it twice though
  disableAnnotationListAndDeleteAnnotation();

  wavesurfer.markers.remove(correspondingMarker);
  const newMarker = addMarkerAtTime(
    collabEditedMarker.time,
    collabEditedMarker.metadata.mirLabel,
    'replaced'
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
    'new'
  );
  disableAnnotationListAndDeleteAnnotation();
  console.log(tooltips);
  tooltips.markersSingleton.disable(); // to be re-enabled in the next function call
  updateMarkerDisplayWithColorizedRegions(true); // true so can the marker label gets none pointer events

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
      'edited'
    );
    tooltips.markersSingleton.disable(); //to be re-enabled in the next function call
    updateMarkerDisplayWithColorizedRegions(true); // true so can the marker label gets none pointer events

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

  if (prevSelection) {
    prevSelection.querySelector('.span-chord-symbol').style.color = '';
    prevSelection.classList.remove('collaboratively-selected-marker');
  }

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

export function handleChordSelection(selection) {
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
  //if annotation list has not yet been created or if new sel=prev sel (user that has changed annotation) dont run
  if (!annotationList.options.length || annotationList.value == selection.value) {
    return;
  }

  //changing the annotation
  annotationList.value = selection.value;
  annotationList.dispatchEvent(new Event('change'));

  //notifying user that annotation has changed
  const notifText = `${selection.selector} has changed the annotation.`;
  const notifContext = 'info';
  notify(notifText, notifContext);
}

export function handleBTFile(key) {
  switch (key) {
    case 'audioExistsInRepo':
      audioExistsInRepo = sharedBTFile.get('audioExistsInRepo');
      // case of changing URL params from export to repo
      if (audioExistsInRepo === 'public' || audioExistsInRepo !== 'course') {
        updateURLParams({ type: audioExistsInRepo });
      }
      break;
    case 'bTrackDATA':
      bTrackDATA = sharedBTFile.get('bTrackDATA');
      break;
    case 'bTrackURL':
      bTrackURL = sharedBTFile.get('bTrackURL');
      break;
  }
}

export function clearSharedMarkersInfo () {
  window.ydoc.transact(() => {
    //delete selected marker
    window.sharedBTEditParams.delete('selectedMarker');
    //restore shared markers object
    wavesurfer.markers.markers.forEach((marker, index) =>
      window.sharedBTMarkers.set(`${index}`, {
        time: marker.time,
        status: 'unedited',
        metadata: {},
      })
    );
  });
}
