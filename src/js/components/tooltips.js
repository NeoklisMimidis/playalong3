// Creating beautiful tooltips!
import tippy, { createSingleton, delegate, followCursor } from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light.css';
import 'tippy.js/themes/light-border.css';
import 'tippy.js/themes/material.css';
import 'tippy.js/themes/translucent.css';
import 'tippy.js/animations/scale-subtle.css';

import 'tippy.js/dist/backdrop.css';
import 'tippy.js/animations/shift-away.css';

import { variations } from './mappings.js';

export let tooltips = {
  playerSingleton: '',
  markersSingleton: '',
  regions: '',
};

//  Set some default props for all instances
tippy.setDefaultProps({
  allowHTML: true,
  // delay: [1500, 250], // TODO FIX
  hideOnClick: false,
  // animateFill removes arrow BUG
  // animateFill: true,
  // plugins: [animateFill],
  onShow: function (instance) {
    // Get the tooltip element
    const tooltip = instance.popper.querySelector('.tippy-content');
    // Apply text selection behavior to the tooltip content
    tooltip.style.userSelect = 'text';
    tooltip.style.textAlign = 'justify';
  },
});

// - Toolbar tooltips
const leftToolbarControls = `<strong>Snap(beats)</strong> ensures precise cursor placement on analyzed beat positions. In <span class="text-warning">Edit mode</span>, Snap (beats) is disabled when audio pauses, to facilitate editing.<br><strong>Click track</strong> generates audible beats, aiding rhythm comprehension and beat verification. While activated, beat duration is visually highlighted.`;
tippy('#left-toolbar-controls', {
  content: leftToolbarControls,
  delay: [800, 100],
  theme: 'translucent',
  placement: 'left-end',
  maxWidth: '400px',
  interactive: true,
});

const centerToolbarControls = `The <strong>annotation list</strong> allows you to select which annotations are displayed, including the ability to create new annotations during <span style="font-style: italic; text-decoration: underline;">editing</span>. Deletion of annotations is possible through the <strong>Delete</strong> <i class="fa-solid fa-sm fa-trash-can"></i>, except for the original (automatic analysis).<br><strong>Edit</strong>  grants access to <span class="text-warning">Edit mode</span> and a set of tools designed for modifying selected annotations.`;

tippy('#center-toolbar-controls', {
  content: centerToolbarControls,
  delay: [800, 100],
  theme: 'translucent',
  // theme: 'light-border',
  // placement: 'right-start',
  placement: 'top',
  arrow: true,
  maxWidth: '660px',
  interactive: true,
});

const rightToolbarControls = `<strong>Edit chord</strong> <i class="fa-solid fa-pen fa-sm"></i>, allows modifying the selected chord.<br><strong>Save</strong> <i class="fa-solid fa-floppy-disk fa-sm"></i>, stores changes made either as separate or replaced annotation (except original annotation)<br><strong>Cancel</strong>   <i class="fa-solid fa-xmark fa-sm"></i>, reverts back without altering.<br><span style="font-style: italic;">Customize and manage your chord edits with ease.</span>`;
tippy('#right-toolbar-controls', {
  content: rightToolbarControls,
  delay: [800, 100],
  theme: 'translucent',
  // theme: 'light-border',
  // placement: 'right-start',
  placement: 'top-end',
  maxWidth: '420px',
  interactive: true,
});

const questionContent =
  'The <strong>waveform</strong> showcases <span style="text-decoration: underline;">markers</span>, vertical lines indicating musical information such as <span style="font-style: italic; text-decoration: underline;">beat timings</span>. Each marker features a label displaying the respective <span style="font-style: italic; text-decoration: underline;">chord symbol</span>, with hidden duplicates for a cleaner display. Colorized regions between markers correspond to root notes, enhancing visual recognition and differentiation.<br><span style="font-style: italic;">Hover on a region to reveal the complete chord name.</span>';
tippy('.fa-circle-question', {
  content: questionContent,
  delay: [500, 100],
  theme: 'translucent',
  placement: 'right-end',
  interactive: true,
  offset: [50, 10],
  maxWidth: '370px',
});

const infoContent =
  'In <span class="text-warning">Edit mode</span>, you gain extra functionality to modify markers that represent beats and chords.<br> Easily <span style="font-weight: bold; text-decoration: underline;">drag</span> a marker to fine-tune beat timing or <span style="font-weight: bold; text-decoration: underline;">click</span> one, to enable <strong>Edit chord</strong> <i class="fa-solid fa-sm fa-pen"></i> and select a new chord. <br><span style="font-weight: bold; text-decoration: underline;">Right-click</span> to remove the selected marker, or simply <span style="font-weight: bold; text-decoration: underline;">double-click</span> on the waveform to add a new marker at the desired position.<br>You can hover on a label to reveal additional metrics.<br><span style="font-style: italic;">Take control and enhance the accuracy of the automatic analysis effortlessly.</span>';
tippy('.fa-circle-info', {
  content: infoContent,
  delay: [500, 100],
  theme: 'translucent',
  placement: 'right-end',
  interactive: true,
  offset: [50, 10],
  maxWidth: '390px',
});

