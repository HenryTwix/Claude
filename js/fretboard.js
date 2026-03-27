import { OPEN_NOTES, STR_LABELS, STR_STYLE, TOTAL_FRETS, INLAY_SINGLE, INLAY_DOUBLE,
         NOTE_NAMES, SCALES, CHORD_IV_LABELS, PENTA_MAJOR, PENTA_MINOR, S } from './state.js';
import { getDiatonicSet } from './theory.js';
import { pickBestVoicing } from './voicing.js';

let fbCells  = [];
let fbCells2 = [];

export function fretFlex(f) {
  return f === 0 ? 0.4 : 1 / Math.pow(2, (f - 1) / 12);
}

export function _buildFretboard(containerId, prefix) {
  const fretCols = Array.from({ length: TOTAL_FRETS },
    (_, i) => `${fretFlex(i + 1).toFixed(4)}fr`
  ).join(' ');
  const gridCols = `32px 34px ${fretCols}`;
  const parts = [];
  parts.push(`<div id="${prefix}-inner" style="grid-template-columns:${gridCols}">`);
  parts.push('<div class="fb-slabel"></div>');
  parts.push('<div class="fb-hdr-open"></div>');
  for (let f = 1; f <= TOTAL_FRETS; f++)
    parts.push(`<div class="fb-hdr-cell"><span class="fnum">${f}</span></div>`);
  for (let s = 0; s < 6; s++) {
    const { w, c } = STR_STYLE[s];
    const sc = `--sw:${w};--sc:${c}`;
    parts.push(`<div class="fb-str-label" style="${sc}">${STR_LABELS[s]}</div>`);
    parts.push(`<div id="${prefix}-s${s}-f0" class="fb-str-open" style="${sc}"></div>`);
    for (let f = 1; f <= TOTAL_FRETS; f++)
      parts.push(`<div id="${prefix}-s${s}-f${f}" class="fb-str-cell" style="${sc}"></div>`);
  }
  parts.push('<div class="fb-slabel"></div>');
  parts.push('<div class="fb-inlay-open"></div>');
  for (let f = 1; f <= TOTAL_FRETS; f++) {
    let dot = '';
    if (INLAY_DOUBLE.has(f))
      dot = '<div class="idouble"><div class="idot"></div><div class="idot"></div></div>';
    else if (INLAY_SINGLE.has(f))
      dot = '<div class="idot"></div>';
    parts.push(`<div class="fb-inlay-cell">${dot}</div>`);
  }
  parts.push('</div>');
  document.getElementById(containerId).innerHTML = parts.join('');
  const cells = [];
  for (let s = 0; s < 6; s++) {
    cells[s] = [];
    for (let f = 0; f <= TOTAL_FRETS; f++)
      cells[s][f] = document.getElementById(`${prefix}-s${s}-f${f}`);
  }
  return cells;
}

export function buildFretboard()  { fbCells  = _buildFretboard('fretboard',  'fb');  }
export function buildFretboard2() { fbCells2 = _buildFretboard('fretboard2', 'fb2'); }

