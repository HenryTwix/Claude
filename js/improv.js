import { NOTE_NAMES, OPEN_NOTES, CHORD_IV_LABELS, TOTAL_FRETS, S } from './state.js';
import { getDiatonicSet, getChordRomanNumeral } from './theory.js';
import { pickBestVoicing, renderVoicingSVG, getVoicingsForChord } from './voicing.js';

// ── Arpeggio Patterns ────────────────────────────────────
export const ARP_PATTERNS = [
  { name: '상행 아르페지오', fn: n => [...n] },
  { name: '하행 아르페지오', fn: n => [...n].reverse() },
  { name: '상행+하행', fn: n => [...n, ...[...n].reverse().slice(1)] },
  { name: '1-3-5-3 패턴', fn: n => { if(n.length<3) return n; return [n[0],n[2],n[4%n.length],n[2]]; }},
  { name: '스위프 패턴', fn: n => { const r=[]; for(let i=0;i<n.length-2;i++) r.push(n[i],n[i+1],n[i+2]); return r.length?r:n; }},
];

export function getArpeggioNotes(rootPc, notePCs) {
  const notes = [];
  const pcSet = new Set(notePCs);
  for (let s = 5; s >= 0; s--) {
    for (let f = 0; f <= 12; f++) {
      const pc = (OPEN_NOTES[s] + f) % 12;
      if (pcSet.has(pc)) notes.push({ str:s, fret:f, pc, name:NOTE_NAMES[pc], isRoot:pc===rootPc });
    }
  }
  const rootNotes = notes.filter(n => n.isRoot);
  if (!rootNotes.length) return notes.slice(0, 8);
  const lowRoot = rootNotes.find(n => n.str >= 3) || rootNotes[0];
  const startIdx = notes.indexOf(lowRoot);
  const oneOctave = notes.slice(startIdx, startIdx + 8);
  return oneOctave.length >= 3 ? oneOctave : notes.slice(0, 8);
}

export function renderArpTab(rootPc, notePCs) {
  const baseNotes = getArpeggioNotes(rootPc, notePCs);
  if (!baseNotes.length) return '';
  const pattern = ARP_PATTERNS[S.arpPatternIdx % ARP_PATTERNS.length];
  const ordered = pattern.fn(baseNotes);
  const strLabels = ['e|','B|','G|','D|','A|','E|'];
  const lines = Array.from({length:6}, () => []);
  for (const note of ordered) {
    for (let s = 0; s < 6; s++) {
      if (s === note.str) {
        const fStr = String(note.fret).padStart(2,'-');
        if (note.isRoot) lines[s].push(`<span class="arp-root">${fStr}</span>`);
        else if (!getDiatonicSet(S.masterKeyRoot,S.masterKeyMode).has(note.pc)) lines[s].push(`<span class="arp-highlight">${fStr}</span>`);
        else lines[s].push(fStr);
      } else lines[s].push('--');
    }
  }
  return strLabels.map((l,i) => l + lines[i].join('-') + '-|').join('\n');
}

