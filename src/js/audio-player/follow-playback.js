import {
  wavesurfer,
  playerStates,
  followPlaybackBtn,
} from '../audio-player.js';

import { assignInputFieldEvents } from '../components/utilities.js';

export function selectFollowPlaybackMode(
  currentTime,
  resetPoint,
  turnPoint = resetPoint
) {
  // Continue only if follow playback is activated
  if (!playerStates.FOLLOW_PLAYBACK) return;

  // get the current horizontal scroll offset in pixels
  const scrollWidthStart = wavesurfer.drawer.getScrollX();

  // get the visible width of the parent container in pixels
  const parentWidth = wavesurfer.drawer.getWidth();

  // Minimum pixel change for visible rendering update
  const minPxDelta = 1 / wavesurfer.params.pixelRatio;

  // calculating the next turn point
  const turnPointInPixels = parentWidth * turnPoint + scrollWidthStart;

  const currentTimeInPixels = currentTime * wavesurfer.params.minPxPerSec;

  const maxScroll = wavesurfer.drawer.wrapper.scrollWidth - parentWidth;
  if (maxScroll == 0) {
    // no need to continue if scrollbar is not there
    return;
  }

  if (currentTimeInPixels >= turnPointInPixels * minPxDelta) {
    let target;

    if (resetPoint === turnPoint) {
      // 1) Scrolling playback at user selected point
      const offset = parentWidth * turnPoint * minPxDelta;

      const scrollPlayback = currentTimeInPixels - offset;

      // limit target to valid range (0 to maxScroll)
      target = Math.max(0, Math.min(maxScroll, scrollPlayback));
    } else {
      // 2) Page turn playback
      const pageTurnPlayback =
        (parentWidth * turnPoint +
          scrollWidthStart -
          parentWidth * resetPoint) *
        minPxDelta;

      // limit target to valid range (0 to maxScroll)
      target = Math.max(0, Math.min(maxScroll, pageTurnPlayback));
    }

    wavesurfer.drawer.wrapper.scrollLeft = target;
  }
}

export function enableFollowPlayback(event) {
  if (playerStates.FOLLOW_PLAYBACK) return;
  playerStates.FOLLOW_PLAYBACK = true;

  if (typeof event === 'number') {
    // case of seeking audio (clicking waveform)
    wavesurfer.seekTo(event);
  } else {
    // case of pressing 'Follow playback' button
    const currentTimeInPixels =
      wavesurfer.getCurrentTime() * wavesurfer.params.minPxPerSec;
    wavesurfer.drawer.wrapper.scrollLeft = currentTimeInPixels;
  }

  followPlaybackBtn.classList.add('no-opacity');
}

export function disableFollowPlayback() {
  playerStates.FOLLOW_PLAYBACK = false;
  followPlaybackBtn.classList.remove('no-opacity');
}

export function disableFollowPlaybackWhenMovingScrollbar(e) {
  // Check if scrollbar is active by comparing visible parent container width and waveform original width (in pixels)
  const parentWidth = wavesurfer.drawer.getWidth();
  let waveformOriginalWidth =
    wavesurfer.getDuration() * wavesurfer.params.minPxPerSec;

  // Now we need to determine if the click was from the scrollbar. To do that we can use the scrollbar height:
  // a)
  // calculating the click position from the top of the element
  let clickPositionFromTop = e.offsetY;

  // get the total height of the element
  let elementHeight = e.target.offsetHeight;

  // calculate the click position from the bottom of the element
  let clickPositionFromBottom = elementHeight - clickPositionFromTop;

  // b) we also need to count in cases of regions where the tagName is region so we have to check the tagName

  // T.L.D.R. : If click is on 'WAVE' tag and within 16px from bottom (scrollbar area), then execute the following code.
  if (e.target.tagName === 'WAVE' && clickPositionFromBottom <= 16) {
    if (waveformOriginalWidth <= parentWidth) return; // return if no scrollbar active
    disableFollowPlayback();
  } else {
    // remove previous loop region  on ONLY waveform mouse down event
    if (playerStates.LOOP_REGION) {
      playerStates.LOOP_REGION.remove();
    }
  }
}

