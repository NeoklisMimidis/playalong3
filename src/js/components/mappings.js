/**
 * Variations Array of Chord Types
 *
 * This array maps chord shorthand notation to various other forms, such as a simplified version, full description, and encoded font representation.
 * The chord shorthands are based on Christopher Harte's format used in MIREX and the analyzed JAMS file.
 *
 * The array contains a total of 67 chord type objects. These include 62 cases from the fonts file and an additional 5 cases (N, X, maj, sus2, sus4).
 *
 * Fields:
 * - `shorthand`: The chord type in shorthand notation (e.g., "N", "maj9").
 * - `simplified`: A simplified or commonly used abbreviation for the chord type. This form is often used as a tooltip label in edit mode.
 * - `description`: The full name description of the chord type, which is also used for tooltips.
 * - `encoded`: The encoded representation of the chord type using a specific font format from SVG_fonts.otf.
 *
 */
export const variations = [
  {
    shorthand: 'N',
    simplified: 'No Chord',
    description: 'No Chord',
    encoded: '<text id="disable-font-label">N.C.</text>',
  },
  {
    shorthand: 'X',
    simplified: 'Unknown',
    description: 'Unknown',
    encoded: '<text id="disable-font-label">??</text>',
  },

  {
    shorthand: 'maj',
    simplified: '',
    description: 'Major',
    encoded: '(M)',
  },
  {
    shorthand: 'maj7',
    simplified: 'M7',
    description: 'Major seventh',
    encoded: 'c',
  },
  {
    shorthand: 'maj9',
    simplified: 'M9',
    description: 'Major ninth',
    encoded: 'd',
  },
  {
    shorthand: 'maj13',
    simplified: 'M13',
    description: 'Major thirteenth',
    encoded: 'e',
  },

  {
    shorthand: 'min',
    simplified: 'm',
    description: 'Minor',
    encoded: 'a',
  },
  {
    shorthand: 'min7',
    simplified: 'm7',
    description: 'Minor seventh',
    encoded: 'b',
  },
  {
    shorthand: 'minmaj7',
    simplified: 'mM7',
    description: 'Minor major seventh',
    encoded: 'f',
  },
  {
    shorthand: 'min9',
    simplified: 'm9',
    description: 'Minor ninth',
    encoded: 'h',
  },
  {
    shorthand: 'minmaj7(9)',
    simplified: 'mM9',
    description: 'Minor major ninth',
    encoded: 'g',
  },
  {
    shorthand: 'min9(11)',
    simplified: 'm11',
    description: 'Minor eleventh',
    encoded: 'i',
  },
  {
    shorthand: 'min9(11,13)',
    simplified: 'm13',
    description: 'Minor thirteenth',
    encoded: '3',
  },
  {
    shorthand: 'aug',
    simplified: 'aug',
    description: 'Augmented',
    encoded: '@',
  },
  {
    shorthand: 'dim',
    simplified: 'dim',
    description: 'Diminished triad',
    encoded: '&gt;', // unicode equivalent '>'
  },
  {
    shorthand: 'dim7',
    simplified: 'dim7',
    description: 'Diminished seventh',
    encoded: '8',
  },
  {
    shorthand: 'hdim7',
    simplified: 'hdim7',
    description: 'Half diminished seventh',
    encoded: 'W',
  },
  {
    shorthand: 'hdim7(b9)',
    simplified: 'hdim9',
    description: 'Half diminished ninth',
    encoded: 'X',
  },
  {
    shorthand: 'hdim7(b9,11)',
    simplified: 'hdim11',
    description: 'Half diminished eleventh',
    encoded: 'Y',
  },

  // -Second Row //

  {
    shorthand: '7',
    simplified: 'dom7',
    description: 'Seventh',
    encoded: '7',
  },
  {
    shorthand: '9',
    simplified: 'dom9',
    description: 'Ninth',
    encoded: '9',
  },
  {
    shorthand: '9(11)',
    simplified: 'dom11',
    description: 'Eleventh',
    encoded: 'Q',
  },
  {
    shorthand: '9(11,13)',
    simplified: 'dom13',
    description: 'Thirteenth',
    encoded: 'U',
  },

  {
    shorthand: 'maj6',
    simplified: 'M6',
    description: 'Major sixth',
    encoded: '6',
  },
  {
    shorthand: 'maj6(9)',
    simplified: 'M6/9',
    description: 'Major sixth ninth',
    encoded: 'k',
  },
  {
    shorthand: 'maj(9)',
    simplified: 'M(add9)',
    description: 'Added ninth',
    encoded: '=',
  },
  {
    shorthand: 'min6',
    simplified: 'm6',
    description: 'Minor sixth',
    encoded: 'j',
  },
  {
    shorthand: 'min(b6)',
    simplified: 'mb6',
    description: 'Minor flat sixth',
    encoded: 'R',
  },
  {
    shorthand: 'min6(9)',
    simplified: 'm6/9',
    description: 'Minor sixth ninth',
    encoded: 'Z',
  },
  {
    shorthand: 'min(9)',
    simplified: 'm(add9)',
    description: 'Minor added ninth',
    encoded: '%',
  },

  {
    shorthand: 'sus2',
    simplified: 'sus2',
    description: 'Suspended second',
    encoded: `4<text id="disable-font-label">2</text>`,
  },
  {
    shorthand: 'sus4',
    simplified: 'sus4',
    description: 'Suspended fourth',
    encoded: `4<text id="disable-font-label">4</text>`,
  },
  {
    shorthand: 'sus4(b7,13)',
    simplified: '7sus4(add13)',
    description: 'Seventh suspended added thirteenth',
    encoded: 'H',
  },
  {
    shorthand: 'sus4(b7)',
    simplified: '7sus4',
    description: 'Seventh suspended fourth',
    encoded: '[',
  },
  {
    shorthand: 'sus4(b7,9)',
    simplified: '9sus4',
    description: 'Ninth suspended fourth',
    encoded: ']',
  },
  {
    shorthand: 'sus4(b7,9,13)',
    simplified: '13sus4',
    description: 'Thirteenth suspended fourth',
    encoded: '&lt;', // unicode equivalent '<'
  },

  // -Third Row //

  {
    shorthand: '7(b7,#5,b9,#9)',
    simplified: '7alt',
    description: 'Altered seventh',
    encoded: '?',
  }, // not specific but one of four choices: #5#9, b5b9, #5b9 or b5#9
  {
    shorthand: '7(b5)',
    simplified: '7b5',
    description: 'Seventh flat fifth',
    encoded: 'p',
  },
  {
    shorthand: '7(#5)',
    simplified: '7#5',
    description: 'Seventh sharp fifth',
    encoded: 'q',
  },
  {
    shorthand: '7(b9,b5)',
    simplified: '7b9b5',
    description: 'Seventh flat fifth flat ninth',
    encoded: 'L',
  },
  {
    shorthand: '7(b9,#5)',
    simplified: '7b9#5',
    description: 'Seventh sharp fifth flat ninth',
    encoded: 'J',
  },
  {
    shorthand: '7(#9,b5)',
    simplified: '7#9b5',
    description: 'Seventh flat fifth sharp ninth',
    encoded: 'O',
  },
  {
    shorthand: '7(#9,#5)',
    simplified: '7#9#5',
    description: 'Seventh sharp fifth sharp ninth',
    encoded: 'M',
  },
  {
    shorthand: '7(b9)',
    simplified: '7b9',
    description: 'Seventh flat ninth',
    encoded: 'S',
  },
  {
    shorthand: '7(#9)',
    simplified: '7#9',
    description: 'Seventh sharp ninth',
    encoded: 's',
  },
  {
    shorthand: '7(b9,#9)',
    simplified: '7b9#9',
    description: 'Seventh flat ninth sharp ninth',
    encoded: 'K',
  },
  {
    shorthand: '7(b9,#11)',
    simplified: '7b9#11',
    description: 'Seventh flat ninth sharp eleventh',
    encoded: 'P',
  },
  {
    shorthand: '7(#9,#11)',
    simplified: '7#9#11',
    description: 'Seventh sharp ninth sharp eleventh',
    encoded: 'N',
  },

  {
    shorthand: '7(#11)',
    simplified: '7#11',
    description: 'Seventh sharp eleventh',
    encoded: 't',
  },
  {
    shorthand: '7(b9,b13)',
    simplified: '7b9b13',
    description: 'Seventh flat ninth flat thirteenth',
    encoded: 'I',
  },
  {
    shorthand: '7(#9,b13)',
    simplified: '7#9b13',
    description: 'Seventh sharp ninth flat thirteenth',
    encoded: '0',
  },
  {
    shorthand: '7(b13)',
    simplified: '7b13',
    description: 'Seventh flat thirteenth',
    encoded: 'm',
  },

  // -Forth Row //

  {
    shorthand: '5',
    simplified: '5',
    description: 'Fifth (or harmonic dyad)',
    encoded: '5',
  },
  {
    shorthand: 'min(#5)',
    simplified: 'm#5',
    description: 'Minor sharp fifth',
    encoded: 'V',
  },
  {
    shorthand: 'sus4(b9)',
    simplified: '7susb9',
    description: 'Seventh suspended flat ninth',
    encoded: 'v',
  },
  {
    shorthand: 'sus4(b13)',
    simplified: '7susb13',
    description: 'Seventh suspended flat thirteenth',
    encoded: 'w',
  },
  {
    shorthand: 'maj7(b5)',
    simplified: 'M7b5',
    description: 'Major seventh flat fifth',
    encoded: '1',
  },
  {
    shorthand: 'maj7(#5)',
    simplified: 'M7#5',
    description: 'Major seventh sharp fifth',
    encoded: 'z',
  },
  {
    shorthand: 'maj7(#11)',
    simplified: 'M7#11',
    description: 'Major seventh sharp eleventh',
    encoded: 'x',
  },
  {
    shorthand: 'maj9(#11)',
    simplified: 'M9#11',
    description: 'Major ninth sharp eleventh',
    encoded: 'y',
  },
  {
    shorthand: '9(b5)',
    simplified: '9b5',
    description: 'Ninth flat fifth',
    encoded: 'T',
  },
  {
    shorthand: '9(#5)',
    simplified: '9#5',
    description: 'Ninth sharp fifth',
    encoded: 'n',
  },
  {
    shorthand: '9(#11)',
    simplified: '9#11',
    description: 'Ninth sharp eleventh',
    encoded: 'r',
  },

  {
    shorthand: '9(11,b13)',
    simplified: '9b13',
    description: 'Ninth flat thirteenth',
    encoded: '2',
  },
  {
    shorthand: '7(b9,11,13)',
    simplified: '13b9',
    description: 'Thirteenth flat ninth',
    encoded: 'u',
  },
  {
    shorthand: '7(#9,11,13)',
    simplified: '13#9',
    description: 'Thirteenth sharp ninth',
    encoded: 'o',
  },
  {
    shorthand: '9(#11,13)',
    simplified: '13#11',
    description: 'Thirteenth sharp eleventh',
    encoded: 'l',
  },
];

