import { NOTE_NAMES, STR_ROOT_PC, S } from './state.js';

const VOICING_PREFS_KEY = 'chordSyncVoicingPrefs';

let _onVoicingChange = null;
export function onVoicingChange(cb) { _onVoicingChange = cb; }

export const VOICING_SHAPES = {
  '': [
    { name:'E형 바레', rel:[0,0,2,2,1,0], rootStr:0, barre:true },
    { name:'A형 바레', rel:[-1,0,2,2,2,0], rootStr:1, barre:true },
    { name:'C형', rel:[-1,0,2,0,1,0], rootStr:1, barre:false },
  ],
  'm': [
    { name:'Em형 바레', rel:[0,0,2,2,0,0], rootStr:0, barre:true },
    { name:'Am형 바레', rel:[-1,0,2,2,1,0], rootStr:1, barre:true },
  ],
  '7': [
    { name:'E7형', rel:[0,0,2,0,1,0], rootStr:0, barre:true },
    { name:'A7형', rel:[-1,0,2,0,2,0], rootStr:1, barre:true },
  ],
  'maj7': [
    { name:'Emaj7형', rel:[0,0,2,1,1,0], rootStr:0, barre:true },
    { name:'Amaj7형', rel:[-1,0,2,1,2,0], rootStr:1, barre:true },
  ],
  'm7': [
    { name:'Em7형', rel:[0,0,2,0,0,0], rootStr:0, barre:true },
    { name:'Am7형', rel:[-1,0,2,0,1,0], rootStr:1, barre:true },
  ],
  'm7b5': [{ name:'A형', rel:[-1,0,1,0,1,-1], rootStr:1, barre:false }],
  'dim7':  [{ name:'5현근음', rel:[-1,0,1,2,1,-1], rootStr:1, barre:false }],
  'dim':   [{ name:'5현근음', rel:[-1,0,1,2,1,-1], rootStr:1, barre:false }],
  'aug':   [{ name:'A형', rel:[-1,0,3,2,2,-1], rootStr:1, barre:false }],
  'sus4': [
    { name:'E형', rel:[0,0,2,2,2,0], rootStr:0, barre:true },
    { name:'A형', rel:[-1,0,2,2,3,0], rootStr:1, barre:true },
  ],
  'sus2': [
    { name:'E형', rel:[0,0,2,2,0,0], rootStr:0, barre:true },
    { name:'A형', rel:[-1,0,2,2,0,0], rootStr:1, barre:true },
  ],
  '6':    [{ name:'E6형', rel:[0,0,2,1,2,0], rootStr:0, barre:true }],
  'm6':   [{ name:'Em6형', rel:[0,0,2,0,2,0], rootStr:0, barre:true }],
  '9':    [{ name:'A9형', rel:[-1,0,2,1,2,0], rootStr:1, barre:true }],
  'maj9': [{ name:'Amaj9형', rel:[-1,0,2,1,0,0], rootStr:1, barre:true }],
  'm9':   [{ name:'Am9형', rel:[-1,0,2,0,0,0], rootStr:1, barre:true }],
  'add9': [{ name:'E형', rel:[0,0,2,2,1,2], rootStr:0, barre:false }],
};

export function getBaseFret(rootPc, rootStr) {
  return (rootPc - STR_ROOT_PC[rootStr] + 12) % 12;
}

export function getVoicingsForChord(chordName, rootPc) {
  const rootName = NOTE_NAMES[rootPc];
  let suffix = chordName.replace(rootName, '');
  if (!VOICING_SHAPES[suffix]) {
    if (suffix === 'M7' || suffix === 'Maj7') suffix = 'maj7';
    else if (suffix === 'min' || suffix === 'Min') suffix = 'm';
    else if (suffix === 'min7') suffix = 'm7';
    else suffix = '';
  }
  const shapes = VOICING_SHAPES[suffix] || VOICING_SHAPES[''];
  return shapes.map(shape => {
    const base = getBaseFret(rootPc, shape.rootStr);
    const frets = shape.rel.map(r => r < 0 ? -1 : r + base);
    return { name: shape.name, frets, baseFret: base, barre: shape.barre && base > 0 };
  });
}

export function pickBestVoicing(chordName, rootPc) {
  const voicings = getVoicingsForChord(chordName, rootPc);
  if (!voicings.length) return { voicing: null, index: 0 };
  if (S.voicingPrefs[chordName] != null && S.voicingPrefs[chordName] < voicings.length) {
    const idx = S.voicingPrefs[chordName];
    return { voicing: voicings[idx], index: idx };
  }
  let bestIdx = 0, bestDist = Infinity;
  voicings.forEach((v, i) => {
    const dist = Math.abs(v.baseFret - S.lastSelectedBaseFret);
    if (dist < bestDist) { bestDist = dist; bestIdx = i; }
  });
  return { voicing: voicings[bestIdx], index: bestIdx };
}