export function _renderCells(cells, chordInfoParam, ghostPCSet = null) {
  const inChordMode = S.chordMode && chordInfoParam;
  const chordRootPc    = inChordMode ? chordInfoParam.rootPc : -1;
  const chordNotePCSet = inChordMode ? new Set(chordInfoParam.notePCs) : null;
  const diatonicSet    = inChordMode ? getDiatonicSet(S.masterKeyRoot, S.masterKeyMode) : null;
  const scaleRootIdx   = inChordMode ? -1 : NOTE_NAMES.indexOf(S.masterKeyRoot);
  const scaleData      = inChordMode ? null : SCALES[S.masterKeyMode === 'Minor' ? 'Natural Minor' : 'Major'];
  let pentaSet = null;
  if (S.pentatonicMode || S.withPentaMode) {
    const pentaRoot = NOTE_NAMES.indexOf(S.masterKeyRoot);
    const pentaIvs = S.masterKeyMode === 'Minor' ? PENTA_MINOR : PENTA_MAJOR;
    pentaSet = new Set(pentaIvs.map(iv => (pentaRoot + iv) % 12));
  }
  const chordHasNonDiatonic = inChordMode && diatonicSet &&
    [...chordNotePCSet].some(pc => !diatonicSet.has(pc));
  const pentaClashSet = new Set();
  if ((S.pentatonicMode || S.withPentaMode) && chordHasNonDiatonic) {
    for (const ct of chordNotePCSet) {
      if (!diatonicSet.has(ct)) {
        pentaClashSet.add((ct + 1) % 12);
        pentaClashSet.add((ct - 1 + 12) % 12);
      }
    }
  }
  const replacedDiatonic = new Set();
  if (inChordMode && !S.pentatonicMode && !S.withPentaMode) {
    for (const pc of chordNotePCSet) {
      if (pc !== chordRootPc && !diatonicSet.has(pc)) {
        const up   = (pc + 1) % 12;
        const down = (pc - 1 + 12) % 12;
        if (diatonicSet.has(up))   replacedDiatonic.add(up);
        if (diatonicSet.has(down)) replacedDiatonic.add(down);
      }
    }
  }
  for (let s = 0; s < 6; s++) {
    for (let f = 0; f <= TOTAL_FRETS; f++) {
      const cell = cells[s]?.[f];
      if (!cell) continue;
      const noteIdx = (OPEN_NOTES[s] + f) % 12;
      let dotHtml = '';
      if (S.withPentaMode) {
        const mkRoot = NOTE_NAMES.indexOf(S.masterKeyRoot);
        const isRoot = noteIdx === mkRoot;
        const isPenta = pentaSet.has(noteIdx);
        const isDia   = diatonicSet ? diatonicSet.has(noteIdx) : false;
        const isNonDia = inChordMode && chordNotePCSet?.has(noteIdx) && !isDia;
        const label = S.showNoteNames ? NOTE_NAMES[noteIdx]
          : (isRoot ? 'R' : CHORD_IV_LABELS[(noteIdx - mkRoot + 12) % 12]);
        if (isRoot) dotHtml = `<div class="ndot root">${label}</div>`;
        else if (isNonDia) dotHtml = `<div class="ndot wp-nondiatonic">${label}</div>`;
        else if (isPenta && chordHasNonDiatonic && chordNotePCSet.has(noteIdx) && !isDia) dotHtml = `<div class="ndot penta-match">${label}</div>`;
        else if (isPenta && chordHasNonDiatonic && pentaClashSet.has(noteIdx)) dotHtml = `<div class="ndot wp-penta-avoid">${label}</div>`;
        else if (isPenta) dotHtml = `<div class="ndot wp-penta">${label}</div>`;
        else if (isDia && chordHasNonDiatonic && pentaClashSet.has(noteIdx)) dotHtml = `<div class="ndot wp-scale-avoid">${label}</div>`;
        else if (isDia) dotHtml = `<div class="ndot wp-scale">${label}</div>`;
      } else if (S.pentatonicMode) {
        if (pentaSet.has(noteIdx)) {
          const pentaRoot = NOTE_NAMES.indexOf(S.masterKeyRoot);
          const isRoot = noteIdx === pentaRoot;
          const label = S.showNoteNames ? NOTE_NAMES[noteIdx]
            : (isRoot ? 'R' : CHORD_IV_LABELS[(noteIdx - pentaRoot + 12) % 12]);
          if (isRoot) dotHtml = `<div class="ndot root">${label}</div>`;
          else if (chordHasNonDiatonic && chordNotePCSet.has(noteIdx) && diatonicSet && !diatonicSet.has(noteIdx)) dotHtml = `<div class="ndot penta-match">${label}</div>`;
          else if (chordHasNonDiatonic && pentaClashSet.has(noteIdx)) dotHtml = `<div class="ndot penta-avoid">${label}</div>`;
          else dotHtml = `<div class="ndot penta">${label}</div>`;
        }
      } else if (inChordMode) {
        const ivLabel   = CHORD_IV_LABELS[(noteIdx - chordRootPc + 12) % 12];
        const label     = S.showNoteNames ? NOTE_NAMES[noteIdx] : ivLabel;
        const rootLabel = S.showNoteNames ? NOTE_NAMES[noteIdx] : 'R';
        const isChordTone = chordNotePCSet.has(noteIdx);
        const isDiatonic  = diatonicSet.has(noteIdx);
        const isReplaced  = replacedDiatonic.has(noteIdx);
        if (noteIdx === chordRootPc) {
          const rootNonDia = !diatonicSet.has(noteIdx);
          dotHtml = `<div class="ndot ${rootNonDia ? 'root-nondiatonic' : 'root'}">${rootLabel}</div>`;
        } else if (isChordTone && !isDiatonic) dotHtml = `<div class="ndot nondiatonic">${label}</div>`;
        else if (isChordTone) dotHtml = `<div class="ndot chord">${label}</div>`;
        else if (isDiatonic && !isReplaced) dotHtml = `<div class="ndot tone">${label}</div>`;
      } else {
        const diff = ((noteIdx - scaleRootIdx) % 12 + 12) % 12;
        const pos  = scaleData.iv.indexOf(diff);
        if (pos !== -1) {
          const label = S.showNoteNames ? NOTE_NAMES[noteIdx] : scaleData.lb[pos];
          dotHtml = `<div class="ndot ${diff === 0 ? 'root' : 'tone'}">${label}</div>`;
        }
      }
      if (S.chordOnlyMode && dotHtml) {
        const isChordRelated = dotHtml.includes('root') || dotHtml.includes('chord') || dotHtml.includes('nondiatonic');
        if (!isChordRelated) dotHtml = '';
      }
      if (S.grayMode && !S.withPentaMode && dotHtml && !dotHtml.includes('nondiatonic') && !dotHtml.includes('root'))
        dotHtml = dotHtml.replace(/class="ndot [^"]*"/, 'class="ndot gray"');
      if (ghostPCSet?.has(noteIdx) && !dotHtml) {
        const label = S.showNoteNames ? NOTE_NAMES[noteIdx] : '·';
        dotHtml = `<div class="ndot ghost">${label}</div>`;
      }
      if (S.approachNoteMode && !dotHtml && inChordMode && chordNotePCSet) {
        if (chordNotePCSet.has((noteIdx + 1) % 12)) {
          const label = S.showNoteNames ? NOTE_NAMES[noteIdx] : '→';
          dotHtml = `<div class="ndot approach">${label}</div>`;
        }
      }
      if (cell.innerHTML !== dotHtml) cell.innerHTML = dotHtml;
    }
  }
}