// - Sidebar (Audio I/O Controls)
const ImportFromDiskIcon = `
<svg
  width="15px"
  height="15px"
  viewBox="2 1 25 25"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  >
  <path
    fill-rule="evenodd"
    clip-rule="evenodd"
    d="M10 1C9.73478 1 9.48043 1.10536 9.29289 1.29289L3.29289 7.29289C3.10536 7.48043 3 7.73478 3 8V20C3 21.6569 4.34315 23 6 23H7C7.55228 23 8 22.5523 8 22C8 21.4477 7.55228 21 7 21H6C5.44772 21 5 20.5523 5 20V9H10C10.5523 9 11 8.55228 11 8V3H18C18.5523 3 19 3.44772 19 4V7C19 7.55228 19.4477 8 20 8C20.5523 8 21 7.55228 21 7V4C21 2.34315 19.6569 1 18 1H10ZM9 7H6.41421L9 4.41421V7ZM12.5 24C13.8807 24 15 22.8807 15 21.5V12.8673L20 12.153V18.05C19.8384 18.0172 19.6712 18 19.5 18C18.1193 18 17 19.1193 17 20.5C17 21.8807 18.1193 23 19.5 23C20.8807 23 22 21.8807 22 20.5V11C22 10.7101 21.8742 10.4345 21.6552 10.2445C21.4362 10.0546 21.1456 9.96905 20.8586 10.0101L13.8586 11.0101C13.3659 11.0804 13 11.5023 13 12V19.05C12.8384 19.0172 12.6712 19 12.5 19C11.1193 19 10 20.1193 10 21.5C10 22.8807 11.1193 24 12.5 24Z"
    fill="currentColor"
  />
</svg>
`;

const ImportFromRepositoryIcon = `
<svg
xmlns="http://www.w3.org/2000/svg"
width="15"
height="15"
fill="white"
viewBox="0 0 16 16"
>
<path
  d="M4.318 2.687C5.234 2.271 6.536 2 8 2s2.766.27 3.682.687C12.644 3.125 13 3.627 13 4c0 .374-.356.875-1.318 1.313C10.766 5.729 9.464 6 8 6s-2.766-.27-3.682-.687C3.356 4.875 3 4.373 3 4c0-.374.356-.875 1.318-1.313ZM13 5.698V7c0 .374-.356.875-1.318 1.313C10.766 8.729 9.464 9 8 9s-2.766-.27-3.682-.687C3.356 7.875 3 7.373 3 7V5.698c.271.202.58.378.904.525C4.978 6.711 6.427 7 8 7s3.022-.289 4.096-.777A4.92 4.92 0 0 0 13 5.698ZM14 4c0-1.007-.875-1.755-1.904-2.223C11.022 1.289 9.573 1 8 1s-3.022.289-4.096.777C2.875 2.245 2 2.993 2 4v9c0 1.007.875 1.755 1.904 2.223C4.978 15.71 6.427 16 8 16s3.022-.289 4.096-.777C13.125 14.755 14 14.007 14 13V4Zm-1 4.698V10c0 .374-.356.875-1.318 1.313C10.766 11.729 9.464 12 8 12s-2.766-.27-3.682-.687C3.356 10.875 3 10.373 3 10V8.698c.271.202.58.378.904.525C4.978 9.71 6.427 10 8 10s3.022-.289 4.096-.777A4.92 4.92 0 0 0 13 8.698Zm0 3V13c0 .374-.356.875-1.318 1.313C10.766 14.729 9.464 15 8 15s-2.766-.27-3.682-.687C3.356 13.875 3 13.373 3 13v-1.302c.271.202.58.378.904.525C4.978 12.71 6.427 13 8 13s3.022-.289 4.096-.777c.324-.147.633-.323.904-.525Z"
/>
</svg>
`;

const audioSidebarText = `<span style="font-style: italic;">Open the side panel to access various actions.</span><br><strong>Import from disk</strong> ${ImportFromDiskIcon}Select a file from your computer or effortlessly <span style="font-style: italic; text-decoration: underline;">drag and drop</span> it into the designated space on the left.<br><strong>Import from repository </strong>${ImportFromRepositoryIcon}Load a file from the MusiCoLab remote repository.<br><strong>Export to disk or repository</strong> <i class="fa-solid fa-download fa-sm"></i> Decide if you want to include the backing track audio and/or respective annotation files in your export to your local disk or MusiCoLab repository.`;
tippy('#audio-sidebar-text', {
  content: audioSidebarText,
  delay: [400, 100],
  placement: 'bottom',
  followCursor: 'horizontal',
  plugins: [followCursor],
  interactive: true,
  maxWidth: '450px',
  // for some reason some default params don't work on this one so re-apply
  onShow: function (instance) {
    // Get the tooltip element
    const tooltip = instance.popper.querySelector('.tippy-content');
    // Apply text selection behavior to the tooltip content
    tooltip.style.userSelect = 'text';
    tooltip.style.textAlign = 'justify';
    tooltip.style.fontFamily = 'Verdana, Manrope, Great Vibes, sans-serif';
  },
});