/**
 * Follow Playback: Manages playback behavior in accordance with user-defined settings.
 *
 * Two modes of playback interaction are supported:
 * 1. Scroll Mode
 * 2. Page Turn Mode
 *
 * @function settingsMenuFollowPlayback
 *
 * Scroll Mode:
 * - Scroll Point: Specifies the fraction of the displayed waveform that triggers scrolling.
 *   - Values: Ranges between 0 and 1, incremented by steps of 0.05.
 *
 * Page Turn Mode:
 * - Reset Point: Defines the position where the playback cursor resets.
 *   - Values: Ranges between 0 and 1, incremented by steps of 0.05.
 * - Turn Point: Identifies the position where the "page turn" occurs.
 *   - Values: Ranges between the current Reset Point value and 1, incremented by steps of 0.05.
 *
 * These modes manipulate the playback cursor's position and behavior to provide a more
 * customized playback experience.
 */
export function settingsMenuFollowPlayback() {
  const firstInput = document.querySelector('#firstInput');
  const leftInputOptions = {
    default: playerStates.FOLLOW_PLAYBACK_OPTIONS.resetPoint,
    step: 0.05,
    min: 0,
    max: 1,
    current: null,
  };
  assignInputFieldEvents(firstInput, leftInputOptions);

  const secondInput = document.querySelector('#secondInput');
  const rightInputOptions = {
    default: playerStates.FOLLOW_PLAYBACK_OPTIONS.turnPoint,
    step: 0.05,
    min: leftInputOptions.current,
    max: 1,
    current: null,
  };
  assignInputFieldEvents(secondInput, rightInputOptions);

  const followPlaybackMenu = document.querySelector('#follow-playback-menu');

  /**
   * The event listener attached to the followPlaybackMenu updates
   * playerStates options and the display of input fields based on
   * the target of the click event. Specifically:
   * - If the click event is closest to the 'Scroll' option, it will
   *   enable the scroll option and hide the 'Page turn point' input field.
   * - If the click event is closest to the 'Page Turn' option, it will
   *   disable the scroll option and show the 'Page turn point' input field,
   *   also updating the 'Page turn point' if necessary.
   * - If the click event is on the 'Destination point' input field,
   *   it will update the 'Page turn point' minimum value and current value
   *   if necessary, and also update the destination point in playerStates.
   * - If the click event is on the 'Page turn point' input field,
   *   it will update the page turn point in playerStates.
   */
  followPlaybackMenu.addEventListener('click', e => {
    if (e.target.closest('#scroll')) {
      playerStates.FOLLOW_PLAYBACK_OPTIONS.scroll = true;
      secondInput.classList.add('d-none');
      e.currentTarget.querySelector('#firstInput > label').innerHTML =
        'Scroll point';
    } else if (e.target.closest('#pageTurn')) {
      playerStates.FOLLOW_PLAYBACK_OPTIONS.scroll = false;
      secondInput.classList.remove('d-none');
      e.currentTarget.querySelector('#firstInput > label').innerHTML =
        'Reset point';

      if (leftInputOptions.current > rightInputOptions.current) {
        secondInput.querySelector('.box').innerText = leftInputOptions.current;
        playerStates.FOLLOW_PLAYBACK_OPTIONS.turnPoint =
          leftInputOptions.current;
      }
    } else if (e.target.closest('#firstInput .input-field')) {
      rightInputOptions.min = leftInputOptions.current;

      if (leftInputOptions.current >= rightInputOptions.current) {
        rightInputOptions.current = leftInputOptions.current;

        secondInput.querySelector('.box').innerText = leftInputOptions.current;

        // this the same as scrolling playback
        playerStates.FOLLOW_PLAYBACK_OPTIONS.turnPoint =
          leftInputOptions.current;
      }

      playerStates.FOLLOW_PLAYBACK_OPTIONS.resetPoint =
        leftInputOptions.current;
    } else if (e.target.closest('#secondInput .input-field')) {
      playerStates.FOLLOW_PLAYBACK_OPTIONS.turnPoint =
        rightInputOptions.current;
    }
  });
}

// ////// OLD
// function displayedWaveformStartEndTime() {
//   // get the current horizontal scroll offset in pixels
//   const scrollWidthStart = wavesurfer.drawer.getScrollX();

//   // get the visible width of the parent container in pixels
//   const parentWidth = wavesurfer.drawer.getWidth();

//   // calculate the horizontal scroll offset at the end of the visible area
//   const scrollWidthEnd = scrollWidthStart + parentWidth;

//   // calculate the amount of time that each pixel in the waveform represents
//   const timePerPixel = wavesurfer.getDuration() / wavesurfer.drawer.width;

//   // calculate the start and end times of the audio portion currently displayed in the view
//   const startTime = timePerPixel * scrollWidthStart;
//   const endTime = timePerPixel * scrollWidthEnd;

//   // console.log('Start time: ' + startTime);
//   // console.log('End time: ' + endTime);

//   return [startTime, endTime];
// }
