'use strict';

// Alex or Dimitri Check the following and modify appropriately

// Read a file
function readSingleFile(e) {
  /** @type {File} */
  var file = e.target.files[0];
  if (!file) {
    return;
  }
  var reader = new FileReader();
  const fileInput = document.getElementById('file-input');
  const fileName = fileInput.value.split(/(\\|\/)/g).pop();
  roomNameInput.value = 'test-room';
  document.getElementById('file_label').innerHTML =
    'Following: "' +
    fileName +
    '".&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Change backing track:';
  document.getElementById('file_name').innerHTML = fileName;
  console.log('Filename = ', document.getElementById('file_name').innerHTML);
  waveform0Container.removeAttribute('hidden');
  timeline0Container.removeAttribute('hidden');
  controls0Container.removeAttribute('hidden');
  stopButton0.removeAttribute('hidden');
  playPauseButton0.removeAttribute('hidden');
  muteButton0.removeAttribute('hidden');
  reader.onload = function (e) {
    var contents = e.target.result;
    console.log({ contents });
    wavesurfer0.loadArrayBuffer(contents);

    if (Collab) {
      shareBackingTrack(file)
        .then(() => {
          console.log(`file ${file.name} was shared with peers`);
          removeFileURLParam();
        })
        .catch(err =>
          console.error(`failed to share file ${file.name} with peers`, err)
        );
    }
    displayContents(contents);
  };
  reader.readAsArrayBuffer(file);
}

function displayContents(contents) {
  var element = document.getElementById('file-content');
  element.textContent = contents;
}

/**
 * @param {File} file
 */
async function shareBackingTrack(file) {
  try {
    const rawData = Array.from(new Int8Array(await file.arrayBuffer()));
    let fileInfo = new Y.Map();

    const chunksArray = new Y.Array();
    window.ydoc?.transact(() => {
      fileInfo.set('name', file.name);
      fileInfo.set('size', file.size);
      fileInfo.set('type', file.type);
      fileInfo.set('data', chunksArray);
      fileInfo.set('sharer', userParam);
      window.playerConfig.set('backingTrack', fileInfo);
      window.playerConfig.delete('backingTrackRepository');
      window.playerConfig.delete('backingTrackRecording');
    });

    // fileInfo.set("data", chunksArray);
    for (let i = 0; i < rawData.length; i += 20000) {
      chunksArray.push(rawData.slice(i, i + 20000));
    }
  } catch (err) {
    console.error(err);
    return Promise.reject(err);
  }
}

function removeFileURLParam() {
  urlParams.delete('f');
  history.pushState({}, '', '?' + urlParams.toString());
}

function setFileURLParam(file) {
  urlParams.set('f', file);
  history.pushState({}, '', '?' + urlParams.toString());
}

// Function to update URL parameters based on an object.
function updateURLParams(paramsObject) {
  for (const key in paramsObject) {
    if (paramsObject.hasOwnProperty(key)) {
      const value = paramsObject[key];
      if (value === '') {
        //(If a value in paramsObject is an empty string (''), it will remove the corresponding parameter)
        urlParams.delete(key);
      } else {
        urlParams.set(key, value);
      }
    }
  }
  history.pushState({}, '', '?' + urlParams.toString());
}

// Load the backing track another peer has loaded on the file picker
function setBackingTrackRemote(fileName, sharer) {
  if (!fileName) {
    console.warn('failed to set backing track from peers');
    return;
  }

  const notifText = `${sharer} has imported ${fileName} from their hard drive as the new backing track.`;
  const notifContext = 'info';
  notify(notifText, notifContext);

  updateFileNameLabels(fileName);
}

function setBackingTrackFileRemote(fileInfo) {
  if (!fileInfo) {
    console.warn('failed to set backing track file data from peers');
    return;
  }

  //construct file object from shared backing track file data
  let file = new File(
    [Int8Array.from(fileInfo.get('data'))],
    fileInfo.get('name'),
    {
      type: fileInfo.get('type'),
    }
  );
  /*let reader = new FileReader();
  reader.onload = e => {
    console.log('loading remote file', e.target.result);
    //load the read Array Buffer into wavesurfer backing track
    backingTrack.loadArrayBuffer(e.target.result);
    removeFileURLParam();
  };
  reader.readAsArrayBuffer(file);
  */

  const annotationFile = createURLJamsFromRepository(file.name, true);
  loadFilesInOrder(file, annotationFile);
}

