import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { renderUserList } from "./userList.js";
import { zoomIn, zoomOut } from "../../audio-player/player-controls.js";
import { audioSidebarText, mainWaveform, toolbar, wavesurfer } from "../../audio-player.js";
import { updateMarkerDisplayWithColorizedRegions } from "../../audio-player/render-annotations.js";
import { COLLAB_CHORD_SELECTION_TIPPY_PROPS, tooltips } from "../../components/tooltips.js";
import { annotationList, chordEditor, toggleEditBtn, toolbarStates } from "../../annotation-tools.js";
import { _colorizeTableSelections, closeModal, editChord, showChordEditor } from "../../annotation-tools/right-toolbar-tools.js";
import tippy from "tippy.js";
import { MARKER_LABEL_SPAN_COLOR } from "../../config.js";

let wsBaseUrl;
if (window.location.hostname === "localhost") {
  wsBaseUrl = "ws://localhost:8080";
} else if (window.location.hostname === "musicolab.hmu.gr") {
  wsBaseUrl = "wss://musicolab.hmu.gr:8080";
}

let websocketProvider;

//configuring userData section
const colors = [
  "#30bced",
  "#6eeb83",
  "#ffbc42",
  "#ecd444",
  "#ee6352",
  "#9ac2c9",
  "#8acb88",
  "#1be7ff",
];

const oneOf = (array) => array[Math.floor(Math.random() * array.length)];

function setUserImageUrl(id = idParam) {
  const path = id
    ? `moodle/user/pix.php/${id}/f1.jpg`
    : "apprepository/playalong-collab/defaultUser.svg";
  return new URL(path, `https://musicolab.hmu.gr`).toString();
}

const userData = {
  name: userParam,
  id: idParam,
  color: oneOf(colors),
  imageSrc: setUserImageUrl(),
};