/**
 *
 * Accidentals: 2 from fonts file and 1 'Natural' case (3 total)
 *
 * SVG_fonts.otf (fonts file)
 *
 */
export const accidentals = [
  {
    simplified: '#',
    description: 'Sharp',
    encoded: '+',
  },
  {
    simplified: 'b',
    description: 'Flat',
    // encoded: '&',
    encoded: '&amp;',
  },
  {
    simplified: '',
    description: 'Natural',
    encoded: '',
  },
];

/* 
Christopher Harte's chord notation shorthands:
<shorthand> ::= "maj" | "min" | "dim" | "aug" | "maj7" | "min7" | "7"
| "dim7" | "hdim7" | "minmaj7" | "maj6" | "min6" | "9"
| "maj9" | "min9" | "sus2" | "sus4" 
*/

//  (21 + 2 )color combinations || (12 + 2) unique

/**
 * Chord color assignment based on rootNote (root + accidental)
 *
 * 23 (21 + 2) color combinations || 14 (12 + 2) unique
 */
export const chordColor = {
  'B#': 'rgba(255, 87, 51, 0.3)', // Red
  C: 'rgba(255, 87, 51, 0.3)',

  'C#': 'rgba(245, 166, 35, 0.3)', // Orange
  Db: 'rgba(245, 166, 35, 0.3)',

  D: 'rgba(252, 219, 0, 0.3)', // Yellow

  'D#': 'rgba(208, 223, 82, 0.3)', // Lime green
  Eb: 'rgba(208, 223, 82, 0.3)',

  E: 'rgba(0, 191, 255, 0.3)', // Blue
  Fb: 'rgba(0, 191, 255, 0.3)',

  'E#': 'rgba(0, 127, 255, 0.3)', // Azure
  F: 'rgba(0, 127, 255, 0.3)',

  'F#': 'rgba(127, 0, 255, 0.3)', // Purple
  Gb: 'rgba(127, 0, 255, 0.3)',

  G: 'rgba(232, 62, 140, 0.3)', // Pink

  'G#': 'rgba(220, 53, 69, 0.3)', // Red
  Ab: 'rgba(220, 53, 69, 0.3)',

  A: 'rgba(255, 193, 7, 0.3)', // Amber

  'A#': 'rgba(40, 167, 69, 0.3)', // Green
  Bb: 'rgba(40, 167, 69, 0.3)',

  B: 'rgba(23, 162, 184, 0.3)', // Cyan
  Cb: 'rgba(23, 162, 184, 0.3)', // Cyan

  N: 'rgba(0, 0, 0, 0)',
  X: 'rgba(0, 0, 0, 0.05)',
};

// console.log(Object.keys(chordColor).length);
// console.log(Object.keys(chordColor));
// console.log(chordColor);