// ── Lick Library ────────────────────────────────────────
export const LICK_LIBRARY = {
  minor: [
    { name:'마이너 펜타 하강 런', style:'Blues/Rock', difficulty:'★★☆', desc:'마이너 펜타토닉 박스1 하강 라인.', refRootPc:9,
      notes:[{s:0,f:8,mod:'b'},{s:0,f:5,mod:''},{s:1,f:8,mod:''},{s:1,f:5,mod:''},{s:2,f:7,mod:''},{s:2,f:5,mod:''},{s:3,f:7,mod:''},{s:3,f:5,mod:''}] },
    { name:'BB King 스타일 쵸킹', style:'Blues', difficulty:'★★★', desc:'1현 벤딩+3현 근음 결합.', refRootPc:9,
      notes:[{s:2,f:7,mod:''},{s:1,f:5,mod:''},{s:0,f:8,mod:'b'},{s:0,f:5,mod:''},{s:1,f:8,mod:''},{s:2,f:7,mod:''}] },
    { name:'도리안 장6도 강조', style:'Jazz/Fusion', difficulty:'★★★', desc:'도리안의 특징음(장6도)을 강조.', refRootPc:9,
      notes:[{s:2,f:5,mod:''},{s:2,f:7,mod:''},{s:1,f:5,mod:''},{s:1,f:7,mod:''},{s:1,f:9,mod:''},{s:0,f:5,mod:''},{s:0,f:7,mod:''}] },
    { name:'마이너 트리플렛 런', style:'Rock', difficulty:'★★★', desc:'3연음 패턴으로 속도감 있는 런.', refRootPc:9,
      notes:[{s:1,f:8,mod:''},{s:1,f:5,mod:''},{s:2,f:7,mod:''},{s:2,f:5,mod:''},{s:3,f:7,mod:''},{s:3,f:5,mod:''},{s:3,f:7,mod:''},{s:2,f:5,mod:''},{s:1,f:5,mod:''}] },
  ],
  major: [
    { name:'메이저 펜타 컨트리 런', style:'Country/Rock', difficulty:'★★☆', desc:'메이저 펜타토닉 밝은 라인.', refRootPc:9,
      notes:[{s:1,f:5,mod:''},{s:1,f:7,mod:'b'},{s:1,f:5,mod:''},{s:2,f:6,mod:''},{s:2,f:7,mod:''},{s:3,f:7,mod:''},{s:3,f:9,mod:''}] },
    { name:'척 베리 스타일 메이저 릭', style:'Rock/R&B', difficulty:'★★☆', desc:'6도를 강조하는 척 베리 스타일.', refRootPc:9,
      notes:[{s:3,f:7,mod:''},{s:2,f:6,mod:'h'},{s:2,f:7,mod:''},{s:1,f:5,mod:''},{s:1,f:7,mod:''},{s:0,f:5,mod:'h'},{s:0,f:7,mod:''}] },
    { name:'리디안 #4 색깔 릭', style:'Rock/Neo-Soul', difficulty:'★★★', desc:'리디안의 특징음(#4)를 살짝 스치는 몽환적 릭.', refRootPc:9,
      notes:[{s:3,f:7,mod:''},{s:2,f:7,mod:''},{s:2,f:8,mod:'b'},{s:2,f:6,mod:''},{s:1,f:5,mod:''},{s:1,f:7,mod:''},{s:0,f:5,mod:''}] },
  ],
  dom7: [
    { name:'블루스 박스 릭', style:'Blues', difficulty:'★★☆', desc:'블루 노트(♭5)를 경유하는 핵심 블루스 릭.', refRootPc:9,
      notes:[{s:2,f:5,mod:''},{s:2,f:6,mod:''},{s:2,f:7,mod:'b'},{s:1,f:5,mod:'b'},{s:1,f:5,mod:''},{s:2,f:7,mod:''},{s:2,f:5,mod:''}] },
    { name:'믹솔리디안 ♭7 런', style:'Rock/Funk', difficulty:'★★★', desc:'믹솔리디안의 ♭7도를 강조.', refRootPc:9,
      notes:[{s:0,f:5,mod:''},{s:0,f:7,mod:''},{s:0,f:8,mod:''},{s:0,f:10,mod:'b'},{s:0,f:8,mod:''},{s:1,f:8,mod:''},{s:1,f:7,mod:''}] },
    { name:'SRV 스타일 파워 쵸킹', style:'Texas Blues', difficulty:'★★★', desc:'SRV 특유의 파워풀한 더블 벤딩.', refRootPc:9,
      notes:[{s:1,f:8,mod:'b'},{s:1,f:5,mod:''},{s:0,f:8,mod:'b'},{s:0,f:5,mod:''},{s:1,f:5,mod:''},{s:2,f:7,mod:''}] },
    { name:'홀 톤 스케일 릭', style:'Jazz/Blues', difficulty:'★★★', desc:'홀 톤 스케일로 도미넌트 위에서 몽환적 긴장감.', refRootPc:9,
      notes:[{s:2,f:7,mod:''},{s:2,f:9,mod:''},{s:1,f:5,mod:''},{s:1,f:7,mod:''},{s:1,f:9,mod:''},{s:0,f:5,mod:'h'},{s:0,f:7,mod:''},{s:0,f:9,mod:'b'}] },
  ],
  dim: [
    { name:'디미니시드 아르페지오 런', style:'Classical/Metal', difficulty:'★★★', desc:'dim7의 대칭 구조를 활용한 빠른 아르페지오.', refRootPc:9,
      notes:[{s:3,f:5,mod:''},{s:3,f:8,mod:''},{s:2,f:5,mod:''},{s:2,f:8,mod:''},{s:1,f:5,mod:''},{s:1,f:9,mod:''},{s:0,f:5,mod:''}] },
  ],
  nondiatonic: [
    { name:'크로매틱 어프로치 노트', style:'Jazz/Bebop', difficulty:'★★★', desc:'코드톤 반음 아래에서 접근하는 크로매틱 어프로치.', refRootPc:9,
      notes:[{s:3,f:4,mod:'h'},{s:3,f:5,mod:''},{s:2,f:6,mod:'h'},{s:2,f:7,mod:''},{s:1,f:4,mod:'h'},{s:1,f:5,mod:''},{s:0,f:4,mod:'h'},{s:0,f:5,mod:''}] },
    { name:'보로우드 코드 마이너 펜타', style:'Rock', difficulty:'★★☆', desc:'논-다이아토닉 코드 위에서 해당 코드 루트의 마이너 펜타 사용.', refRootPc:9,
      notes:[{s:2,f:5,mod:''},{s:2,f:7,mod:''},{s:1,f:5,mod:'b'},{s:1,f:5,mod:''},{s:1,f:8,mod:''},{s:0,f:5,mod:'h'},{s:0,f:8,mod:'b'}] },
  ],
};

