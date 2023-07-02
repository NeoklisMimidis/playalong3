import {
  wavesurfer,
  forwardBtn,
  backwardBtn,
  playerStates,
} from '../audio-player.js';
import { createToggle } from '../components/utilities.js';
import click from '../../data/click_metronome.wav';

import {
  toolbarStates,
  // Left controls
  toggleSnapOnBeatsBtn,
  toggleClickTrackBtn,
} from '../annotation-tools.js';

let currentRegionElement;
let userInteractedWithWaveform = false;
let isWebAudioInitialized = false;
let clickBuffer; // Store into a variable the fetched click sound for repeated usage
let [audioContext, primaryGainControl] = _initWebAudio();

export const waveformInfo = {
  prevBeatStartTimeInProgress: 0,
  nextBeatStartTimeInProgress: 0,
};

let loopRegionTagName = '';

// -  Snap Beats & Click Track

/**
 *
 * [Snap (beats)]: snap cursor to beat position (=== region.start)
 *
 */
export function setupSnapOnBeatsEvent() {
  toggleSnapOnBeatsBtn.addEventListener('click', () => {
    let [snapOnBeatsState] = createToggle('#toggle-SnapOnBeats-btn');
    toolbarStates.SNAP_ON_BEATS = snapOnBeatsState;

    // This accurately sets the next beat time in the first scenario, (no audio seek has happened)
    if (waveformInfo.nextBeatStartTimeInProgress === 0) {
      waveformInfo.nextBeatStartTimeInProgress =
        wavesurfer.regions.list[1].end / wavesurfer.getDuration();
    }

    if (toolbarStates.SNAP_ON_BEATS) {
      forwardBtn._tippy.setContent('Next beat (→)');
      backwardBtn._tippy.setContent('Prev beat (←)');
    } else {
      forwardBtn._tippy.setContent('Forward 2s (→)');
      backwardBtn._tippy.setContent('Backwards 2s (←)');
    }
  });

  wavesurfer.on('region-click', (region, event) => {
    console.log('Clicked region:', region);
    if (region.id === 'loop-region') return;
    snapOnBeats(region.start, event);
    if (
      currentRegionElement &&
      toolbarStates.CLICK_TRACK &&
      !toolbarStates.EDIT_MODE
    ) {
      currentRegionElement.classList.remove('region-highlight');
      region.element.classList.add('region-highlight');
    }
    currentRegionElement = region.element; // this is used for highlighting click track region
  });

  wavesurfer.on('seek', progress => {
    findPrevNextBeatsStartTime(progress);

    // Also add a click track sound when those 3 conditions are met:
    // the following if condition is about a special case of click track with snap on beats activated (in that case add a click sound)
    if (
      toolbarStates.SNAP_ON_BEATS &&
      toolbarStates.CLICK_TRACK &&
      wavesurfer.isPlaying()
    ) {
      clickTrack();
    }
  });

  // this handles cases where audio IS playing so regions are are updated with region-in event
  wavesurfer.on('region-in', region => {
    if (region.id === 'loop-region') return;
    findPrevNextBeatsStartTime(
      (region.start + 0.05) / wavesurfer.getDuration()
    );
  });

  //
  wavesurfer.on('region-created', region => {
    loopRegionTagName = ''; // empty string means new loop region
    if (region.id === 'loop-region') {
      playerStates.LOOP_REGION.element.addEventListener('mousedown', e => {
        loopRegionTagName = e.target.tagName;
      });
    }
  });

  // snap also applies for loop regions!
  wavesurfer.on('region-update-end', (region, event) => {
    if (!toolbarStates.SNAP_ON_BEATS) return;

    console.log(region.start, region.end);
    if (region.id === 'loop-region') {
      // as prevRegion & nextRegion I mean the loop-region starts and ends
      let prevRegion = getClosestRegion(region.start);
      const nextRegion = getClosestRegion(region.end);

      // console.log('prevRegion 💪:', prevRegion);
      // console.log('nextRegion 💪:', nextRegion);

      if (prevRegion === undefined) {
        prevRegion = {
          start: 0,
          end: 0,
        };
      }

      const prevRegionDur = prevRegion.end - prevRegion.start;
      const prevRegionHalfPoint = prevRegionDur / 2 + prevRegion.start;

      const nextRegionDur = nextRegion.end - nextRegion.start;
      const nextRegionHalfPoint = nextRegionDur / 2 + nextRegion.start;

      // start: Math.min(endUpdate, startUpdate),
      // end: Math.max(endUpdate, startUpdate)

      // IF region is being dragged then the loopRegionTagName is 'REGION' or 'DIV' (DIV is because of X button)
      // IF region is being resized then the loopRegionTagName is 'HANDLE' or '' (HANDLE is the left and right lines in a region)

      // Check if click comes from the region to decide if the region is being dragged or not ( resized or new created)
      if (loopRegionTagName === 'HANDLE' || loopRegionTagName === '') {
        // /*
        // cases for snapping loop-region on creating or on resizing while also avoiding 0 seconds beat regions
        if (region.start < prevRegionHalfPoint) {
          if (
            region.end < nextRegionHalfPoint &&
            prevRegion.start !== nextRegion.start
          ) {
            region.update({
              start: prevRegion.start,
              end: nextRegion.start,
            });
          } else {
            region.update({
              start: prevRegion.start,
              end: nextRegion.end,
            });
          }
        } else if (region.start >= prevRegionHalfPoint) {
          if (
            region.end < nextRegionHalfPoint &&
            prevRegion.end !== nextRegion.start &&
            prevRegion.end !== nextRegion.end
          ) {
            region.update({
              start: prevRegion.end,
              end: nextRegion.start,
            });
          } else if (prevRegion.end === nextRegion.end) {
            region.update({
              start: prevRegion.start,
              end: prevRegion.end,
            });
          } else {
            region.update({
              start: prevRegion.end,
              end: nextRegion.end,
            });
          }
        }
        console.log(region, 'loop region finished creating or resizing');
      } else if (
        loopRegionTagName === 'REGION' ||
        loopRegionTagName === 'DIV'
      ) {
        if (region.start < prevRegionHalfPoint && prevRegion !== nextRegion) {
          // THIS IS THE LOGIC FOR WHEN MOVING A REGION WHILE SNAP ON BEATS. It depends from the point where the loop-region starts:
          console.log(prevRegion.start, nextRegion.start, '💪');
          region.update({
            start: prevRegion.start,
            end: nextRegion.start,
          });
        } else if (
          region.start >= prevRegionHalfPoint &&
          prevRegion !== nextRegion
        ) {
          region.update({
            start: prevRegion.end,
            end: nextRegion.end,
          });
        } else {
          region.update({
            start: prevRegion.start,
            end: prevRegion.end,
          });
        }
        console.log('loop-region finished dragging!');
      }
    }
  });
}

