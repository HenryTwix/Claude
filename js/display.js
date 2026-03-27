import { NOTE_NAMES, S } from './state.js';
import { getDiatonicSet, getDiatonicNames, getChordRomanNumeral, getScaleSuggestions } from './theory.js';

export function updateBpmDisplay() {
  const el = document.getElementById('bpm-display');
  const valEl = document.getElementById('bpm-value');
  if (!el || !valEl) return;
  const bpm = S.midiData?.header?.tempos?.[0]?.bpm;
  if (bpm != null) {
    valEl.textContent = Math.round(bpm);
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

export function updateDiatonicPreview() {
  document.getElementById('diatonic-preview').textContent =
    getDiatonicNames(S.masterKeyRoot, S.masterKeyMode).join('  ');
}

export function syncToggleUI() {
  document.getElementById('label-toggle')?.classList.toggle('toggle-on', S.showNoteNames);
  const ltText = document.getElementById('label-toggle-text');
  if (ltText) ltText.textContent = S.showNoteNames ? '음계' : '도수';
  document.getElementById('penta-toggle')?.classList.toggle('toggle-on', S.pentatonicMode);
  document.getElementById('chord-only-toggle')?.classList.toggle('toggle-on', S.chordOnlyMode);
  document.getElementById('pre-nond-toggle')?.classList.toggle('toggle-on', S.preNonDMode);
  document.getElementById('gray-toggle')?.classList.toggle('toggle-on', S.grayMode);
  document.getElementById('approach-toggle')?.classList.toggle('toggle-on', S.approachNoteMode);
  document.getElementById('with-penta-toggle')?.classList.toggle('toggle-on', S.withPentaMode);
  const fb2Shown = !document.getElementById('fretboard2-section')?.classList.contains('hidden');
  document.getElementById('next-fb-toggle')?.classList.toggle('toggle-on', fb2Shown);
  document.getElementById('improv-toggle')?.classList.toggle('toggle-on', S.improvVisible);
  const smBtn = document.getElementById('song-map-toggle');
  if (smBtn) {
    smBtn.textContent = S.songMapVisible ? '▼ Song Map' : '▶ Song Map';
    smBtn.classList.toggle('toggle-on', S.songMapVisible);
  }
}

export function updateUpcomingChords(currentIdx) {
  const container = document.getElementById('upcoming-chords');
  if (!container) return;
  const diatonicSet = getDiatonicSet(S.masterKeyRoot, S.masterKeyMode);
  const sizes    = [20, 17, 15, 13];
  const opacities = [0.75, 0.55, 0.38, 0.22];
  const cards = [];
  for (let i = 1; i <= 4; i++) {
    const ev = S.midiChordEvents[currentIdx + i];
    if (!ev) break;
    const chord = ev.chord;
    if (!chord) continue;
    const isNonDiatonic = ev.notePCs.some(pc => !diatonicSet.has(pc));
    cards.push({ name: chord.name, isNonDiatonic, idx: currentIdx + i });
  }
  container.innerHTML = cards.map((c, i) => `
    <div class="up-card ${c.isNonDiatonic ? 'up-nondiatonic' : 'up-diatonic'}"
         data-sc-idx="${c.idx}"
         style="font-size:${sizes[i]}px;opacity:${opacities[i]};cursor:pointer">
      ${c.name}
    </div>`
  ).join('');
}

export function updateChordDisplay() {
  const nameEl  = document.getElementById('chord-name-display');
  const nonDiEl = document.getElementById('nondiatonic-info');
  const tonesEl = document.getElementById('chord-tones-info');
  const modeLabel = document.getElementById('sync-mode-label');
  const syncDot   = document.getElementById('sync-indicator');

  if (!S.chordMode || !S.currentChordInfo) {
    nameEl.textContent = '—';
    nonDiEl.classList.add('invisible');
    tonesEl.textContent = '';
    modeLabel.textContent = 'Manual Mode';
    const upEl = document.getElementById('upcoming-chords');
    if (upEl) upEl.innerHTML = '';
    syncDot.classList.add('hidden');
    nameEl.parentElement.querySelectorAll('.chord-function-badge').forEach(el => el.remove());
    const ssEl = document.getElementById('scale-suggestion');
    if (ssEl) ssEl.classList.add('hidden');
    return;
  }

  const diatonicSet = getDiatonicSet(S.masterKeyRoot, S.masterKeyMode);
  const nonDiatonic = S.currentChordInfo.notePCs.filter(pc => !diatonicSet.has(pc));
  nameEl.textContent = S.currentChordInfo.name;
  modeLabel.textContent = 'MIDI Sync';
  syncDot.classList.remove('hidden');

  const rootName = NOTE_NAMES[S.currentChordInfo.rootPc];
  const suffix = S.currentChordInfo.name.replace(rootName, '');
  const romanNumeral = getChordRomanNumeral(S.currentChordInfo.rootPc, suffix);
  const isNonDia = nonDiatonic.length > 0;
  const existingBadge = nameEl.parentElement.querySelector('.chord-function-badge');
  if (existingBadge) existingBadge.remove();
  const badge = document.createElement('span');
  badge.className = `chord-function-badge${isNonDia ? ' fn-nondiatonic' : ''}`;
  badge.textContent = romanNumeral;
  nameEl.parentElement.appendChild(badge);

  tonesEl.textContent = 'Chord tones: ' +
    S.currentChordInfo.notePCs.map(pc => NOTE_NAMES[pc]).join(' · ');

  const ssEl = document.getElementById('scale-suggestion');
  if (ssEl) {
    const suggestions = getScaleSuggestions(S.currentChordInfo.rootPc, suffix, S.currentChordInfo.notePCs);
    const isChromaticOnly = suggestions.every(s => s.includes('크로매틱'));
    ssEl.innerHTML = `<span class="ss-label">💡 추천: </span>` +
      suggestions.map((s, i) =>
        `<span class="ss-item${isChromaticOnly && i === 0 ? ' ss-chromatic' : ''}">${s}</span>`
      ).join('<span style="color:#374151"> · </span>');
    ssEl.classList.remove('hidden');
  }

  if (isNonDia) {
    const names = nonDiatonic.map(pc => NOTE_NAMES[pc]).join(', ');
    nonDiEl.textContent = `Non-Diatonic: ${names} detected`;
    nonDiEl.classList.remove('invisible');
  } else {
    nonDiEl.classList.add('invisible');
  }
}