const LICK_CAT_LABELS = {
  minor:{label:'Minor',cls:'lick-cat-minor'}, major:{label:'Major',cls:'lick-cat-major'},
  dom7:{label:'Dom 7',cls:'lick-cat-dom7'}, dim:{label:'Dim',cls:'lick-cat-dim'},
  nondiatonic:{label:'Non-Diatonic',cls:'lick-cat-nond'},
};

function computeLickOffset(targetRootPc, refRootPc = 9) {
  let refFret = (refRootPc - 4 + 12) % 12;
  let tgtFret = (targetRootPc - 4 + 12) % 12;
  if (tgtFret === 0) tgtFret = 12;
  if (refFret === 0) refFret = 12;
  return tgtFret - refFret;
}

function renderLickTABFromNotes(notes, offset) {
  if (!notes?.length) return '';
  const strLabels = ['e|','B|','G|','D|','A|','E|'];
  const lines = Array.from({length:6}, () => []);
  for (const note of notes) {
    const fret = Math.max(0, note.f + offset);
    for (let s = 0; s < 6; s++) {
      if (s === note.s) {
        const fs = String(fret).padStart(2,'-');
        const mod = note.mod === 'b' ? 'b' : note.mod === 'h' ? 'h' : note.mod === 'p' ? 'p' : '';
        const cell = fs + mod + (mod ? '' : '-');
        if (note.mod === 'b') lines[s].push(`<span class="arp-highlight">${cell}</span>`);
        else if (note.mod === 'h' || note.mod === 'p') lines[s].push(`<span style="color:#93c5fd">${cell}</span>`);
        else lines[s].push(cell);
      } else lines[s].push(note.mod ? '----' : '---');
    }
  }
  return strLabels.map((lbl,i) => lbl + lines[i].join('') + '-|').join('\n');
}

function getLickCategory(suffix, isNonDia) {
  if (isNonDia) return 'nondiatonic';
  if (['m','m7','m9','m6','m7b5'].includes(suffix)) return 'minor';
  if (['7','9'].includes(suffix)) return 'dom7';
  if (['dim','dim7'].includes(suffix)) return 'dim';
  return 'major';
}