async function setBackingTrackRepositoryRemote(fileInfo) {
  $('#repository-files-modal').modal('hide');

  const { fileName, privateInfo, repositoryType, sharer, courseId } = fileInfo;

  if (!fileName || fileName.length === 0) {
    console.warn(
      'unknown filename: failed to set repository file shared by peers as backing track'
    );
    return;
  }

  const notifText = `${sharer} has imported ${fileName} from repository as the new backing track.`;
  const notifContext = 'info';
  notify(notifText, notifContext);

  let reqUrl = `https://musicolab.hmu.gr/apprepository/downloadPublicFile.php?f=${fileName}`;
  if (repositoryType === 'private') {
    reqUrl = `https://musicolab.hmu.gr/apprepository/downloadPrivateFile.php?f=${fileName}&user=${privateInfo.name}&u=${privateInfo.id}`;
  } else if (repositoryType === 'course') {
    reqUrl = `https://musicolab.hmu.gr/apprepository/downloadCourseFile.php?course=${courseParam}&courseid=${courseId}&u=${idParam}&f=${fileName}&user=${userParam}`;
  }

  window.resetAudioPlayer();

  const res = await fetch(reqUrl);
  const resClone = await res.clone();

  //animating progress mechanism
  const waveformLoadingBar = document.getElementById('waveform-loading-bar');
  const reader = res.body.getReader();
  const contentLength = +res.headers.get('Content-Length');
  let receivedLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    receivedLength += value.length;
    window.animateProgressBar(
      waveformLoadingBar,
      receivedLength / contentLength
    );
  }

  const blob = await resClone.blob();
  if (blob.type.includes('text/html')) {
    throw new Error(`Failed to fetch audio file: "${fileName}"`);
  }

  // window.backingTrack.loadBlob(blob);
  updateURLParams({ f: fileName, type: repositoryType }); //needed to be called before loadAudioFile. f parameter is used in wavesurfer 'once ready' event inside loadAudioFile
  loadAudioFile(blob, res); // use loadAudioFile instead of simnply loadBlob to avoid various bugs
}

// Load a file from url
function loadUrlFile(fn, c, u) {
  Jitsi_User_Name = u; //TODO. alx. giati xanatithetai edw to Jitsi_User_Name? mipws katalathws? an nai delete line.
  updateFileNameLabels(fn);
  //load remote repository file as backing track
  backingTrack.load(
    `https://musicolab.hmu.gr/apprepository/downloadPublicFile.php?f=${f}`
  );
}

function setBackingTrackRecording({id, sharer, recName}) {
  if (id === undefined || id === null) {
    console.error(
      'tried to set backing track to recording with id %s but it does not exist',
      id
    );
    return;
  }
  //find the recording in the shared object based on its provided id
  let index = -1;
  for (let i = 0; i < window.sharedRecordedBlobs.length; i++) {
    if (window.sharedRecordedBlobs.get(i)?.get('id') === id) {
      index = i;
      break;
    }
  }

  if (index === -1) {
    console.error('could not find track for id: ' + id);
    return;
  }

  const recorderName = window.sharedRecordedBlobs.get(index).get('userName');
  const notifText = `${sharer} has set
   ${
     recorderName == sharer ? 'their recording' : `recording of ${recorderName}`
   }
   as the new backing track.`;
  const notifContext = 'info';
  notify(notifText, notifContext);

  const data = window.sharedRecordedBlobs.get(index).get('data');
  //load it as wavesurfer backing track
  if (data?.length > 1) {
    const float32Array = Float32Array.from(data);
    const blob = recordingToBlob(float32Array);
    const BTUrl = URL.createObjectURL(blob);

    //setting relevant global vars (residing in app.js) to be used in loadAudioFile that s called inside loadFilesInOrder call
    recAsBackingTrack.hasBeenSet = true;
    recAsBackingTrack.recName = recName;


    const annotationFile = createURLJamsFromRepository(recName, true);
    loadFilesInOrder(BTUrl, annotationFile);
  }
}
