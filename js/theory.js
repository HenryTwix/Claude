import { NOTE_NAMES, CHORD_TYPES, DIATONIC_IVS, S } from './state.js';

export function identifyChord(notePCs) {
  const pcs = [...new Set(notePCs)];
  if (!pcs.length) return null;
  let best = null, bestScore = -1;
  for (let root = 0; root < 12; root++) {
    for (const ct of CHORD_TYPES) {
      const chordPCs = ct.iv.map(i => (root + i) % 12);
      const matches  = chordPCs.filter(pc => pcs.includes(pc)).length;
      const total    = Math.max(chordPCs.length, pcs.length);
      const score    = matches / total;
      if (score > bestScore || (score === bestScore && matches > (best?.matches ?? 0))) {
        bestScore = score;
        best = { rootPc: root, suffix: ct.s, matches };
      }
    }
  }
  if (!best || bestScore < 0.5) return null;
  return { rootPc: best.rootPc, name: NOTE_NAMES[best.rootPc] + best.suffix };
}

export function getDiatonicSet(rootName, mode) {
  const rootIdx = NOTE_NAMES.indexOf(rootName);
  const ivs = DIATONIC_IVS[mode] ?? DIATONIC_IVS['Major'];
  return new Set(ivs.map(i => (rootIdx + i) % 12));
}

export function getDiatonicNames(rootName, mode) {
  const rootIdx = NOTE_NAMES.indexOf(rootName);
  const ivs = DIATONIC_IVS[mode] ?? DIATONIC_IVS['Major'];
  return ivs.map(i => NOTE_NAMES[(rootIdx + i) % 12]);
}

export function getChordRomanNumeral(rootPc, chordSuffix) {
  const keyRootPc = NOTE_NAMES.indexOf(S.masterKeyRoot);
  const iv = (rootPc - keyRootPc + 12) % 12;
  if (S.masterKeyMode === 'Major') {
    const dia = {0:'I',2:'ii',4:'iii',5:'IV',7:'V',9:'vi',11:'vii°'};
    const chr = {1:'♭II',3:'♭III',6:'♯IV',8:'♭VI',10:'♭VII'};
    const rn = dia[iv] || chr[iv] || '?';
    let ann = '';
    if (chordSuffix === '7')    ann = '7';
    else if (chordSuffix === 'maj7') ann = 'Δ7';
    else if (chordSuffix === 'm7')   ann = 'm7';
    else if (chordSuffix === 'm9')   ann = 'm9';
    else if (chordSuffix === '9')    ann = '9';
    else if (chordSuffix === 'maj9') ann = 'Δ9';
    else if (chordSuffix === 'm7b5') ann = 'ø';
    else if (chordSuffix === 'dim7') ann = 'dim7';
    return ann ? `${rn} ${ann}` : rn;
  } else {
    const dia = {0:'i',2:'ii°',3:'♭III',5:'iv',7:'v',8:'♭VI',10:'♭VII'};
    const chr = {1:'♭ii',4:'III',6:'♯iv',9:'VI',11:'VII'};
    const rn = dia[iv] || chr[iv] || '?';
    let ann = '';
    if (chordSuffix === '7' && iv === 7)   ann = '(V7)';
    else if (chordSuffix === '7')           ann = '7';
    else if (chordSuffix === 'maj7')        ann = 'Δ7';
    else if (chordSuffix === 'm7')          ann = 'm7';
    return ann ? `${rn} ${ann}` : rn;
  }
}

export function getScaleSuggestions(rootPc, chordSuffix, notePCs) {
  const keyRootPc = NOTE_NAMES.indexOf(S.masterKeyRoot);
  const iv = (rootPc - keyRootPc + 12) % 12;
  const diaSet = getDiatonicSet(S.masterKeyRoot, S.masterKeyMode);
  const isNonDia = notePCs.some(pc => !diaSet.has(pc));
  if (isNonDia) {
    if (chordSuffix === '7' || chordSuffix === '9')
      return ['믹솔리디안 (코드 루트)', '블루스 스케일', '크로매틱 어프로치'];
    if (chordSuffix === 'm' || chordSuffix === 'm7')
      return ['도리안 (코드 루트)', '마이너 펜타 (코드 루트)', '크로매틱 어프로치'];
    return ['크로매틱 어프로치', '코드 루트 기준 마이너 펜타'];
  }
  if (S.masterKeyMode === 'Major') {
    const map = {
      0:['메이저 스케일','메이저 펜타'], 2:['도리안','마이너 펜타'],
      4:['프리지안','마이너 펜타'], 5:['리디안','메이저 펜타'],
      7: chordSuffix==='7' ? ['믹솔리디안','블루스','얼터드(재즈)'] : ['믹솔리디안','메이저 펜타'],
      9:['에올리안','마이너 펜타'], 11:['로크리안','마이너 펜타 (주의)'],
    };
    return map[iv] || ['메이저 스케일'];
  } else {
    const map = {
      0:['에올리안','마이너 펜타','도리안'], 2:['로크리안'],
      3:['메이저 스케일','메이저 펜타'], 5:['에올리안','마이너 펜타'],
      7: chordSuffix==='7' ? ['믹솔리디안','화성 마이너'] : ['에올리안','마이너 펜타'],
      8:['메이저 스케일'], 10:['믹솔리디안','블루스'],
    };
    return map[iv] || ['마이너 스케일'];
  }
}

export function detectKeyFromChords(chordEvents) {
  const hist = new Array(12).fill(0);
  for (const ev of chordEvents) {
    for (const pc of ev.notePCs) hist[pc]++;
  }
  const majorProfile = [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88];
  const minorProfile = [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
  function pearson(profile, shift) {
    const h  = Array.from({length:12}, (_,i) => hist[(i + shift) % 12]);
    const hm = h.reduce((a,b) => a+b, 0) / 12;
    const pm = profile.reduce((a,b) => a+b, 0) / 12;
    let num = 0, dh = 0, dp = 0;
    for (let i = 0; i < 12; i++) {
      num += (h[i] - hm) * (profile[i] - pm);
      dh  += (h[i] - hm) ** 2;
      dp  += (profile[i] - pm) ** 2;
    }
    return (dh === 0 || dp === 0) ? 0 : num / Math.sqrt(dh * dp);
  }
  let best = { score: -Infinity, root: 'C', mode: 'Major' };
  for (let r = 0; r < 12; r++) {
    const majorScore = pearson(majorProfile, r);
    const minorScore = pearson(minorProfile, r);
    if (majorScore > best.score) best = { score: majorScore, root: NOTE_NAMES[r], mode: 'Major' };
    if (minorScore > best.score) best = { score: minorScore, root: NOTE_NAMES[r], mode: 'Minor' };
  }
  return best;
}

export function extractChordEvents(midi) {
  let track = midi.tracks.find(t => /chord/i.test(t.name));
  if (!track) {
    track = midi.tracks.reduce(
      (best, t) => t.notes.length > best.notes.length ? t : best,
      { notes: [] }
    );
  }
  if (!track?.notes.length) return [];
  const sorted = [...track.notes].sort((a, b) => a.time - b.time);
  const events = [];
  let group = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].time - group[0].time < 0.05) {
      group.push(sorted[i]);
    } else {
      events.push({ time: group[0].time, notePCs: [...new Set(group.map(n => n.midi % 12))] });
      group = [sorted[i]];
    }
  }
  if (group.length) {
    events.push({ time: group[0].time, notePCs: [...new Set(group.map(n => n.midi % 12))] });
  }
  return events;
}