/**
 *
 * [Click Track]: create a click sound on every beat (===beat duration or respective region)
 *
 */
export function setupClickTrackEvent() {
  console.log('🚀:', audioContext, '🚀:', primaryGainControl);

  toggleClickTrackBtn.addEventListener('click', () => {
    // Create toggle functionality for Click Track button
    let [clickTrackState] = createToggle('#toggle-clickTrack-btn');
    toolbarStates.CLICK_TRACK = clickTrackState;

    if (!currentRegionElement) {
      currentRegionElement = wavesurfer.regions.list[1].element;
    }
    if (toolbarStates.CLICK_TRACK) {
      currentRegionElement.classList.add('region-highlight');
    } else {
      // Clear any remaining highlight region in any way (don't use currentRegion.classList.remove('region-highlight') because it doesn't cover all the cases
      Object.values(wavesurfer.regions.list).forEach(region => {
        region.element.classList.remove('region-highlight');
      });
    }
  });

  //  This event is used to avoid buggy click sounds when user interacts in any way with the waveform (click, skip forwards/backwards, timeline etc)
  wavesurfer.on('interaction', () => {
    userInteractedWithWaveform = true;
  });

  wavesurfer.on('region-in', region => {
    if (region.id === 'loop-region') return;
    if (toolbarStates.CLICK_TRACK) {
      currentRegionElement.classList.remove('region-highlight');
      region.element.classList.add('region-highlight');

      if (!userInteractedWithWaveform) clickTrack();
    }

    currentRegionElement = region.element;
    userInteractedWithWaveform = false;
  });
  // revert back to default color when leaving a region
  wavesurfer.on('region-out', region => {
    region.element.classList.remove('region-highlight');
  });
}

// -
function snapOnBeats(startTime, event) {
  if (toolbarStates.SNAP_ON_BEATS) {
    if (
      (toolbarStates.EDIT_MODE && wavesurfer.isPlaying()) ||
      !toolbarStates.EDIT_MODE
    ) {
      event.stopPropagation(); // CAREFUL! stop propagation on in those 2 cases of snap cursor
      wavesurfer.setCurrentTime(startTime);

      // if (toolbarStates.CLICK_TRACK && wavesurfer.isPlaying()) clickTrack(); // also add a click sound if click track is activated
    } else {
      // CAREFUL! DON'T STOP propagation HERE
      console.warn(
        'Snap on beats, is disabled on Edit Mode while audio is paused ⚠️ Enjoy editing!'
      );
    }
  }
}

