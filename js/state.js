// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

export const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export const OPEN_NOTES = [64, 59, 55, 50, 45, 40]; // E4 B3 G3 D3 A2 E2
export const STR_LABELS = ['E','B','G','D','A','E'];
export const STR_STYLE = [
  { w:'1px',    c:'#d4c898' },
  { w:'1.5px',  c:'#c8bc80' },
  { w:'2px',    c:'#bcae6e' },
  { w:'2.5px',  c:'#907848' },
  { w:'3px',    c:'#806838' },
  { w:'3.5px',  c:'#705828' },
];

export const TOTAL_FRETS = 21;
export const INLAY_SINGLE = new Set([3,5,7,9,15,17,19,21]);
export const INLAY_DOUBLE = new Set([12]);

export const CHORD_IV_LABELS = ['R','♭2','2','♭3','3','4','♭5','5','♭6','6','♭7','△7'];

export const PENTA_MAJOR = [0, 2, 4, 7, 9];
export const PENTA_MINOR = [0, 3, 5, 7, 10];

export const DIATONIC_IVS = {
  'Major':  [0,2,4,5,7,9,11],
  'Minor':  [0,2,3,5,7,8,10],
};

export const SCALES = {
  'Major':            { iv: [0,2,4,5,7,9,11],  lb: ['1','2','3','4','5','6','7'] },
  'Natural Minor':    { iv: [0,2,3,5,7,8,10],  lb: ['1','2','♭3','4','5','♭6','♭7'] },
  'Major Pentatonic': { iv: [0,2,4,7,9],        lb: ['1','2','3','5','6'] },
  'Minor Pentatonic': { iv: [0,3,5,7,10],       lb: ['1','♭3','4','5','♭7'] },
  'Blues':            { iv: [0,3,5,6,7,10],     lb: ['1','♭3','4','♭5','5','♭7'] },
  'Dorian':           { iv: [0,2,3,5,7,9,10],  lb: ['1','2','♭3','4','5','6','♭7'] },
  'Mixolydian':       { iv: [0,2,4,5,7,9,10],  lb: ['1','2','3','4','5','6','♭7'] },
};

export const CHORD_TYPES = [
  { s: 'maj9',  iv: [0,2,4,7,11] },
  { s: '9',     iv: [0,2,4,7,10] },
  { s: 'm9',    iv: [0,2,3,7,10] },
  { s: 'maj7',  iv: [0,4,7,11] },
  { s: 'm7',    iv: [0,3,7,10] },
  { s: '7',     iv: [0,4,7,10] },
  { s: 'm7b5',  iv: [0,3,6,10] },
  { s: 'dim7',  iv: [0,3,6,9] },
  { s: 'add9',  iv: [0,2,4,7] },
  { s: '6',     iv: [0,4,7,9] },
  { s: 'm6',    iv: [0,3,7,9] },
  { s: 'aug',   iv: [0,4,8] },
  { s: 'dim',   iv: [0,3,6] },
  { s: 'sus4',  iv: [0,5,7] },
  { s: 'sus2',  iv: [0,2,7] },
  { s: 'm',     iv: [0,3,7] },
  { s: '',      iv: [0,4,7] },
];

export const STR_ROOT_PC = [4, 9]; // E(6th)=4, A(5th)=9

// ═══════════════════════════════════════════════════════════
// SHARED MUTABLE STATE
// ═══════════════════════════════════════════════════════════

export const S = {
  masterKeyRoot: 'C',
  masterKeyMode: 'Major',
  syncOffset: 0,

  showNoteNames: false,
  pentatonicMode: false,
  grayMode: false,
  chordOnlyMode: false,
  preNonDMode: false,
  approachNoteMode: false,
  withPentaMode: false,
  songMapVisible: false,

  midiData: null,
  midiChordEvents: [],
  currentChordInfo: null,
  nextChordInfo: null,
  currentEventIdx: -1,
  chordMode: false,
  rafId: null,
  lastEventTime: -1,
  songSections: [],

  ytPlayer: null,
  videoMode: 'youtube',

  currentMidiFile: null,
  currentVideoSource: null,

  improvVisible: false,
  improvTab: 'timeline',
  arpPatternIdx: 0,
  voicingPrefs: {},
  lastSelectedBaseFret: 5,
  improvChordMode: false,

  loopA: -1,
  loopB: -1,
  loopActive: false,
};
