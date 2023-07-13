import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { setUserImageUrl, userData } from "./users";
import { awaranessUpdateHandler, stateChangeHandler } from "./awarenessHandlers";
import { handleSharedBTEditParamsEvent, handleSharedBTMarkersEvent, handleSharedRecordingDataEvent, handleSharedRecordingResetEvent } from "./sharedTypesHandlers";

const wsBaseUrl = import.meta.env.DEV ? "ws://localhost:8080" : "wss://musicolab.hmu.gr:9000";

//setting collaboration up section
function setupCollaboration() {
  const ydoc = new Y.Doc();

  const file = urlParams.get("f") ?? "musicolab_default";
  const course = urlParams.get("course") ?? "musicolab_default";
  // const room = `${file}::${course}`;
  const room = course;

  const websocketProvider = new WebsocketProvider(wsBaseUrl, room, ydoc);
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

  const sharedBTMarkers = ydoc.getMap('bTMarkers');
  sharedBTMarkers.observe(e => {
    if (e.transaction.local)  return;
    e.changes.keys.forEach( (value, key) =>{
      if (value.action === 'delete') return;
      const marker = e.target.get(key);
      !(marker.status === 'unedited')
        ? handleSharedBTMarkersEvent(marker, key)
        : null;
    })

  });

  const sharedBTEditParams = ydoc.getMap('bTEdit');
  sharedBTEditParams.observe(e => {
    !e.transaction.local
      ? e.changes.keys.forEach( (value, key) => {
          //console.log (value, key);
          handleSharedBTEditParamsEvent(e.target.get(key), key)
        })
      : null;
  });
  
  window.ydoc = ydoc;
  window.sharedRecordedBlobs = sharedRecordedBlobs;
  window.deletedSharedRecordedBlobIds = deletedSharedRecordedBlobIds;
  window.playerConfig = playerConfig;
  window.sharedBTEditParams = sharedBTEditParams;
  window.sharedBTMarkers = sharedBTMarkers
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