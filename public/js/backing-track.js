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
      fileInfo.set('type', file.name);
      fileInfo.set('data', chunksArray);
      window.playerConfig.set('backingTrack', fileInfo);
      window.playerConfig.delete('backingTrackRepository');
    });

    // fileInfo.set("data", chunksArray);
    for (let i = 0; i < rawData.length; i += 20000) {
      chunksArray.push(rawData.slice(i, i + 20000));
    }
  } catch (err) {
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

// Load the backing track another peer has loaded on the file picker
function setBackingTrackRemote(fileName) {
  if (!fileName) {
    console.warn('failed to set backing track from peers');
    return;
  }

  document.getElementById('file_label').innerHTML =
    'Following: "' +
    fileName +
    '".&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Change backing track:';
  waveform0Container.removeAttribute('hidden');
  timeline0Container.removeAttribute('hidden');
  controls0Container.removeAttribute('hidden');
  stopButton0.removeAttribute('hidden');
  playPauseButton0.removeAttribute('hidden');
  muteButton0.removeAttribute('hidden');

  // let file = new File(
  //   [Int8Array.from(fileInfo.get("data"))],
  //   fileInfo.get("name"),
  //   {
  //     type: fileInfo.get("type"),
  //   }
  // );
  // let reader = new FileReader();
  // reader.onload = (e) => {
  //   console.log("loading remote file", e.target.result);
  //   wavesurfer0.loadArrayBuffer(e.target.result);
  //   removeFileURLParam();
  // };
  // reader.readAsArrayBuffer(file);
}

function setBackingTrackFileRemote(fileInfo) {
  if (!fileInfo) {
    console.warn('failed to set backing track file data from peers');
    return;
  }

  let file = new File(
    [Int8Array.from(fileInfo.get('data'))],
    fileInfo.get('name'),
    {
      type: fileInfo.get('type'),
    }
  );
  let reader = new FileReader();
  reader.onload = e => {
    console.log('loading remote file', e.target.result);
    wavesurfer0.loadArrayBuffer(e.target.result);
    removeFileURLParam();
  };
  reader.readAsArrayBuffer(file);
}

function setBackingTrackRepositoryRemote(fileName) {
  if (!fileName || fileName.length === 0) {
    console.warn(
      'unknown filename: failed to set repository file shared by peers as backing track'
    );
    return;
  }

  loadUrlFile(fileName, courseParam, userParam);
  setFileURLParam(fileName);
}

// Load a file from url
function loadUrlFile(f, c, u) {
  Jitsi_User_Name = u;
  document.getElementById('audio-file-name').innerHTML = f;
  // waveform0Container.removeAttribute('hidden');
  // timeline0Container.removeAttribute('hidden');
  // controls0Container.removeAttribute('hidden');
  // stopButton0.removeAttribute('hidden');
  // playPauseButton0.removeAttribute('hidden');
  // muteButton0.removeAttribute('hidden');
  //console.log("file = ", f);
  //console.log("course = ", c);
  //console.log("user = ", u);
  backingTrack.load(
    `https://musicolab.hmu.gr/apprepository/downloadPublicFile.php?f=${f}`
  );
}