//setting collaboration up section
function setupCollaboration() {
  const ydoc = new Y.Doc();

  const file = urlParams.get("f") ?? "musicolab_default";
  const course = urlParams.get("course") ?? "musicolab_default";
  // const room = `${file}::${course}`;
  const room = course;

  websocketProvider = new WebsocketProvider(wsBaseUrl, room, ydoc);
  websocketProvider.on("status", (event) => {
    console.log(event.status);
    if (event.status === "connected") {
      document.title = document.title.replace("🔴", "🟢");
    } else if (event.status === "disconnected") {
      document.title = document.title.replace("🟢", "🔴");
    }
  });

  websocketProvider.on("synced", () => {
    // Show hidden buttons if shared recorded blobs exist
    if (sharedRecordedBlobs.length > 0) {
      window.showHiddenButtons();
    }
  });

  const permanentUserData = new Y.PermanentUserData(ydoc);
  permanentUserData.setUserMapping(
    ydoc,
    ydoc.clientID,
    `user=${userData.name} id=${userData.id}`
  );

  websocketProvider.awareness.setLocalStateField("user", userData);
  websocketProvider.awareness.on("update", awaranessUpdateHandler);
  websocketProvider.awareness.on("change", stateChangeHandler);

  window.websocketProvider = websocketProvider;
  window.awareness = websocketProvider.awareness;
  window.permanentUserData = permanentUserData;

  const sharedRecordedBlobs = ydoc.getArray("blobs");
  sharedRecordedBlobs.observe((event) => {
    for (let i = 0; i < event.changes.delta.length; i++) {
      let delta = event.changes.delta[i];
      if (Array.isArray(delta.insert)) {
        for (let map of delta.insert) {
          let insert = map instanceof Y.Map ? map.toJSON() : map;
          const recUserData = {
            name: insert.userName,
            id: insert.userId,
            imageSrc: setUserImageUrl(insert.userId)
          };
          if (
            map.has("data") &&
            (map.get("data").length / insert.total) * 100 === 100.0
          ) {
            // Turn JS array into Float32Array
            const f32Array = Float32Array.from(map.get("data"));
            const blob = window.recordingToBlob(f32Array, insert.sampleRate);
            if (!event.transaction.local) {
              window.recordedBuffers.push([f32Array]);
            }
            window.createDownloadLink(
              blob,
              insert.id,
              recUserData,
              insert.speed,
              insert.set_pitch
            );
          } else {
            window.fillRecordingTemplate(
              insert.id,
              recUserData,
              insert.speed,
              insert.set_pitch
            );
          }
        }
      }
    }
  });

  sharedRecordedBlobs.observeDeep((events) => {
    for (let event of events) {
      if (event.target === sharedRecordedBlobs) {
        // Ignore events on sharedRecordedBlobs itself
        continue;
      }

      if (event.target instanceof Y.Array) {
        handleSharedRecordingDataEvent(event);
      } else if (event instanceof Y.YMapEvent) {
        handleSharedRecordingResetEvent(event);
      }
    }
  });

  const deletedSharedRecordedBlobIds = ydoc.getArray("deletedIds");
  deletedSharedRecordedBlobIds.observe((event) => {
    for (let i = 0; i < deletedSharedRecordedBlobIds.length; i++) {
      let id = deletedSharedRecordedBlobIds.get(i);
      if (!event.transaction.local) {
        document
          .querySelector(`.hidden-delete-btn[data-collab-id="${id}"]`)
          ?.click();
      }
    }
  });

  // Configuration variables for the playback player
  // e.g. shared playback speed amongst collaborators
  const playerConfig = ydoc.getMap("playerConfig");
  playerConfig.observe((event) => {
    console.group("playerConfig event");
    console.log(playerConfig.toJSON(), event.keysChanged);
    for (let key of event.keysChanged) {
      const value = playerConfig.get(key);
      console.log({ key, value });
      if (!event.transaction.local) {
        switch (key) {
          case "playbackSpeed":
            window.setSpeedRemote(value);
            break;
          case "tempoValue":
            window.setTempoValueRemote(value);
            break;
          case "numerator":
            window.setNumeratorRemote(value);
            break;
          case "denominator":
            window.setDenominatorRemote(value);
            break;
          case "backingTrack":
            {
              window.setBackingTrackRemote(value.get("name"));
              const downloadProgress =
                (value.get("data").length / value.get("size")) * 100;
              if (downloadProgress === 100.0) {
                window.setBackingTrackFileRemote(value);
                updateProgressBar(0, "#progressBar0");
              }
            }
            break;
          case "backingTrackRepository":
            window.setBackingTrackRepositoryRemote(value);
            break;
          default:
            console.warn("unsupported configuration variable: ", key);
        }
      }
    }
    console.groupEnd();
  });

  playerConfig.observeDeep((events) => {
    for (let event of events) {
      if (event.target === playerConfig) {
        continue;
      }

      if (event.target instanceof Y.Array) {
        const array = event.target;
        const backingTrack = array.parent;

        const downloadProgress =
          (backingTrack.get("data").length / backingTrack.get("size")) * 100;
        console.log({ backingTrackProgress: downloadProgress });

        const progressBar = updateProgressBar(
          downloadProgress,
          "#progressBar0"
        );
        progressBar.parentElement.style.opacity = 1;

        if (downloadProgress === 100.0) {
          window.setBackingTrackFileRemote(backingTrack);
          progressBar.parentElement.style.opacity = 0;
          updateProgressBar(0, "#progressBar0");
        }
      }
    }
  });

  const sharedBTEditParams = ydoc.getMap('bTEdit');


  //sharedBTEditParams.set('bTmarkers', new Y.Array());

  sharedBTEditParams.observeDeep(eventArray => {
    eventArray
      .forEach(e => {
        !e.transaction.local
          ? e.changes.keys.forEach( (value, key) => {
              //console.log (value, key);
              handleSharedBTEditParamsEvent(e.target.get(key), key, ) })
          : null
      }

      );
  });

  window.ydoc = ydoc;
  window.sharedRecordedBlobs = sharedRecordedBlobs;
  window.deletedSharedRecordedBlobIds = deletedSharedRecordedBlobIds;
  window.playerConfig = playerConfig;
  window.sharedBTEditParams = sharedBTEditParams;
  window.Y = Y;

  window.debugSharedRecordings = function (mode = "table") {
    const json = sharedRecordedBlobs.map((recording) => recording.toJSON());
    if (mode === "table") {
      console.table(json);
    } else {
      console.log(json);
    }
  };
}

