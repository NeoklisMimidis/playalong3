// Created wavesurfer instance from audio-player.js
import { wavesurfer } from '../audio-player.js';
import {
  addMarkerAtTime,
  updateMarkerDisplayWithColorizedRegions,
} from '../audio-player/render-annotations.js';

import { tooltips } from '../components/tooltips.js';

import {
  enableEditChordButtonFunction,
  disableEditChordButtonFunction,
} from './right-toolbar-tools.js';

import {
  disableAnnotationListAndDeleteAnnotation,
  toolbarStates,
} from '../annotation-tools.js';

import { EDITED_MARKER_STYLE } from '../config.js';

import { renderModalMessage } from '../components/utilities.js';

// - Annotation tools (waveform)

/**
 *  {waveform double click} Add beat at position (AND chord SAME as previous chord)
 */
export function setupAddBeatAndChordEvent() {
  //
  wavesurfer.on('region-dblclick', (region, event) => {
    if (region.id === 'loop-region') return;
    ////collably transmitting marker addition event
    if (toolbarStates.EDIT_MODE && !wavesurfer.isPlaying() && !!Collab) {
      window.sharedBTMarkers.set(`${window.sharedBTMarkers.size}`, {
        time: wavesurfer.getCurrentTime(),
        status: 'added',
        metadata: { mirLabel: region.data['mirex_chord'] },
      });
    }

    addBeatAndChord(region, event);
  });
}

/**
 *  {waveform marker drag} Modify beat timing
 */
export function setupEditBeatTimingEvents() {
  wavesurfer.on('marker-drag', function (marker, e) {
    //collably transmitting marker drag event
    if (!wavesurfer.isPlaying() && !!Collab) {
      window.sharedBTMarkers.forEach((m, k, thisMap) => {
        if (m.time === marker.time) {
          //find shared marker that corresponds to event marker
          //update shared marker as marked for moving
          const newStatus =
            m.status.includes('moved') || m.status == 'unedited'
              ? m.status.replace(/unedited|moved/, 'to be moved')
              : m.status.concat(', to be moved');
          const newMetadata = m.metadata;
          !newMetadata.originalTime
            ? (newMetadata.originalTime = marker.time)
            : null;
          newMetadata.timeOfMarkerToBeRemoved = marker.time;
          thisMap.set(`${k}`, {
            time: marker.time,
            status: newStatus,
            metadata: newMetadata,
          });
        }
      });
    }

    editBeat(marker, e);
  }); // used for styling

  wavesurfer.on('marker-drop', marker => {
    //collably transmitting marker addition event
    if (!wavesurfer.isPlaying() && !!Collab) {
      window.sharedBTMarkers.forEach((m, k, thisMap) => {
        if (m.status.includes('to be moved')) {
          //find shared marker that has been marked during drag event
          //update shared marker with correct status and metadata
          const newStatus = m.status.replace('to be moved', 'moved');
          const newMetadata = m.metadata;
          thisMap.set(`${k}`, {
            time: marker.time,
            status: newStatus,
            metadata: newMetadata,
          });
        }
      });
    }
    editBeatTiming(marker);
  }); // changes the beat
}

/**
 *  {waveform marker right click} Remove marker (== remove chord AND beat at position)
 */
export function setupRemoveBeatAndChordEvent() {
  wavesurfer.on('marker-contextmenu', removeBeatAndChord);
}

// - Functions for editing annotation with waveform interaction events
function addBeatAndChord(region, e) {
  console.log(`Region start: ${region.start} || Region end:${region.end}
    Current time: ${wavesurfer.getCurrentTime()}`);

  // Only add markers in the case where edit mode is activated and audio is not playing
  if (!toolbarStates.EDIT_MODE || wavesurfer.isPlaying()) return;

  disableAnnotationListAndDeleteAnnotation();

  const startingBeatChord = region.data['mirex_chord']; // get the chord assigned
  const currentTimePosition = wavesurfer.getCurrentTime();

  addMarkerAtTime(currentTimePosition, startingBeatChord);

  updateMarkerDisplayWithColorizedRegions();
}

function editBeat(marker) {
  if (marker.time === 0) return;
  console.log('dragged!!!', marker);

  wavesurfer.disableDragSelection();

  // disable tooltips to avoid some bugs
  tooltips.markersSingleton.disable();

  enableEditChordButtonFunction(marker);

  disableAnnotationListAndDeleteAnnotation();

  // add color to edited marker line
  const markerLine = marker.elLine;
  wavesurfer.util.style(markerLine, EDITED_MARKER_STYLE);
}

function editBeatTiming(marker) {
  console.log('dropped!!!');

  const markerTime = marker.time;
  const markerLabel = marker.mirLabel;
  wavesurfer.markers.remove(marker);

  const editedMarker = addMarkerAtTime(markerTime, markerLabel, 'edited');

  enableEditChordButtonFunction(editedMarker);

  updateMarkerDisplayWithColorizedRegions();
}

function removeBeatAndChord(marker) {
  // do nothing on the first marker
  if (marker.time === 0) return;
  console.log('remove??', marker);

  enableEditChordButtonFunction(marker);

  // disable tooltips to avoid some bugs
  tooltips.markersSingleton.disable();

  const markerTime = marker.time;
  const roundedMarkerTime = Math.round(markerTime * 100) / 100;

  const message = `You are about to delete the marker at <span class="text-warning">${roundedMarkerTime}</span> seconds<br>with label <span class="text-primary">${marker.label}</span>❗<br><br><span class="text-info">Are you sure?</span> 🤷‍♂️`;

  renderModalMessage(message)
    .then(() => {
      // User confirmed deletion
      disableEditChordButtonFunction(); //diselect marker

      wavesurfer.markers.remove(marker);
      disableAnnotationListAndDeleteAnnotation();

      updateMarkerDisplayWithColorizedRegions();

      //collably transmitting marker deletion event
      if (!wavesurfer.isPlaying() && !!Collab) {
        window.sharedBTMarkers.forEach((m, k, thisMap) => {
          if (m.time === marker.time)
            //find shared marker and update it as deleted
            thisMap.set(`${k}`, {
              time: marker.time,
              status: 'deleted',
              metadata: '',
            });
        });
      }
    })
    .catch(() => {
      // User canceled deletion
      // enable tooltips here (don't need to call updateMarkerDisplayWithColorizedRegions which also enables them -- avoid unnecessary calculations)
      tooltips.markersSingleton.enable();
    });
}
