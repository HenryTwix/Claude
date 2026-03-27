import { NOTE_NAMES, S } from './state.js';
import { getDiatonicSet, getChordRomanNumeral } from './theory.js';

const CHUNK_SIZE = 4;
let _lastScActiveIdx = -1;

export function resetScActiveIdx() { _lastScActiveIdx = -1; }

export function detectSongSections(events) {
  if (!events.length) return [];
  const names = events.map(e => e.chord?.name || '?');
  const chunks = [];
  for (let i = 0; i < names.length; i += CHUNK_SIZE) {
    chunks.push({
      startIdx: i, endIdx: Math.min(i + CHUNK_SIZE - 1, names.length - 1),
      key: names.slice(i, i + CHUNK_SIZE).join('|'),
    });
  }
  const freq = new Map();
  chunks.forEach(c => freq.set(c.key, (freq.get(c.key) || 0) + 1));
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  const labelCandidates = ['Chorus', 'Verse', 'Pre-Chorus', 'Bridge'];
  const patternLabel = new Map();
  sorted.forEach(([key, cnt], i) => {
    patternLabel.set(key, i < labelCandidates.length ? labelCandidates[i] : 'Other');
  });
  const raw = [];
  let cur = null;
  for (const chunk of chunks) {
    const lbl = patternLabel.get(chunk.key) || 'Other';
    if (cur && cur.label === lbl) {
      cur.endIdx = chunk.endIdx;
      cur.endTime = events[chunk.endIdx]?.time ?? cur.endTime;
      cur.chunkCount++;
    } else {
      if (cur) raw.push(cur);
      cur = {
        label: lbl, startIdx: chunk.startIdx, endIdx: chunk.endIdx,
        startTime: events[chunk.startIdx]?.time ?? 0,
        endTime: events[chunk.endIdx]?.time ?? 0,
        patternKey: chunk.key, chunkCount: 1,
      };
    }
  }
  if (cur) raw.push(cur);
  if (raw.length >= 2) {
    if (raw[0].chunkCount <= 2) raw[0].label = 'Intro';
    const last = raw[raw.length - 1];
    if (last.chunkCount <= 2) last.label = 'Outro';
  }
  for (let i = 1; i < raw.length; i++) {
    if (raw[i].label === 'Chorus' && raw[i-1].label === 'Verse' && raw[i-1].chunkCount <= 2)
      raw[i-1].label = 'Pre-Chorus';
  }
  return raw;
}

export function scFnClass(rootPc, notePCs) {
  const diaSet = getDiatonicSet(S.masterKeyRoot, S.masterKeyMode);
  if (notePCs.some(pc => !diaSet.has(pc))) return 'sc-fn-nd';
  const keyRootPc = NOTE_NAMES.indexOf(S.masterKeyRoot);
  const iv = (rootPc - keyRootPc + 12) % 12;
  if (S.masterKeyMode === 'Major') {
    return {0:'sc-fn-I',2:'sc-fn-ii',4:'sc-fn-iii',5:'sc-fn-IV',7:'sc-fn-V',9:'sc-fn-vi',11:'sc-fn-vii'}[iv] || 'sc-fn-unknown';
  } else {
    return {0:'sc-fn-vi',2:'sc-fn-vii',3:'sc-fn-I',5:'sc-fn-ii',7:'sc-fn-V',8:'sc-fn-IV',10:'sc-fn-IV'}[iv] || 'sc-fn-unknown';
  }
}

export function scBadgeClass(label) {
  return {'Intro':'sc-badge-intro','Verse':'sc-badge-verse','Pre-Chorus':'sc-badge-prechorus',
    'Chorus':'sc-badge-chorus','Bridge':'sc-badge-bridge','Outro':'sc-badge-outro'}[label] || 'sc-badge-other';
}

