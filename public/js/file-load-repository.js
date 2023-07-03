const REPOSITORY_TRACKS = [
  "6_Light_jazz.mp3",
  "All the things you are.mp3",
  "Autumn Leaves.mp3",
  "Cherokee.mp3",
  "disco0.mp3",
];
const tracksElem = document.getElementById("repository-tracks");
const tracksSelect = document.getElementById("repository-tracks-select");
const trackForm = document.getElementById("repository-track-form");
const trackInput = document.getElementById("repository-track-search");
const loadFileBtn = document.getElementById("load-file-btn");
const loadingBtn = document.getElementById("loading-file-btn");
const cancelRequestBtn = document.getElementById("cancel-request-btn");

let abortController;

async function initRepositoryTrackList(courseParam) {
  try {
    const res = await fetch(
      `https://musicolab.hmu.gr/apprepository/moodleGetCourseFilesJson.php?courseIdnumber=${courseParam}`,
      { headers: { Accept: "application/json" } }
    );
    const data = await res.json();
    data.forEach((d) => {
    const opt = document.createElement("option");
      opt.value = d.filename;
      opt.innerText = d.filename;
    tracksElem.appendChild(opt);
  });
  } catch (err) {
    console.error("failed to fetch list of files from repository", err);
  }
}

tracksSelect.addEventListener("submit", async (event) => {
  event.preventDefault();
  const fd = new FormData(tracksSelect);
  const picked = fd.get("repository-tracks");
  if (picked !== null) {
    await loadAudioTrack(picked);
  }
});

trackForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  let fileName = trackInput.value;
  console.log("trackForm submit", { fileName });
  await loadAudioTrack(fileName);
});

function updateBackingTrackPlayer(fileName) {
  waveform0Container.removeAttribute("hidden");
  timeline0Container.removeAttribute("hidden");
  controls0Container.removeAttribute("hidden");
  stopButton0.removeAttribute("hidden");
  playPauseButton0.removeAttribute("hidden");
  muteButton0.removeAttribute("hidden");
  document.getElementById("file_label").innerHTML =
    'Following: "' +
    fileName +
    '".&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Change backing track:';
}

async function loadAudioTrack(fileName) {
  loadFileBtn.classList.add("hidden");
  loadingBtn.classList.remove("hidden");
  cancelRequestBtn.disabled = false;
  abortController = new AbortController();

  document.querySelectorAll(".alert").forEach((alert) => alert.remove());

  try {
    const res = await fetch(
      `https://musicolab.hmu.gr/apprepository/downloadPublicFile.php?f=${fileName}`,
      { signal: abortController.signal }
    );
    const blob = await res.blob();
    if (blob.type.includes("text/html")) {
      throw new Error(`Failed to fetch audio file: "${fileName}"`);
    }

    wavesurfer0.loadBlob(blob);
    updateBackingTrackPlayer(fileName);
    $("#repository-files-modal").modal("hide");
    window.ydoc?.transact(() => {
        window.playerConfig?.set("backingTrackRepository", fileName);
        window.playerConfig.delete("backingTrack");
    });
  } catch (err) {
    let errorMsg = err.message;
    if (err.name === "AbortError") {
      errorMsg = "You cancelled the request";
      console.error(
        "Fetch aborted by user action (browser stop button, closing tab, etc."
      );
    } else {
      console.error(err);
    }

    let alert = document.createElement("div");
    alert.classList.add("alert", "alert-danger", "mt-3");
    alert.role = "alert";
    alert.innerHTML = `${errorMsg} <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>`;
    tracksSelect.parentElement.appendChild(alert);

    setTimeout(() => {
      alert.remove();
    }, 5000);
  } finally {
    loadingBtn.classList.add("hidden");
    loadFileBtn.classList.remove("hidden");
    cancelRequestBtn.disabled = true;
  }
}

cancelRequestBtn.addEventListener("click", () => {
  console.log("request aborted");
  abortController.abort();
  loadingBtn.classList.add("hidden");
  loadFileBtn.classList.remove("hidden");
  cancelRequestBtn.disabled = true;
});