function _renderVoicingCells(cells, chordInfo) {
  const { voicing } = pickBestVoicing(chordInfo.name, chordInfo.rootPc);
  if (!voicing) { _renderCells(cells, chordInfo); return; }
  const frets = voicing.frets;
  for (let s = 0; s < 6; s++) {
    for (let f = 0; f <= TOTAL_FRETS; f++) {
      const cell = cells[s]?.[f];
      if (!cell) continue;
      let dotHtml = '';
      if (f === 0) {
        if (frets[s] === -1) dotHtml = '<div class="ndot vc-muted">\u00d7</div>';
        else if (frets[s] === 0) {
          const noteIdx = OPEN_NOTES[s] % 12;
          const isRoot = noteIdx === chordInfo.rootPc;
          const label = S.showNoteNames ? NOTE_NAMES[noteIdx]
            : (isRoot ? 'R' : CHORD_IV_LABELS[(noteIdx - chordInfo.rootPc + 12) % 12]);
          dotHtml = `<div class="ndot ${isRoot ? 'vc-root' : 'vc-open'}">${label}</div>`;
        }
      } else if (frets[s] === f) {
        const noteIdx = (OPEN_NOTES[s] + f) % 12;
        const isRoot = noteIdx === chordInfo.rootPc;
        const label = S.showNoteNames ? NOTE_NAMES[noteIdx]
          : (isRoot ? 'R' : CHORD_IV_LABELS[(noteIdx - chordInfo.rootPc + 12) % 12]);
        dotHtml = `<div class="ndot ${isRoot ? 'vc-root' : 'vc-finger'}">${label}</div>`;
      }
      if (cell.innerHTML !== dotHtml) cell.innerHTML = dotHtml;
    }
  }
}

export function renderFretboard() {
  const inChordMode = S.chordMode && S.currentChordInfo;
  if (!inChordMode) {
    document.getElementById('chord-badge').textContent =
      `${S.masterKeyRoot} ${S.masterKeyMode === 'Minor' ? 'Natural Minor' : 'Major'}`;
  }
  if (S.improvChordMode && S.improvVisible && inChordMode) {
    _renderVoicingCells(fbCells, S.currentChordInfo);
    return;
  }
  let ghostPCSet = null;
  if (S.preNonDMode && inChordMode && S.nextChordInfo) {
    const diatonicSet = getDiatonicSet(S.masterKeyRoot, S.masterKeyMode);
    const nextIsNonDiatonic = S.nextChordInfo.notePCs.some(pc => !diatonicSet.has(pc));
    if (nextIsNonDiatonic) {
      const nonDiaNext = S.nextChordInfo.notePCs.filter(pc => !diatonicSet.has(pc));
      if (S.pentatonicMode) {
        const pentaRoot = NOTE_NAMES.indexOf(S.masterKeyRoot);
        const pentaIvs  = S.masterKeyMode === 'Minor' ? PENTA_MINOR : PENTA_MAJOR;
        const pentaSet  = new Set(pentaIvs.map(iv => (pentaRoot + iv) % 12));
        ghostPCSet = new Set(nonDiaNext.filter(pc => pentaSet.has(pc)));
      } else {
        ghostPCSet = new Set(nonDiaNext);
      }
    }
  }
  _renderCells(fbCells, S.currentChordInfo, ghostPCSet);
}

export function renderNextFretboard(nextIdx) {
  const labelEl = document.getElementById('next-chord-label');
  const nextEv  = S.midiChordEvents[nextIdx];
  if (!nextEv?.chord) {
    if (labelEl) labelEl.textContent = '—';
    fbCells2.forEach(row => row?.forEach(c => { if (c) c.innerHTML = ''; }));
    return;
  }
  if (labelEl) {
    labelEl.textContent = nextEv.chord.name;
    const diatonicSet = getDiatonicSet(S.masterKeyRoot, S.masterKeyMode);
    const isNextNonDiatonic = nextEv.notePCs.some(pc => !diatonicSet.has(pc));
    labelEl.className = isNextNonDiatonic
      ? 'text-lg font-bold text-amber-400'
      : 'text-lg font-bold text-gray-400';
  }
  const nextChordInfo = { name: nextEv.chord.name, rootPc: nextEv.chord.rootPc, notePCs: nextEv.notePCs };
  if (S.improvChordMode && S.improvVisible) {
    _renderVoicingCells(fbCells2, nextChordInfo);
    return;
  }
  _renderCells(fbCells2, nextChordInfo);
}