export function findPrevNextBeatsStartTime(progress) {
  // Retrieve the total duration of the audio file.
  const totalAudioDuration = wavesurfer.getDuration();

  // Calculate the current time based on the progress (a ratio between 0 and 1).
  // The time is rounded to the nearest tenth of a second to avoid precision issues.
  let time = Math.ceil(totalAudioDuration * progress * 10) / 10;

  // Retrieve all regions and sort them in ascending order based on their start times.
  let regionsArray = Object.values(wavesurfer.regions.list);
  // .sort(
  //   (a, b) => a.start - b.start
  // );
  // or no sort is not needed bcs it happens in updateMarkersWit.... TODO remove

  // Iterate through all regions.
  for (let i = 0; i < regionsArray.length; i++) {
    // Determine the start time of the next region, or use the total audio duration if there is no next region.
    let nextRegionStartTime =
      i < regionsArray.length - 1
        ? regionsArray[i + 1].start
        : totalAudioDuration;

    // If the current time falls within the current region (i.e., it is greater than or equal to the start time of the current region and less than the start time of the next region),
    // then calculate the start times of the previous and next beats.
    if (time >= regionsArray[i].start && time < nextRegionStartTime) {
      // If there is a previous or next region, calculate its start time as a proportion of the total audio duration.
      if (i > 0) {
        waveformInfo.prevBeatStartTimeInProgress =
          regionsArray[i - 1].start / totalAudioDuration;
      }

      if (i < regionsArray.length - 1) {
        waveformInfo.nextBeatStartTimeInProgress =
          regionsArray[i + 1].start / totalAudioDuration;
        // else case 'creates' one more beat at almost total duration
      } else {
        // Don't use 1 so that audio doesn't start again IF audio is  playing (we want to go to start only if loop enabled not always)
        waveformInfo.nextBeatStartTimeInProgress = 0.999999999999;
      }
      // Since the region containing the current time has been found, stop iterating through the regions.
      break;
      //  this condition fixes the bug with last situation where prev beat is set incorrectly
    } else if (time >= totalAudioDuration) {
      waveformInfo.prevBeatStartTimeInProgress =
        regionsArray[i].start / totalAudioDuration;
    }
  }

  // // Output the start times of the previous and next beats for debugging.
  // console.log(
  //   `Previous beat start time: ${waveformInfo.prevBeatStartTimeInProgress}`
  // );
  // console.log(
  //   `Next beat start time: ${waveformInfo.nextBeatStartTimeInProgress}`
  // );
}

function getClosestRegion(time) {
  let regions = wavesurfer.regions.list;
  let regionKeys = Object.keys(regions).filter(
    key => regions[key].id !== 'loop-region'
  );

  let closestRegion = regionKeys.reduce((prev, curr) => {
    return Math.abs(regions[curr].start - time) <
      Math.abs(regions[prev].start - time)
      ? curr
      : prev;
  });

  // check if closestRegion is greater than time, if so, get the previous region
  if (regions[closestRegion].start >= time) {
    closestRegion = regionKeys[regionKeys.indexOf(closestRegion) - 1];
  }

  return regions[closestRegion];
}

function clickTrack() {
  // In case of destroyed audio context
  if (!isWebAudioInitialized) {
    [audioContext, primaryGainControl] = _initWebAudio();
    console.log('🚀:', audioContext, '🚀:', primaryGainControl);
  }

  _clickSound(audioContext, primaryGainControl);
}

function _initWebAudio() {
  isWebAudioInitialized = true;

  // console.log('_initWebAudio');
  const audioContext = new AudioContext();
  const primaryGainControl = audioContext.createGain();
  primaryGainControl.gain.value = 1;
  primaryGainControl.connect(audioContext.destination);

  return [audioContext, primaryGainControl];
}

async function _clickSound(audioContext, primaryGainControl) {
  if (!clickBuffer) {
    await fetchClickSound(audioContext);
  }

  const clickSource = audioContext.createBufferSource();
  clickSource.buffer = clickBuffer;

  const clickGain = audioContext.createGain();
  clickGain.gain.value = 1;

  clickSource.connect(clickGain);
  clickGain.connect(primaryGainControl);

  clickSource.start();
}

async function fetchClickSound(audioContext) {
  const response = await fetch(click);
  const arrayBuffer = await response.arrayBuffer();
  clickBuffer = await decodeAudioData(audioContext, arrayBuffer);
  console.log(clickBuffer);
}

function decodeAudioData(audioContext, arrayBuffer) {
  return new Promise((resolve, reject) => {
    audioContext.decodeAudioData(arrayBuffer, resolve, reject);
  });
}