export const AUDIO_PLAYER_TOOLTIPS = {
  content: reference => reference.getAttribute('data-tooltip'),
  delay: [500, 200],
  moveTransition: 'transform 0.2s ease-out',
  hideOnClick: false,
  placement: 'top',
  arrow: false,
  offset: [0, 10],
  animation: 'scale-subtle',
  onShow: function (instance) {
    const tooltip = instance.popper.querySelector('.tippy-content');
    tooltip.style.fontSize = '12px';
  },
};

// - Singleton utility function for the creation of multiple tooltips
/**
 * The createTippySingleton function generates a unique Tippy tooltip (singleton) instance for the provided selector, managing existing instances and creating new ones. It sets the content of each individual instance within the singleton based on an HTML attribute, and stores the singleton array in each element.
 *
 * @param {
 * selector, tooltipDataAttribute
 * }
 * @returns singleton
 */
export function createTippySingleton(selector, tooltipDataAttribute, props) {
  let singleton;

  const nodeList = document.querySelectorAll(selector);
  const element = nodeList[0];

  // Check if there are already tippy instances
  if (!element._tippy) {
    singleton = createSingleton(tippy(selector), props);
  } else {
    singleton = element.singleton;
  }

  // Destroy previous tippy instances (because setInstances doesn't)
  singleton.props.triggerTarget.forEach(el => {
    el._tippy.destroy();
  });

  // Create new tippy instances
  const newTippyInstances = tippy(selector);
  singleton.setInstances(newTippyInstances);

  // Add tooltip content & store the singleton array in each element
  singleton.props.triggerTarget.forEach(el => {
    const tooltip = el.getAttribute(tooltipDataAttribute);

    el._tippy.setContent(tooltip);
    el.singleton = singleton; // Storing the Tippy.js singleton instance to every element part of the singleton.

    // elements with not defined tooltip can't display tooltip
    if (tooltip === 'null' || tooltip === 'undefined') {
      el.style.pointerEvents = 'none';
    }
  });

  return singleton;
}

export function createTooltipsChordEditor() {
  const tableElements = document.querySelectorAll('#chord-editor td');
  // Assigning a tooltip according to mapping (tippy step 1)
  tableElements.forEach(element => {
    let tooltip;

    const foundVariation = variations.find(variation => {
      if (variation.encoded === element.innerHTML.trim()) {
        return true;
      } else if (variation.encoded === element.textContent.trim()) {
        return true;
      }
    });

    if (foundVariation) {
      tooltip = foundVariation.description;
    }

    // Add tippy ONLY if not already defined in HTML (1)
    if (!element.hasAttribute('data-modal-tooltip')) {
      element.setAttribute('data-modal-tooltip', tooltip);
    }
  });

  // Create a singleton: array of regular tippy instances (tippy step 2)
  const modalSingleton = createTippySingleton(
    '#chord-editor td',
    'data-modal-tooltip',
    MODAL_SINGLETON_PROPS
  );
}

// - Singletons styling

const MODAL_SINGLETON_PROPS = {
  delay: [500, 350],
  moveTransition: 'transform 0.25s ease-out',
  hideOnClick: false,
};

// Tippy tooltips styling
export const MARKERS_SINGLETON_PROPS = {
  delay: [500, 100],
  moveTransition: 'transform 0.2s ease-out',
  hideOnClick: false,
  placement: 'left-start',
  arrow: false,
  offset: [0, -5],
  animation: 'scale-subtle',
  theme: 'custom',
  onShow: function (instance) {
    // Get the tooltip element
    const tooltip = instance.popper.querySelector('.tippy-content');
    // Apply text selection behavior to the tooltip content
    tooltip.style.userSelect = 'none';
  },
};

export const COLLAB_CHORD_SELECTION_TIPPY_PROPS = {
  placement: 'bottom',
  trigger: 'manual',
  theme: 'translucent',
};

// NOTE markers singleton is initialized (or updated) in render-annotations every time a new marker is created

// - Delegate instances styling
// export const MARKERS_DELEGATE_PROPS = {
//   placement: 'right-start',
//   maxWidth: '180px',
//   animation: 'scale-subtle',
//   content: reference => reference.getAttribute('data-tooltip'),
//   arrow: false,
//   delay: [150, 0],
//   duration: [100, 0],
// };

export const REGIONS_DELEGATE_PROPS = {
  placement: 'top',
  animation: 'none',
  delay: [0, 0],
  duration: [0, 0],
  followCursor: 'horizontal',
  plugins: [followCursor],
};

export function initDelegateInstance(parentEl, targetEl, props) {
  const delegateInstance = delegate(parentEl, {
    target: targetEl,
    content: reference => reference.getAttribute('data-tooltip'),
    theme: 'custom',
    hideOnClick: false,
    moveTransition: 0,
    allowHTML: true,
    onShow: function (instance) {
      // Get the tooltip element
      const tooltip = instance.popper.querySelector('.tippy-content');
      // Apply text selection behavior to the tooltip content
      tooltip.style.userSelect = 'text';
      tooltip.style.textAlign = '';
    },
    ...props,
  });

  return delegateInstance;
}
