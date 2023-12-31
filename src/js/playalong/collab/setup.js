import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { setUserImageUrl, userData } from './users';
import {
  awaranessUpdateHandler,
  lateUser,
  stateChangeHandler,
} from './awarenessHandlers';
import {
  handleSharedBTEditParamsEvent,
  handleSharedBTMarkersEvent,
  handleSharedRecordingDataEvent,
  handleSharedRecordingResetEvent,
  handleBTFile,
} from './sharedTypesHandlers';
import {
  URLParamFileLoaded,
  animateProgressBar,
  loadURLParamFileAsBT,
  waveformLoadingBar,
} from '../../audio-player';
import { bTMarkersReady } from '../../audio-player/render-annotations';

const wsBaseUrl = import.meta.env.DEV
  ? 'ws://localhost:8080'
  : 'wss://musicolab.hmu.gr:9000';

//setting collaboration up section
function setupCollaboration() {
  const ydoc = new Y.Doc();
  
  const file = urlParams.get('f')
  const lesson = urlParams.get('lesson')
  const course = urlParams.get('course');
  
  let room;

  if (course && lesson) 
    room = `${lesson}::${course}`;
  else
    room = file ?? 'musicolab_default'

 
  const websocketProvider = new WebsocketProvider(wsBaseUrl, room, ydoc, {
    params: { pathname: window.location.pathname },
  });
  websocketProvider.on('status', event => {
    console.log(event.status);
    if (event.status === 'connected') {
      document.title = document.title.replace('🔴', '🟢');
    } else if (event.status === 'disconnected') {
      document.title = document.title.replace('🟢', '🔴');
    }
  });

  websocketProvider.on('synced', () => {
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

  window.websocketProvider = websocketProvider;
  window.awareness = websocketProvider.awareness;
  window.permanentUserData = permanentUserData;

  websocketProvider.awareness.on('update', (changes) => awaranessUpdateHandler(changes));
  websocketProvider.awareness.on('change', (changes) => stateChangeHandler(changes));

  const sharedRecordedBlobs = ydoc.getArray('blobs');
  //sharedRecBlobs (Y.array) has --> ymap recordings have --> metadata (id, name, recid, speed, pitch, sample rate, count) keys
  //and data key (Y.array)
  sharedRecordedBlobs.observe(event => {
    for (let i = 0; i < event.changes.delta.length; i++) {
      let delta = event.changes.delta[i];
      if (Array.isArray(delta.insert)) {
        for (let map of delta.insert) {
          //3 user cases. recorder, collaborators, late collaborators
          let insert = map instanceof Y.Map ? map.toJSON() : map;
          console.log(insert);
          const recUserData = {
            name: insert.userName,
            id: insert.userId,
            imageSrc: setUserImageUrl(insert.userId),
          };
          if (
            //case:late collaborator, i.e. user that was not present when recording was initially shared. rec template constructed
            //with createRecordingTrack
            //TODO: alx. sometimes late collaborator is mistakenly referred to else events. that causes error. Update: that happens...
            //  a. because when the late user is connected, the observer is called sometimes with ratio of downloaded/total<1
            //    FillRecordingTemplate is then called but normally returns without completing any action
            //    In the final call ratio=1, so late user is referred to else and recording template is constructed as it should
            //  b. when shared recording has been deleted. In that case length=1 (zeroed entry) and total>1
            map.has('data') &&
            (map.get('data').length / insert.total) * 100 === 100.0
          ) {
            // Turn JS array into Float32Array
            const f32Array = Float32Array.from(map.get('data'));
            const blob = window.recordingToBlob(f32Array, insert.sampleRate);
            if (!event.transaction.local) {
              window.recordedBuffers.push([f32Array]);
              window.recordedBlobs.push(blob);
            }
            console.log(`creating rec no ${count}`);
            window.createRecordingTrack(
              blob,
              insert.id,
              recUserData,
              insert.speed,
              insert.set_pitch
            );
          } else {
            //case: recorder and collaborators. recording template constructed with fillRecordingTemplate.
            //in this case map.data doesn t exist, because observer was triggered by map solely aparted by recording metadata.
            //events needed for transmission of recording data are triggered by sharedRecordingBlobs deep observer
            window.fillRecordingTemplate(
              insert.id,
              recUserData,
              insert.speed,
              insert.set_pitch
            );
          }
        }
        // if(lateUser.entersDuringRec)
        //   lateUser.hasReceivedSessionRecs = true;
      }
    }
  });

  sharedRecordedBlobs.observeDeep(events => {
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

  const deletedSharedRecordedBlobIds = ydoc.getArray('deletedIds');
  deletedSharedRecordedBlobIds.observe(event => {
    for (let i = 0; i < deletedSharedRecordedBlobIds.length; i++) {
      let id = deletedSharedRecordedBlobIds.get(i);
      if (!event.transaction.local) {
        document
          .querySelector(`.hidden-delete-btn[data-collab-id="${id}"]`)
          ?.click();
      }
    }
  });

  const tempoElem = document.querySelector('#bpmInput .box');
  const numerator = document.getElementById('TSNumerator');
  const denominator = document.getElementById('TSDenominator');
  // Set metronome values on collaboration mode
  function setTempoValueRemote(tempo) {
    parent.metronome.setTempo(tempo);
    tempoElem.textContent = tempo;
  }

  function setNumeratorRemote(v) {
    parent.metronome.setNumerator(v);
    numerator.value = v;

    createModalPreCount();
  }
  function setDenominatorRemote(v) {
    parent.metronome.setDenominator(v);
    denominator.value = v;

    createModalPreCount();
  }

  // Configuration variables for the playback player
  // e.g. shared playback speed amongst collaborators
  const playerConfig = ydoc.getMap('playerConfig');
  playerConfig.observe(event => {
    console.group('playerConfig event');
    console.log(playerConfig.toJSON(), event.keysChanged);

    //helpful in case of late user. late enters, playerConfig observer runs for the first time
    if (!event.transaction.local) {
      const BTKeyIncluded =
        playerConfig.has('backingTrack') ||
        playerConfig.has('backingTrackRepository') ||
        playerConfig.has('backingTrackRecording');

      if (!BTKeyIncluded && !URLParamFileLoaded) {
        loadURLParamFileAsBT();
      }
    }

    for (let key of event.keysChanged) {
      const value = playerConfig.get(key);
      console.log({ key, value });

      if (value === undefined) continue;

      if (!event.transaction.local) {
        switch (key) {
          case 'playbackSpeed':
            window.setSpeedRemote(value);
            break;
          case 'tempoValue':
            setTempoValueRemote(value);
            break;
          case 'numerator':
            setNumeratorRemote(value);
            break;
          case 'denominator':
            setDenominatorRemote(value);
            break;
          case 'backingTrack':
            {
              //setting backing track file name shown on UI
              window.setBackingTrackRemote(
                value.get('name'),
                value.get('sharer')
              );
              const downloadProgress =
                (value.get('data').length / value.get('size')) * 100;
              if (downloadProgress === 100.0) {
                //when done fetching file from the user that first loaded it, set it as backing track
                window.setBackingTrackFileRemote(value);
                updateProgressBar(0, '#progressBar0');
              }
            }
            break;
          case 'backingTrackRepository':
            window.setBackingTrackRepositoryRemote(value);
            break;
          case 'backingTrackRecording':
            window.setBackingTrackRecording(value);
            break;
          default:
            console.warn('unsupported configuration variable: ', key);
        }
      }
    }
    console.groupEnd();
  });

  playerConfig.observeDeep(events => {
    for (let event of events) {
      if (event.target === playerConfig) {
        continue;
      }

      if (event.target instanceof Y.Array) {
        const array = event.target;
        const backingTrack = array.parent;

        const downloadProgress =
          (backingTrack.get('data').length / backingTrack.get('size')) * 100;
        console.log({ backingTrackProgress: downloadProgress });

        animateProgressBar(waveformLoadingBar, downloadProgress);

        if (downloadProgress === 100.0) {
          window.setBackingTrackFileRemote(backingTrack);
        }
      }
    }
  });

  const sharedBTMarkers = ydoc.getMap('bTMarkers');
  sharedBTMarkers.observe(e => {
    if (e.transaction.local) return;
    //in case of late (i.e. after or during BT edit) user that hasn t yet (loaded BT --> got JAMS file -->) rendered markers...
    //...set shared markers handling to occur in 7.5 seconds
    if (!bTMarkersReady) {
      setTimeout(() => {
        e.changes.keys.forEach((value, key) => {
          const marker = e.target.get(key);
          !(marker.status === 'unedited')
            ? handleSharedBTMarkersEvent(marker, key)
            : null;
        });
      }, 7500);
    } else {
      e.changes.keys.forEach((value, key) => {
        if (value.action === 'delete') return;
        const marker = e.target.get(key);
        !(marker.status === 'unedited')
          ? handleSharedBTMarkersEvent(marker, key)
          : null;
      });
    }
  });

  const sharedBTEditParams = ydoc.getMap('bTEdit');
  sharedBTEditParams.observe((e, t) => {
    !e.transaction.local
      ? e.changes.keys.forEach((value, key) => {
          console.log (value, key, t);
          handleSharedBTEditParamsEvent(e.target.get(key), key);
        })
      : null;
  });

  const sharedBTFile = ydoc.getMap('bTFile');
  sharedBTFile.observe(e => {
    !e.transaction.local
      ? e.changes.keys.forEach((value, key) => {
          // console.log(value, key);

          handleBTFile(key);
        })
      : null;
  });

  const sharedRecReception = ydoc.getMap('recTransmitted');

  // ydoc.on('update', (_update, _origin, _doc, tr) => {
  //   // Look for buffers that are no longer used and free them
  //   for (let [key, _] of tr.changed) {
  //     if (key === deletedSharedRecordedBlobIds || key === playerConfig) {
  //       const backingTrackId = playerConfig.get('backingTrackRecordingId');
  //       for (let recording of sharedRecordedBlobs) {
  //         for (let deletedId of deletedSharedRecordedBlobIds) {
  //           if (backingTrackId !== deletedId && recording.get('id') === deletedId) {
  //             recording.set('data', [0]);
  //             console.log(`Freed buffer for recording with id: ${deletedId}`);
  //           }
  //         }
  //       }
  //     }
  //   }
  // });

  window.ydoc = ydoc;
  window.sharedRecordedBlobs = sharedRecordedBlobs;
  window.deletedSharedRecordedBlobIds = deletedSharedRecordedBlobIds;
  window.playerConfig = playerConfig;
  window.sharedBTEditParams = sharedBTEditParams;
  window.sharedBTMarkers = sharedBTMarkers;
  window.sharedBTFile = sharedBTFile;
  window.sharedRecReception = sharedRecReception;
  // window.sharedRecTransmissionParams = sharedRecTransmissionParams
  window.Y = Y;

  window.debugSharedRecordings = function (mode = 'table') {
    const json = sharedRecordedBlobs.map(recording => recording.toJSON());
    if (mode === 'table') {
      console.table(json);
    } else {
      console.log(json);
    }
  };
  websocketProvider.awareness.setLocalStateField('user', userData);
}

if (!!window.Collab) {
  setupCollaboration();
}
