const REPOSITORY_TRACKS = {
  public: [
    { filename: "6_Light_jazz.mp3" },
    { filename: "All the things you are.mp3" },
    { filename: "Autumn Leaves.mp3" },
    { filename: "Cherokee.mp3" },
    { filename: "disco0.mp3" },
  ],
  private: [
    { filename: "private1.mp3" },
    { filename: "private2.mp3" },
  ],
  course: [
    { filename: "6_Light_jazz.mp3" },
    { filename: "Air_Bach.mp3" },
    { filename: "egoDeath.mp3" },
  ]
};

// const tracksElem = document.getElementById("repository-tracks");
const loadFileBtn = document.getElementById("load-file-btn");
const loadingBtn = document.getElementById("loading-file-btn");
const cancelRequestBtn = document.getElementById("cancel-request-btn");

const repositoryFileSearchForm = document.getElementById('repository-file-search');
const btnSearch = document.getElementById('btn-search');
const btnClearSearch = document.getElementById('btn-clear-search');
const inputSearch = document.getElementById('input-search');
let searchEmpty = false;

inputSearch?.addEventListener('input', event => {
  searchEmpty = !event.currentTarget.value || event.currentTarget.value.length === 0;
  btnSearch.disabled = searchEmpty;
})

repositoryFileSearchForm.addEventListener('submit', event => {
  event.preventDefault();

  // Nothing to search for
  if (searchEmpty) return;

  $('#tree').treeview('search', [inputSearch.value, {
    ignoreCase: true,     // case insensitive
    exactMatch: false,    // like or equals
    revealResults: true,  // reveal matching nodes
  }]);
});

btnClearSearch.addEventListener('click', () => {
  $('#tree').treeview('clearSearch');
  $('#tree').treeview('collapseAll');
  inputSearch.value = '';
  btnSearch.disabled = true;
})

let abortController;

async function initRepositoryTrackList(courseParam, collabParam) {
  try {
    const res = await fetch(
      `https://musicolab.hmu.gr/apprepository/moodleGetCourseFilesJson.php?courseIdnumber=${courseParam}&collab=${collabParam}`,
      { headers: { Accept: "application/json" } }
    );
    const data = await res.json();

    // const data = REPOSITORY_TRACKS;
    let treeData = tracksToTreeView(data);
    createTreeView(treeData);

  } catch (err) {
    console.error("failed to fetch list of files from repository", err);
  }
}

function handleSearchComplete(treeData) {
  return function(event, results) {
    // Hide items not matching search 
    document.querySelectorAll(`.list-group-item.node-tree:not([class*="search-result"])`).forEach(entry => {
      if (!Object.keys(treeData).includes(entry.textContent)) {
        entry.style.display = 'none';
      }
    });
  }
}

function handleSearchCleared(event, results) {
  document.querySelectorAll(`.list-group-item.node-tree`).forEach(entry => entry.style.display = 'block');
}

function handleNodeSelected(event, node) {
  if (typeof node.parentId != 'undefined') {
    console.log('node selected', node);
    loadFileBtn.disabled = false;
  }
}

function createTreeView(treeData) {
  $('#tree').treeview({
    data: treeData,
    highlightSearchResults: true,
    onSearchComplete: handleSearchComplete(treeData),
    onSearchCleared: handleSearchCleared,
    onNodeSelected: handleNodeSelected,
  });
}

function tracksToTreeView(tracks) {
  let sizes = Object.keys(tracks)
    .reduce((prev, key) => {
      return { ...prev, [key]: tracks[key]?.length ?? 0 };
    }, {});

  return Object.entries(tracks)
    .map(([type, files]) => {
      return {
        text: `<span>${type}</span><span class="ml-2 badge badge-primary">${sizes[type]}</span>`,
        selectable: sizes[type] > 0,
        state: {
          expanded: false,
          disabled: typeDisabled(type),
        },
        nodes: files?.map(file => ({
          text: file.filename,
          icon: "fa fa-file",
        }))
      }
    });
}

/**
 * 
 * @param {'course' | 'public' | 'private'} type 
 */
function typeDisabled(type) {
  // Hide course files if course URL param is not provided
  if (type === 'course' && !courseParam) { 
    return true; 
  }

  // Hide private files when in collab mode
  if (type === 'private' && !!Collab) {
    return true;
  }

  return false;
}

document.getElementById('tree')?.addEventListener('click', event => {
  if (document.querySelector('.list-group-item.node-tree.search-result')) {
    // Prevent clicks when search results are shown
    event.preventDefault();
    event.stopPropagation();
    return;
  }


  // Get the type of files clicked (public, private or course)
  const fileTypeElem = event.target.closest('.list-group-item.node-tree');
  if ('nodeid' in fileTypeElem.dataset) {
    // Show/hide files of this type
    $('#tree').treeview('toggleNodeExpanded', [+fileTypeElem.dataset.nodeid]);
  }
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

loadFileBtn.addEventListener('click', async () => {
  let selected = $('#tree').treeview('getSelected', 0);
  // If it's a leaf node (file)
  if (selected[0]?.parentId !== undefined) {
    console.log('loadFileBtn handler', selected);
    await loadAudioTrack(selected[0].text);
  }
})

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
    document.getElementById('repository-tracks-container').prepend(alert);

    setTimeout(() => {
      alert.remove();
    }, 5000);
  } finally {
    loadingBtn.classList.add("hidden");
    loadFileBtn.classList.remove("hidden");
    cancelRequestBtn.disabled = true;
    loadFileBtn.disabled = true;
  }
}

cancelRequestBtn.addEventListener("click", () => {
  console.log("request aborted");
  abortController.abort();
  loadingBtn.classList.add("hidden");
  loadFileBtn.classList.remove("hidden");
  cancelRequestBtn.disabled = true;
});