if (!!window.Collab) {
  setupCollaboration();
}

/**
 * @param event {Y.YArrayEvent}
 */
function handleSharedBTEditParamsEvent (value, key) {
  //console.log({key, value});
  switch(key) {
    case 'annotationSel': handleAnnotationSelection(value);
      break;
    case 'bTmarkers': 
      break;
    case 'chordSel': handleChordSelection(value);
      break;   
    case 'selectedMarker': handleMarkerSelection(value);
      break;
  }
}

function handleMarkerSelection (selectedMarkerTime) {
  //decolorizing-resetting prev selection
  const prevSelection = mainWaveform
    .querySelector('.collaboratively-selected-marker');
  prevSelection
    ? prevSelection
        .querySelector('.span-chord-symbol')
        .style.color = ''
    : null;
  //centering waveform view at selected marker time
  const progress = selectedMarkerTime / wavesurfer.getDuration();
  wavesurfer.seekAndCenter(progress);
  //selecting new one
  const markerSelected = wavesurfer.markers.markers
    .find(marker => marker.time === selectedMarkerTime);
  markerSelected.el
    .classList
    .add('collaboratively-selected-marker')
  markerSelected.elChordSymbolSpan
    .style.color = MARKER_LABEL_SPAN_COLOR;
}

function handleChordSelection (selection) {
  //removing all previous selector popovers
  chordEditor
    .querySelectorAll(`.collaboratively-selected`)
    .forEach(prevSel => {
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

function handleAnnotationSelection (selection) {
  //if annotation list has not yet been created or if new sel=prev sel dont run
  if (!annotationList.options.length || annotationList.value == selection.value)  return;

  //changing the annotation
  annotationList.value = selection.value;
  annotationList.dispatchEvent(
    new Event('change')
  );

  //notifying user that annotaion has changed
  const notifText = `${selection.selector} has changed the annotation.`;
  const notifContext = 'info';
  notify(notifText, notifContext);
}

/**
 * @param event {Y.YArrayEvent}
 */
function handleSharedRecordingDataEvent(event) {
  const array = event.target;
  const parentMap = array.parent;
  const downloadProgress = (array.length / parentMap.get("total")) * 100;
  console.log("current progress", downloadProgress);
  const count = parentMap.get("count");

  const progressBar = updateProgressBar(
    downloadProgress,
    `#progressBar${count}`
  );

  if (downloadProgress === 100.0) {
    const f32Array = Float32Array.from(array.toArray());
    const blob = window.recordingToBlob(f32Array, parentMap.get("sampleRate"));
    let url = window.URL.createObjectURL(blob);
    let wavesurfer = window.wavesurfers.find(
      (wavesurfer) => +wavesurfer.container.id.match(/\d+/)[0] === count
    );
    wavesurfer?.load(url);

    progressBar?.parentElement.remove();
    window.addBlobUrlToDownload(url, count);

    if (!event.transaction.local) {
      window.recordedBuffers.push([f32Array]);
    }
  }
}

/**
 * @param event {Y.YMapEvent}
 */
function handleSharedRecordingResetEvent(event) {
  const ymap = event.target;
  for (let key of event.keysChanged) {
    if (key === "data" && event.keysChanged.size === 1) {
      let indexToUpdate = -1;
      for (let i = 0; i < sharedRecordedBlobs.length; i++) {
        if (sharedRecordedBlobs.get(i).get("id") === ymap.get("id")) {
          indexToUpdate = i;
          break;
        }
      }
      console.log(
        "handleSharedRecordingMetaEvent indexToUpdate",
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


//to be moved to another file
function stateChangeHandler(changes) {
  const awStates = Array.from(
    websocketProvider.awareness.getStates().entries()
  );
  const myClientId = websocketProvider.awareness.clientID;
    console.log({awStates, myClientId});
  
  actOnRecordStateUpdate(awStates, myClientId);
  actOnBTrackEditStateUpdate(awStates, myClientId);
  actOnChordEditStateUpdate(awStates, myClientId);
}

function awaranessUpdateHandler() {
  const { connectedUsers, disconnectedUsers } = formatUserList();

  updateWaveformAwareness(connectedUsers);
  renderUserList([...connectedUsers, ...disconnectedUsers]);
}

function actOnChordEditStateUpdate (awStates, myClientId) {
  const chordEditStateUpdates = awStates
    .filter( ([, state]) => state.chordEdit )
    .map( ([id, state]) => {return [id, state.chordEdit, state.user]} );
  if (!chordEditStateUpdates.length)   return;

  chordEditStateUpdates.forEach( ( [editorClientId, chordEditState, editorData] ) => {
    const myStateUpdating = (editorClientId === myClientId);

    switch (chordEditState.status) {
      case 'started': actOnChordEditStarted(myStateUpdating, chordEditState.selection, editorData) 
      break;
      case 'completed': actOnChordEditCompleted(myStateUpdating, chordEditState)
      break;
    }
  });
}

function actOnChordEditStarted (me, selection, editorData) {
  if (me) return;

  showChordEditor(selection);
}

function actOnChordEditCompleted (me, editState) {
  if (me) {
    setTimeout(
      () => window.awareness.setLocalStateField('chordEdit', null),
      200);
    return;
  } else {
    chordEditor
      .querySelectorAll(`.collaboratively-selected`)
      .forEach(prevSel => {
        prevSel._tippy.destroy();
        prevSel.classList.remove(`collaboratively-selected`);
    });

    switch(editState.completingAction) {
      case 'canceled': null;
        break;
      case 'applied': {
        editChord(false, editState.chordSelection);
        toolbar.classList.add('editing-on');
      }
        break;
    }

    closeModal();
  }
}

function actOnBTrackEditStateUpdate (awStates, myClientId) {
  const bTrackEditStateUpdates = awStates
    .filter( ([, state]) => state.bTrackEdit )
    .map( ([id, state]) => {return [id, state.bTrackEdit, state.user]} );

  const chordEditStateUpdates = awStates
  .filter( ([, state]) => state.chordEdit )

  if (!bTrackEditStateUpdates.length)   return;

  bTrackEditStateUpdates.forEach( ( [editorClientId, editState, editorData] ) => {
    const myStateUpdating = (editorClientId === myClientId);

    switch (editState.status) {
      case 'editInitiated': actOnBTrackEditInitiated(myStateUpdating, editorData, editState.editTime) 
        break;
      case 'editCompleted': actOnBTrackEditCompleted(myStateUpdating, editorData, editState.editTime)
        break;
      case 'editOnProgress' : null;
        break;
    }
  });
}

function actOnBTrackEditInitiated (me, editorData, editTime) {
  bTeditor = editorData.name;

  if (me) return;

  toolbarStates.COLLAB_EDIT_MODE = true;

  modifyChordFinderUI(true, editorData, editTime);
  //notification
  const notifText = `${editorData.name} is editing the backing track. You can't edit at the same time.`;
  const notifContext = 'info';
  notify(notifText, notifContext);
}

function actOnBTrackEditCompleted (me, editorData, editTime) {
  bTeditor = null;

  if (me) {
    setTimeout(
      () => window.awareness.setLocalStateField('bTrackEdit', null),
      200);
    return;
  }

  toolbarStates.COLLAB_EDIT_MODE = false;
  
  modifyChordFinderUI(false, editorData, editTime);
  //notification
  const notifText = `${editorData.name} has stopped editing the backing track. You can now edit at will.`;
  const notifContext = 'info';
  notify(notifText, notifContext);
}

function modifyChordFinderUI(collabEditModeOn, editorData, editTime) {
  collabEditModeOn ? zoomIn() : zoomOut();

  if (editTime === wavesurfer.getDuration()) {
    wavesurfer.seekTo(0);
  } else {
    const progress = editTime / wavesurfer.getDuration();
    wavesurfer.seekAndCenter(progress);
  }

  updateMarkerDisplayWithColorizedRegions(collabEditModeOn);
  collabEditModeOn 
    ? tooltips.regions[0].disable()
    : tooltips.regions[0].enable();

  //toolbars UI
  const centerToolbar = document.getElementById('center-toolbar-controls');
  if (collabEditModeOn) {
    toolbar.classList.remove('editing-on');
    toolbar.style.backgroundColor = editorData.color;


    [...centerToolbar.children].forEach(child => child.setAttribute('hidden', true));
    const infoSpan = document.createElement('span');
    infoSpan.innerText = `${editorData.name} is editing!`;
    centerToolbar.appendChild(infoSpan);
  } else {
    toolbar.removeAttribute('style');
    
    centerToolbar.removeChild(
      centerToolbar.querySelector('span')
    );
    [...centerToolbar.children].forEach(child => child.removeAttribute('hidden'));
  }
  audioSidebarText.classList.toggle('buttons-inactive'); 
}

function actOnRecordStateUpdate (awStates, myClientId) {
  const recordStateUpdates = awStates
    .filter( ( [, state] )=> state.record)
    .map( ( [id, state] ) => {return [id, state.record]} );
  if (!recordStateUpdates.length)   return;

  recordStateUpdates.forEach( ( [changeClientId, rState] ) => {
    const myStateUpdating = (changeClientId === myClientId);
    const recUserData = {
      name: rState.recUserData.name,
      id: rState.recUserData.id,
      imageSrc: setUserImageUrl(rState.recUserData.id)
    };

    switch (rState.status) {
      case 'start': actOnStartRecording(myStateUpdating, recUserData) 
      break;
      case 'stop': actOnStopRecording(myStateUpdating, recUserData.name)
      break;
    }
  });
}

function actOnStartRecording(me, recUserData) {
  recordButton.classList.add("flash");

  createRecordingTemplate(recUserData);

  if (!me) {
    otherUserRecording = true;

    const notifText = `${recUserData.name} is recording. You can't record at the same time.`;
    const notifContext = 'info';
    notify(notifText, notifContext);
  }
}

function actOnStopRecording(me, userName) {
  recordButton.classList.remove('flash');
  document
    .getElementById(`scrollContainer${count}`)
    .previousElementSibling
    .classList.remove('flash');

  if (me) {
    setTimeout(
      () => window.awareness.setLocalStateField('record', null),
      100);  
  } else {    
    otherUserRecording = false;

    const notifText = `${userName} has stopped recording.`;
    const notifContext = 'info';
    notify(notifText, notifContext);
  }
}

function formatUserList() {
  const awStates = websocketProvider.awareness.getStates();
  let connectedUsers = [...awStates.entries()].map(
    (e) => (e = `user=${e[1].user.name} id=${e[1].user.id}`)
  );

  let disconnectedUsers = [...window.permanentUserData.clients.values()].filter(
    (entry) => !connectedUsers.includes(entry)
  );

  connectedUsers = [...new Set(connectedUsers)]
    .map((entry) => entry.concat(" status=online"))
    .map((entry) => {
      const data = entry.match(
        /user=(?<name>.+?) id=(?<id>\d+) status=(?<status>\w+)/
      ).groups;
      return data;
    });
  connectedUsers.forEach((user) => (user.imageSrc = setUserImageUrl(user.id)));

  disconnectedUsers = [...new Set(disconnectedUsers)]
    .map((entry) => entry.concat(" status=offline"))
    .map((entry) => {
      const data = entry.match(
        /user=(?<name>.+?) id=(?<id>\d+) status=(?<status>\w+)/
      ).groups;
      return data;
    });
  disconnectedUsers.forEach(
    (user) => (user.imageSrc = setUserImageUrl(user.id))
  );

  return { connectedUsers, disconnectedUsers };
}

function updateWaveformAwareness(connected) {
  const connectedNames = connected.map((user) => user.name);
  const wfImages = [...document.querySelectorAll(".waveform-awareness")];
  wfImages.forEach((img) => {
    if (connectedNames.includes(img.title)) {
      img.classList.remove("recUser-offline");
      img.classList.add("recUser-online");
    } else {
      img.classList.remove("recUser-online");
      img.classList.add("recUser-offline");
    }
  });
}