export function renderVoicingSVG(voicing, compact = false) {
  const { frets, baseFret, barre } = voicing;
  const W = compact ? 90 : 120, H = compact ? 110 : 148;
  const padL = compact ? 18 : 22, padR = compact ? 8 : 10, padT = compact ? 22 : 28, padB = 6;
  const strW = (W - padL - padR) / 5;
  const fretH = (H - padT - padB) / 4;
  const dotR = compact ? 6.5 : 8.5;
  const openR = compact ? 4 : 5.5;
  const openNutR = compact ? 3.5 : 4.5;
  const fsNum = compact ? 9 : 12;
  const fsDot = compact ? 8 : 10;
  const fsX = compact ? 10 : 13;
  const barreH = compact ? 11 : 14;
  const minFret = Math.max(1, Math.min(...frets.filter(f => f > 0)));
  const startFret = barre ? baseFret : (minFret <= 2 ? 1 : minFret);
  const isOpenPos = startFret <= 1;
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`;
  for (let i = 0; i <= 4; i++) {
    const y = padT + i * fretH;
    const thick = (i === 0 && isOpenPos) ? 3 : 1;
    svg += `<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#555" stroke-width="${thick}"/>`;
  }
  for (let s = 0; s < 6; s++) {
    const x = padL + s * strW;
    svg += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT + 4*fretH}" stroke="#888" stroke-width="${s >= 4 ? 1.5 : 1}"/>`;
  }
  if (!isOpenPos) svg += `<text x="2" y="${padT + fretH/2 + 4}" font-size="${fsNum}" fill="#888" font-weight="bold">${startFret}</text>`;
  if (barre) {
    const barreY = padT + fretH * 0.5;
    const firstStr = frets.indexOf(baseFret);
    const lastStr  = frets.lastIndexOf(baseFret);
    if (firstStr >= 0 && lastStr > firstStr)
      svg += `<rect x="${padL + firstStr * strW - 5}" y="${barreY - barreH/2}" width="${(lastStr - firstStr) * strW + 10}" height="${barreH}" rx="${barreH/2}" fill="#e5e7eb" opacity="0.9"/>`;
  }
  for (let s = 0; s < 6; s++) {
    const x = padL + s * strW;
    const f = frets[s];
    if (f < 0) {
      svg += `<text x="${x}" y="${padT - 5}" text-anchor="middle" font-size="${fsX}" fill="#666" font-weight="bold">×</text>`;
    } else if (f === 0) {
      svg += `<circle cx="${x}" cy="${padT - 8}" r="${openR}" fill="none" stroke="#888" stroke-width="1.5"/>`;
    } else {
      const relFret = f - startFret;
      if (relFret >= 0 && relFret < 4) {
        const cy = padT + relFret * fretH + fretH * 0.5;
        const isRoot = (s === 0 || s === 1) && f === baseFret;
        svg += `<circle cx="${x}" cy="${cy}" r="${dotR}" fill="${isRoot ? '#dc2626' : '#e5e7eb'}"/>`;
        if (isRoot) svg += `<text x="${x}" y="${cy + fsDot*0.35}" text-anchor="middle" font-size="${fsDot}" fill="#fff" font-weight="bold">R</text>`;
      }
    }
    if (f === 0 && isOpenPos) {
      svg += `<circle cx="${x}" cy="${padT + fretH * 0.1}" r="${openNutR}" fill="#666"/>`;
    }
  }
  svg += `</svg>`;
  return svg;
}

export function loadVoicingPrefs() {
  if (!S.currentMidiFile) { S.voicingPrefs = {}; return; }
  try {
    const all = JSON.parse(localStorage.getItem(VOICING_PREFS_KEY)) || {};
    S.voicingPrefs = all[S.currentMidiFile.name] || {};
  } catch { S.voicingPrefs = {}; }
}

export function saveVoicingPrefs() {
  if (!S.currentMidiFile) return;
  try {
    const all = JSON.parse(localStorage.getItem(VOICING_PREFS_KEY)) || {};
    all[S.currentMidiFile.name] = S.voicingPrefs;
    const keys = Object.keys(all);
    if (keys.length > 20) delete all[keys[0]];
    localStorage.setItem(VOICING_PREFS_KEY, JSON.stringify(all));
  } catch (e) { console.warn('Voicing prefs save failed:', e); }
}

export function setVoicingPref(chordName, voicingIdx) {
  S.voicingPrefs[chordName] = voicingIdx;
  saveVoicingPrefs();
  if (_onVoicingChange) _onVoicingChange();
}