// ── Panel Updates ────────────────────────────────────────

export function updateVoicingPanel() {
  const panel = document.getElementById('voicing-panel');
  if (!panel || !S.improvVisible) return;
  if (!S.chordMode || !S.currentChordInfo) {
    panel.innerHTML = '<span class="text-xs text-gray-600">코드 재생 시 운지표가 표시됩니다</span>';
    return;
  }
  const chordName = S.currentChordInfo.name;
  const voicings = getVoicingsForChord(chordName, S.currentChordInfo.rootPc);
  const { index: selectedIdx } = pickBestVoicing(chordName, S.currentChordInfo.rootPc);
  panel.innerHTML = voicings.map((v, i) =>
    `<div class="voicing-card ${i===selectedIdx?'voicing-selected':''}" data-voicing-idx="${i}" data-chord-name="${chordName}" style="cursor:pointer" title="클릭하여 이 운지를 타임라인에 적용">
      <span class="voicing-label">${v.name}</span>${renderVoicingSVG(v)}</div>`
  ).join('');
}

export function updateArpeggioPanel() {
  const panel = document.getElementById('arp-tab-content');
  const nameEl = document.getElementById('arp-pattern-name');
  if (!panel || !S.improvVisible) return;
  if (!S.chordMode || !S.currentChordInfo) {
    panel.innerHTML = '<span style="color:#555">코드 재생 시 아르페지오 패턴이 표시됩니다</span>';
    if (nameEl) nameEl.textContent = '';
    return;
  }
  panel.innerHTML = renderArpTab(S.currentChordInfo.rootPc, S.currentChordInfo.notePCs);
  if (nameEl) nameEl.textContent = ARP_PATTERNS[S.arpPatternIdx % ARP_PATTERNS.length].name;
}


export function updateTimelinePanel() {
  const container = document.getElementById('chord-timeline');
  if (!container || !S.improvVisible) return;
  if (!S.chordMode || !S.currentChordInfo) {
    container.innerHTML = '<span class="text-xs text-gray-600 py-4">코드 재생 시 타임라인이 표시됩니다</span>';
    return;
  }
  const diatonicSet = getDiatonicSet(S.masterKeyRoot, S.masterKeyMode);
  const curIdx = S.currentEventIdx;
  const slots = [{ info: S.currentChordInfo, isCurrent: true, evIdx: -1 }];
  for (let i = 1; i <= 4; i++) {
    const ev = curIdx >= 0 ? S.midiChordEvents[curIdx + i] : null;
    if (ev?.chord) slots.push({ info: { name:ev.chord.name, rootPc:ev.chord.rootPc, notePCs:ev.notePCs }, isCurrent: false, evIdx: curIdx + i });
  }
  const opacities = [1, 0.72, 0.52, 0.35, 0.22];
  container.innerHTML = slots.map((slot, i) => {
    const { info, isCurrent } = slot;
    const isNonDia = info.notePCs.some(pc => !diatonicSet.has(pc));
    const { voicing } = pickBestVoicing(info.name, info.rootPc);
    if (isCurrent && voicing) S.lastSelectedBaseFret = voicing.baseFret;
    const svgHtml = voicing ? renderVoicingSVG(voicing, !isCurrent) : '';
    const rootName = NOTE_NAMES[info.rootPc];
    const suffix = info.name.replace(rootName, '');
    const rn = getChordRomanNumeral(info.rootPc, suffix);
    const rnHtml = `<span style="font-size:10px;font-weight:700;color:${isNonDia?'#d97706':'#6366f1'};
      background:${isNonDia?'#1c1008':'#1e1b4b'};border-radius:4px;padding:1px 5px;letter-spacing:0.04em;">${rn}</span>`;
    const idxAttr = !isCurrent && slot.evIdx >= 0 ? ` data-sc-idx="${slot.evIdx}"` : '';
    return `<div class="tl-card ${isCurrent?'tl-current':''} ${isNonDia?'tl-nondiatonic':''}" style="opacity:${opacities[i]};${!isCurrent?'cursor:pointer':''}"${idxAttr}>
      <span class="tl-badge">NOW</span>
      <span class="tl-name" style="color:${isNonDia?(isCurrent?'#fbbf24':'#d97706'):''}">${info.name}</span>
      ${rnHtml}<div class="tl-nd-dot"></div>${svgHtml}</div>`;
  }).join('');
}