export function buildSongMap() {
  const content = document.getElementById('song-map-content');
  const statsEl = document.getElementById('song-map-stats');
  if (!content) return;
  if (!S.midiChordEvents.length) {
    content.innerHTML = '<span class="text-xs text-gray-600">MIDI 파일을 불러오면 Song Map이 표시됩니다</span>';
    return;
  }
  const diaSet = getDiatonicSet(S.masterKeyRoot, S.masterKeyMode);
  const sections = S.songSections.length ? S.songSections
    : [{ label:'전체', startIdx:0, endIdx:S.midiChordEvents.length-1,
         startTime:0, endTime:S.midiChordEvents[S.midiChordEvents.length-1].time, chunkCount:99 }];
  const rows = sections.map(sec => {
    const events = S.midiChordEvents.slice(sec.startIdx, sec.endIdx + 1);
    const ndCount = events.filter(e => e.notePCs.some(pc => !diaSet.has(pc))).length;
    const ndPct   = events.length ? Math.round(ndCount / events.length * 100) : 0;
    const ndHint  = ndPct > 0
      ? `<span class="sc-nd-hint">⚡ ${ndPct}% non-dia</span>`
      : `<span class="sc-nd-hint sc-nd-clean">✓ diatonic</span>`;
    const dur = sec.endTime - sec.startTime;
    const durStr = dur > 0 ? `${Math.floor(dur/60)}:${String(Math.round(dur%60)).padStart(2,'0')}` : '';
    const cards = events.map((ev, localI) => {
      const globalIdx = sec.startIdx + localI;
      if (!ev.chord) return '';
      const rootName = NOTE_NAMES[ev.chord.rootPc];
      const suffix   = ev.chord.name.replace(rootName, '');
      const rn       = getChordRomanNumeral(ev.chord.rootPc, suffix);
      const fnCls    = scFnClass(ev.chord.rootPc, ev.notePCs);
      const nextTime = S.midiChordEvents[globalIdx + 1]?.time ?? (ev.time + 2);
      const durMs    = Math.min(100, Math.max(54, (nextTime - ev.time) * 16));
      return `<div class="sc-card ${fnCls}" id="sc-card-${globalIdx}" data-sc-idx="${globalIdx}"
                   title="${ev.chord.name} (${rn}) — ${ev.time.toFixed(1)}s" style="min-width:${durMs}px">
        <span class="sc-name">${ev.chord.name}</span><span class="sc-rn">${rn}</span></div>`;
    }).join('');
    return `<div class="sc-section-row"><div class="sc-section-label">
      <span class="sc-section-badge ${scBadgeClass(sec.label)}">${sec.label}</span>
      ${ndHint}${durStr ? `<span style="font-size:10px;color:#4b5563">${durStr}</span>` : ''}
    </div><div class="sc-cards-wrap">${cards}</div></div>`;
  });
  content.innerHTML = rows.join('<hr class="sc-section-divider" style="margin:4px 0;border-color:#1f2937">');
  if (statsEl) {
    const totalNd = S.midiChordEvents.filter(e => e.notePCs.some(pc => !diaSet.has(pc))).length;
    const totalDur = S.midiChordEvents.length ? S.midiChordEvents[S.midiChordEvents.length-1].time.toFixed(0) : 0;
    const uniqChords = new Set(S.midiChordEvents.map(e => e.chord?.name).filter(Boolean)).size;
    statsEl.innerHTML = `<span><strong>${S.midiChordEvents.length}</strong> 코드</span>` +
      `<span><strong>${uniqChords}</strong> 종류</span><span><strong>${sections.length}</strong> 섹션</span>` +
      `<span><strong>${totalNd}</strong> 논-다이아</span>` +
      `<span><strong>${Math.floor(+totalDur/60)}:${String(+totalDur%60).padStart(2,'0')}</strong></span>`;
    statsEl.classList.remove('hidden');
  }
}

export function updateSongMapHighlight(idx) {
  if (!S.songMapVisible || idx === _lastScActiveIdx) return;
  if (_lastScActiveIdx >= 0) {
    const prev = document.getElementById(`sc-card-${_lastScActiveIdx}`);
    if (prev) prev.classList.remove('sc-active');
  }
  const card = document.getElementById(`sc-card-${idx}`);
  if (card) {
    card.classList.add('sc-active');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
  _lastScActiveIdx = idx;
}
