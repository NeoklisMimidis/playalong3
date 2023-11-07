// Get the button element
var startJitsiMeetBtn = document.getElementById('start-close-call-btn');
var joinCallButton = document.getElementById('join_call');
var joinCallButton_video_only = document.getElementById('join_call_video_only');

var defaultRoomName = 'test-room';
const icon = document.querySelector('#start-close-call-btn .bi-telephone-fill');
let api = null;
/*
// Get the values of the URL parameters // already done in app.js
defaultRoomName = urlParams1.get('course');
var urlParams1 = new URLSearchParams(window.location.search);
var Jitsi_Room_Name = urlParams1.get('course');
var Jitsi_User_Name = urlParams1.get('u');
document.querySelector('#meet-room') = Jitsi_Room_Name;
*/

//console.log("Jitsi Room Name = ",Jitsi_Room_Name);

startJitsiMeetBtn.addEventListener('click', function (e) {
  if (this.classList.contains('call-started')) {
    this.classList.remove('call-started');
    // icon.style.fill = 'green';

    destroyJitsi();
    hideJitsiFrame();

    document.getElementById('musicolab-logo').removeAttribute('hidden');
  } else {
    document.getElementById('musicolab-logo').setAttribute('hidden', true);

    $('#enter-jitsi-meet-room').modal('show');
  }
});

// Add event listener to the button
joinCallButton.addEventListener('click', function (e) {
  e.preventDefault();
  /*// Check if an instance is already running
  if (api !== null) {
    console.log("An instance of the Jitsi Meet iframe is already running.");
    console.log("Will now destroy it and create a new one.");
    api.dispose();
  }
  */
  // Load the default name of the Jitsi Meet Room
  defaultRoomName = Jitsi_Room_Name;
  const roomNameInput = document.querySelector('#meet-room');
  const roomName = roomNameInput.value;
  // Create a new Jitsi Meet iframe
  const domain = 'musicolab.hmu.gr:8443';
  const options = {
    roomName: roomName,
    width: '100%',
    height: '100%',
    parentNode: document.querySelector('#jitsi-meeting-container'),
    configOverwrite: {
      startWithAudioMuted: false,
      disableAP: true,
      disableAEC: false,
      disableNS: true,
      disableAGC: true,
      disableHPF: true,
      stereo: false,
      opusMaxAverageBitrate: 10000,
      enableOpusRed: false,
      enableNoAudioDetection: false,
      enableNoisyMicDetection: false,
      disableAudioLevels: true,
      disableSimulcast: true,
      enableLayerSuspension: true,
    },

    userInfo: {
      displayName: Jitsi_User_Name,
    },
  };

  api = new JitsiMeetExternalAPI(domain, options);

  startJitsiMeetBtn.classList.add('call-started');
  icon.style.fill = 'red';

  $('#jitsi-meeting-container').slideDown('slow', () => {});

  // Close the modal
  $('#enter-jitsi-meet-room').modal('hide');

  api.on('videoConferenceLeft', () => {
    console.log('You left. Close the Iframe now.');
    destroyJitsi();
    hideJitsiFrame();
    // icon.style.fill = 'green';
  });

  api.addEventListener('readyToClose', () => {
    console.log(
      'Jitsi call has ended. Jitsi iframe will be hidden and the API will be destroyed.'
    );

    destroyJitsi();
    hideJitsiFrame();
  });

  // This DOES NOT WORK. "END MEETING FOR ALL" is not .
  //api.on('videoConferenceDestroyed', () => {
  //  console.log("Meeting ended for all. Close the Iframe now.");
  //  api.dispose();
  //  document.querySelector('#jitsi-meeting-container').classList.add('d-none');
  //  document.querySelector('#jitsi-meeting-container').classList.remove('open');
  //});
});

joinCallButton_video_only.addEventListener('click', function (e) {
  e.preventDefault();
  /*// Check if an instance is already running
    if (api !== null) {
      console.log("An instance of the Jitsi Meet iframe is already running.");
      console.log("Will now destroy it and create a new one.");
      api.dispose();
    }
    */
  // Load the default name of the Jitsi Meet Room
  defaultRoomName = Jitsi_Room_Name;
  const roomNameInput = document.querySelector('#meet-room');
  const roomName = roomNameInput.value;
  // Create a new Jitsi Meet iframe
  const domain = 'musicolab.hmu.gr:8443';
  const options = {
    roomName: roomName,
    width: '100%',
    height: '100%',
    parentNode: document.querySelector('#jitsi-meeting-container'),
    configOverwrite: {
      startSilent: true,
      startWithVideoMuted: false,
    },
    userInfo: {
      displayName: Jitsi_User_Name,
    },
  };

  api = new JitsiMeetExternalAPI(domain, options);

  startJitsiMeetBtn.classList.add('call-started');
  icon.style.fill = 'red';

  $('#jitsi-meeting-container').slideDown('slow', () => {});

  // Close the modal
  $('#enter-jitsi-meet-room').modal('hide');

  api.on('videoConferenceLeft', () => {
    console.log('You left. Close the Iframe now.');
    destroyJitsi();
    hideJitsiFrame();
    // icon.style.fill = 'green';
  });

  api.addEventListener('readyToClose', () => {
    console.log(
      'Jitsi call has ended. Jitsi iframe will be hidden and the API will be destroyed.'
    );

    destroyJitsi();
    hideJitsiFrame();
  });

  // This DOES NOT WORK. "END MEETING FOR ALL" is not .
  //api.on('videoConferenceDestroyed', () => {
  //  console.log("Meeting ended for all. Close the Iframe now.");
  //  api.dispose();
  //  document.querySelector('#jitsi-meeting-container').classList.add('d-none');
  //  document.querySelector('#jitsi-meeting-container').classList.remove('open');
  //});
});

function destroyJitsi() {
  if (!$('#jitsi-meeting-container')) {
    console.error('Jitsi container element was not found. Check index.html');
    return;
  }

  api.dispose();
  api = null;
}

function hideJitsiFrame() {
  if (!$('#jitsi-meeting-container')) {
    console.error('Jitsi container element was not found. Check index.html');
    return;
  }

  $('#jitsi-meeting-container').slideUp('slow', () => {});
  icon.style.fill = 'green';
}