export function updateLickPanel() {
  const panel = document.getElementById('lick-panel-content');
  const hint  = document.getElementById('lick-key-hint');
  if (!panel || !S.improvVisible) return;
  if (!S.chordMode || !S.currentChordInfo) {
    panel.innerHTML = '<span class="text-xs text-gray-600 py-4">코드 재생 시 릭 라이브러리가 표시됩니다</span>';
    if (hint) hint.textContent = '';
    return;
  }
  const { name, rootPc, notePCs } = S.currentChordInfo;
  const rootName = NOTE_NAMES[rootPc];
  const suffix   = name.replace(rootName, '');
  const diaSet   = getDiatonicSet(S.masterKeyRoot, S.masterKeyMode);
  const isNonDia = notePCs.some(pc => !diaSet.has(pc));
  const cat      = getLickCategory(suffix, isNonDia);
  const licks    = LICK_LIBRARY[cat] || LICK_LIBRARY.major;
  const offset   = computeLickOffset(rootPc);
  const catMeta  = LICK_CAT_LABELS[cat];
  panel.innerHTML = licks.map(lick => {
    const tabHtml = renderLickTABFromNotes(lick.notes, offset);
    return `<div class="lick-card"><div class="lick-header">
      <span class="lick-name">${lick.name}</span><span class="lick-style">${lick.style}</span>
      <span class="lick-difficulty">${lick.difficulty}</span></div>
      <div class="lick-category-row"><span class="lick-cat-badge ${catMeta.cls}">${catMeta.label}</span></div>
      <p class="lick-desc">${lick.desc}</p>
      <div class="arp-tab" style="font-size:13px;padding:10px 14px">${tabHtml}</div></div>`;
  }).join('');
  if (hint) {
    const tgtFret = Math.max(0, computeLickOffset(rootPc) + 5);
    hint.textContent = `기준 포지션: ${rootName} — 로우 E ${tgtFret}프렛 근처`;
  }
}

export function setImprovTab(tab) {
  S.improvTab = tab;
  const tabIds = { timeline:'improv-tab-timeline', voicing:'improv-tab-voicing',
    arpeggio:'improv-tab-arpeggio', both:'improv-tab-both', lick:'improv-tab-lick' };
  for (const [key, id] of Object.entries(tabIds)) {
    const el = document.getElementById(id);
    if (el) el.className = key === tab
      ? 'px-3 py-1 bg-indigo-600 text-white transition-colors'
      : 'px-3 py-1 bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors';
  }
  document.getElementById('timeline-panel').classList.toggle('hidden', tab !== 'timeline');
  document.getElementById('voicing-panel').classList.toggle('hidden', tab !== 'voicing' && tab !== 'both');
  document.getElementById('arpeggio-panel').classList.toggle('hidden', tab !== 'arpeggio' && tab !== 'both');
  document.getElementById('lick-panel').classList.toggle('hidden', tab !== 'lick');
}

export function updateImprovTools() {
  if (!S.improvVisible) return;
  updateTimelinePanel();
  if (S.improvTab === 'voicing' || S.improvTab === 'both') updateVoicingPanel();
  if (S.improvTab === 'arpeggio' || S.improvTab === 'both') updateArpeggioPanel();
  if (S.improvTab === 'lick') updateLickPanel();
}

export function prevArpPattern() { S.arpPatternIdx = (S.arpPatternIdx - 1 + ARP_PATTERNS.length) % ARP_PATTERNS.length; }
export function nextArpPattern() { S.arpPatternIdx = (S.arpPatternIdx + 1) % ARP_PATTERNS.length; }
