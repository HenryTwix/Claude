import { NOTE_NAMES, CHORD_TYPES, S } from './state.js';
import { getDiatonicSet, getChordRomanNumeral } from './theory.js';

// ═══════════════════════════════════════════════════════════
// TUNABLE CONSTANTS
// ═══════════════════════════════════════════════════════════
const WINDOW_SIZES     = [3, 4, 8];
const SIMILARITY_THRESH = 0.4;   // 0 = identical, 1 = totally different
const MIN_REPEAT        = 2;     // pattern must appear ≥ 2 times

let _lastScActiveIdx = -1;

export function resetScActiveIdx() { _lastScActiveIdx = -1; }

// ═══════════════════════════════════════════════════════════
// STAGE 1 — Harmonic Normalization
// Convert each chord to key-relative { iv, quality, tag }
// ═══════════════════════════════════════════════════════════

const _QUALITY_MAP = new Map();
for (const ct of CHORD_TYPES) {
  const s = ct.s;
  let q = 'maj';
  if (s.startsWith('m') && s !== 'maj7' && s !== 'maj9') q = 'min';
  else if (s === '7' || s === '9') q = 'dom';
  else if (s.includes('dim')) q = 'dim';
  else if (s === 'aug') q = 'aug';
  else if (s.startsWith('sus')) q = 'sus';
  _QUALITY_MAP.set(s, q);
}

function _buildFunctionSequence(events) {
  const keyRootPc = NOTE_NAMES.indexOf(S.masterKeyRoot);
  return events.map(ev => {
    if (!ev.chord) return { iv: -1, quality: '?', tag: '?:?' };
    const rootName = NOTE_NAMES[ev.chord.rootPc];
    const suffix = ev.chord.name.replace(rootName, '');
    const iv = (ev.chord.rootPc - keyRootPc + 12) % 12;
    const quality = _QUALITY_MAP.get(suffix) || 'other';
    return { iv, quality, tag: `${iv}:${quality}` };
  });
}

// ═══════════════════════════════════════════════════════════
// STAGE 2 — Multi-Window Pattern Mining
// Scan with variable window sizes, find repeating patterns
// ═══════════════════════════════════════════════════════════

function _minePatterns(fnSeq) {
  // Collect all patterns per window size
  const allPatterns = new Map(); // patternKey → { count, winSize, positions[] }

  for (const ws of WINDOW_SIZES) {
    if (ws > fnSeq.length) continue;
    const freqMap = new Map();
    for (let i = 0; i <= fnSeq.length - ws; i++) {
      const key = fnSeq.slice(i, i + ws).map(f => f.tag).join('|');
      if (!freqMap.has(key)) freqMap.set(key, { count: 0, winSize: ws, positions: [] });
      const entry = freqMap.get(key);
      entry.count++;
      entry.positions.push(i);
    }
    // Keep only repeating patterns
    for (const [key, data] of freqMap) {
      if (data.count >= MIN_REPEAT) {
        // If same key exists from a different window size, keep the larger one
        const existing = allPatterns.get(key);
        if (!existing || data.winSize > existing.winSize) {
          allPatterns.set(key, data);
        }
      }
    }
  }

  return allPatterns;
}

// ═══════════════════════════════════════════════════════════
// STAGE 3 — Similarity-Based Pattern Clustering
// Group similar (not just identical) patterns together
// ═══════════════════════════════════════════════════════════

function _chordDistance(tagA, tagB) {
  if (tagA === tagB) return 0;
  const [ivA, qA] = tagA.split(':');
  const [ivB, qB] = tagB.split(':');
  if (ivA === ivB) return qA === qB ? 0 : 0.3;
  // Relative major/minor (3 semitones apart)
  const diff = Math.abs(+ivA - +ivB);
  if ((diff === 3 || diff === 9) && (qA === 'min' || qB === 'min')) return 0.5;
  return 1.0;
}

function _patternDistance(keyA, keyB) {
  const tagsA = keyA.split('|');
  const tagsB = keyB.split('|');
  if (tagsA.length !== tagsB.length) return 1.0;
  let total = 0;
  for (let i = 0; i < tagsA.length; i++) {
    total += _chordDistance(tagsA[i], tagsB[i]);
  }
  return total / tagsA.length;
}

function _clusterPatterns(patternMap) {
  const keys = [...patternMap.keys()];
  if (!keys.length) return { clusters: new Map(), clusterOf: new Map() };

  // Each pattern starts as its own cluster
  const clusterId = new Map(); // patternKey → clusterId
  let nextId = 0;
  for (const k of keys) clusterId.set(k, nextId++);

  // Group by window size (only compare same-size patterns)
  const bySize = new Map();
  for (const k of keys) {
    const ws = patternMap.get(k).winSize;
    if (!bySize.has(ws)) bySize.set(ws, []);
    bySize.get(ws).push(k);
  }

  // Single-linkage agglomerative clustering within each size group
  for (const [, group] of bySize) {
    let merged = true;
    while (merged) {
      merged = false;
      for (let i = 0; i < group.length && !merged; i++) {
        for (let j = i + 1; j < group.length && !merged; j++) {
          if (clusterId.get(group[i]) === clusterId.get(group[j])) continue;
          const dist = _patternDistance(group[i], group[j]);
          if (dist < SIMILARITY_THRESH) {
            // Merge: assign all of j's cluster to i's cluster
            const oldId = clusterId.get(group[j]);
            const newId = clusterId.get(group[i]);
            for (const k of keys) {
              if (clusterId.get(k) === oldId) clusterId.set(k, newId);
            }
            merged = true;
          }
        }
      }
    }
  }

  // Build reverse map: clusterId → patternKeys[]
  const clusters = new Map();
  for (const [k, id] of clusterId) {
    if (!clusters.has(id)) clusters.set(id, []);
    clusters.get(id).push(k);
  }

  return { clusters, clusterOf: clusterId };
}

// ═══════════════════════════════════════════════════════════
// GREEDY COVERING — assign each event to the best pattern
// ═══════════════════════════════════════════════════════════

function _greedyCover(fnSeq, patternMap, clusterOf) {
  const n = fnSeq.length;
  const cover = new Array(n).fill(-1); // clusterId per event

  // Sort patterns: prefer (larger winSize × more count)
  const sorted = [...patternMap.entries()]
    .sort((a, b) => (b[1].winSize * b[1].count) - (a[1].winSize * a[1].count));

  for (const [key, data] of sorted) {
    const cid = clusterOf.get(key);
    if (cid === undefined) continue;
    for (const pos of data.positions) {
      // Only cover events that aren't already covered by a bigger pattern
      let canCover = true;
      for (let j = pos; j < pos + data.winSize && j < n; j++) {
        if (cover[j] !== -1 && cover[j] !== cid) { canCover = false; break; }
      }
      if (canCover) {
        for (let j = pos; j < pos + data.winSize && j < n; j++) cover[j] = cid;
      }
    }
  }

  return cover;
}

// ═══════════════════════════════════════════════════════════
// STAGE 4 — Segmentation
// Merge consecutive same-cluster events into sections
// ═══════════════════════════════════════════════════════════

function _segmentSong(events, cover) {
  if (!events.length) return [];
  const sections = [];
  let cur = { clusterId: cover[0], startIdx: 0 };

  for (let i = 1; i < events.length; i++) {
    if (cover[i] !== cur.clusterId) {
      sections.push(_makeSection(events, cur.clusterId, cur.startIdx, i - 1));
      cur = { clusterId: cover[i], startIdx: i };
    }
  }
  sections.push(_makeSection(events, cur.clusterId, cur.startIdx, events.length - 1));

  // Absorb tiny uncovered segments (≤ 2 events) into neighbors
  for (let i = 1; i < sections.length - 1; i++) {
    const sec = sections[i];
    if (sec.clusterId === -1 && (sec.endIdx - sec.startIdx + 1) <= 2) {
      const prev = sections[i - 1];
      const next = sections[i + 1];
      if (prev.clusterId === next.clusterId && prev.clusterId !== -1) {
        prev.endIdx = next.endIdx;
        prev.endTime = next.endTime;
        prev.chunkCount += sec.chunkCount + next.chunkCount;
        sections.splice(i, 2);
        i--;
      }
    }
  }

  // Post-merge: merge tiny sections (< 4 events) into the most similar neighbor
  const MIN_SECTION_SIZE = 4;
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].chunkCount >= MIN_SECTION_SIZE) continue;
      // Find best neighbor to merge with (prefer same clusterId, then larger)
      let target = -1;
      if (i > 0 && i < sections.length - 1) {
        const prev = sections[i - 1];
        const next = sections[i + 1];
        if (prev.clusterId === sections[i].clusterId) target = i - 1;
        else if (next.clusterId === sections[i].clusterId) target = i + 1;
        else target = prev.chunkCount >= next.chunkCount ? i - 1 : i + 1;
      } else if (i > 0) {
        target = i - 1;
      } else if (i < sections.length - 1) {
        target = i + 1;
      }
      if (target >= 0) {
        const t = sections[target];
        const s = sections[i];
        if (target < i) {
          t.endIdx = s.endIdx;
          t.endTime = s.endTime;
        } else {
          t.startIdx = s.startIdx;
          t.startTime = s.startTime;
        }
        t.chunkCount += s.chunkCount;
        sections.splice(i, 1);
        changed = true;
        break;
      }
    }
  }

  return sections;
}

function _makeSection(events, clusterId, startIdx, endIdx) {
  return {
    clusterId,
    startIdx,
    endIdx,
    startTime: events[startIdx]?.time ?? 0,
    endTime: events[endIdx]?.time ?? 0,
    chunkCount: endIdx - startIdx + 1,
    label: '',
    patternKey: '',
  };
}

// ═══════════════════════════════════════════════════════════
// STAGE 5 — Label Assignment
// Use energy, density, repetition, position heuristics
// ═══════════════════════════════════════════════════════════

function _assignLabels(sections, events) {
  if (!sections.length) return sections;

  const diaSet = getDiatonicSet(S.masterKeyRoot, S.masterKeyMode);
  const totalEvents = events.length;
  const totalTime = events[totalEvents - 1]?.time ?? 1;

  // Count how many times each clusterId appears
  const clusterCount = new Map();
  for (const sec of sections) {
    clusterCount.set(sec.clusterId, (clusterCount.get(sec.clusterId) || 0) + 1);
  }

  // Compute features per section
  for (const sec of sections) {
    const evts = events.slice(sec.startIdx, sec.endIdx + 1);
    const duration = Math.max(sec.endTime - sec.startTime, 0.1);

    // Harmonic density: unique pitch classes per event
    const totalPCs = evts.reduce((sum, e) => sum + e.notePCs.length, 0);
    sec._density = evts.length ? totalPCs / evts.length : 0;

    // Non-diatonic ratio
    const ndCount = evts.filter(e => e.notePCs.some(pc => !diaSet.has(pc))).length;
    sec._ndRatio = evts.length ? ndCount / evts.length : 0;

    // Harmonic rhythm: events per second (faster = more energetic)
    sec._rhythm = evts.length / duration;

    // Repetition: how many times this cluster appears
    sec._repetition = clusterCount.get(sec.clusterId) || 1;

    // Normalized position (0 = start, 1 = end)
    const centerTime = (sec.startTime + sec.endTime) / 2;
    sec._position = totalTime > 0 ? centerTime / totalTime : 0.5;

    // Composite energy score
    sec._energy = sec._density * 0.3 + sec._rhythm * 0.3 + sec._repetition * 0.4;
  }

  // --- Label assignment rules ---

  const labeled = new Set();

  // 1. Intro: first section, position < 0.15, low repetition or short
  if (sections.length >= 2) {
    const first = sections[0];
    if (first._position < 0.15 && (first._repetition <= 2 || first.chunkCount <= 4)) {
      first.label = 'Intro';
      labeled.add(0);
    }
  }

  // 2. Outro: last section, position > 0.85, low repetition or short
  if (sections.length >= 2) {
    const lastIdx = sections.length - 1;
    const last = sections[lastIdx];
    if (last._position > 0.85 && (last._repetition <= 2 || last.chunkCount <= 4)) {
      last.label = 'Outro';
      labeled.add(lastIdx);
    }
  }

  // 3. Collect cluster energy scores (excluding Intro/Outro)
  const clusterEnergy = new Map();
  const clusterTotalChunks = new Map();
  for (let i = 0; i < sections.length; i++) {
    if (labeled.has(i)) continue;
    const cid = sections[i].clusterId;
    if (cid === -1) continue;
    const prev = clusterEnergy.get(cid) || 0;
    clusterEnergy.set(cid, prev + sections[i]._energy);
    clusterTotalChunks.set(cid, (clusterTotalChunks.get(cid) || 0) + sections[i].chunkCount);
  }

  // Sort clusters by average energy
  const clusterRank = [...clusterEnergy.entries()]
    .map(([cid, totalE]) => ({
      cid,
      avgEnergy: totalE / (clusterCount.get(cid) || 1),
      totalChunks: clusterTotalChunks.get(cid) || 0,
      repetition: clusterCount.get(cid) || 0,
    }))
    .sort((a, b) => b.avgEnergy - a.avgEnergy);

  // 4. Chorus: highest energy cluster
  const chorusCid = clusterRank[0]?.cid;

  // 5. Verse: second-highest energy OR highest repetition among remaining
  let verseCid = null;
  if (clusterRank.length >= 2) {
    // Among non-Chorus clusters, prefer the one with most total events
    const candidates = clusterRank.slice(1).sort((a, b) => b.totalChunks - a.totalChunks);
    verseCid = candidates[0]?.cid ?? null;
  }

  // 6. Bridge: cluster with highest non-diatonic ratio, appears 1-2 times, not Chorus/Verse
  let bridgeCid = null;
  const bridgeCandidates = [];
  for (let i = 0; i < sections.length; i++) {
    if (labeled.has(i)) continue;
    const sec = sections[i];
    if (sec.clusterId === chorusCid || sec.clusterId === verseCid) continue;
    if (sec.clusterId === -1) continue;
    if ((clusterCount.get(sec.clusterId) || 0) <= 2 && sec._ndRatio > 0.2) {
      bridgeCandidates.push(sec);
    }
  }
  if (bridgeCandidates.length) {
    bridgeCandidates.sort((a, b) => b._ndRatio - a._ndRatio);
    bridgeCid = bridgeCandidates[0].clusterId;
  }

  // Apply Chorus/Verse/Bridge labels
  for (let i = 0; i < sections.length; i++) {
    if (labeled.has(i)) continue;
    const sec = sections[i];
    if (sec.clusterId === chorusCid) { sec.label = 'Chorus'; labeled.add(i); }
    else if (sec.clusterId === verseCid) { sec.label = 'Verse'; labeled.add(i); }
    else if (sec.clusterId === bridgeCid) { sec.label = 'Bridge'; labeled.add(i); }
  }

  // 7. Pre-Chorus: unlabeled section that consistently precedes Chorus
  for (let i = 0; i < sections.length; i++) {
    if (labeled.has(i)) continue;
    const sec = sections[i];
    if (sec.clusterId === -1) continue;
    // Check if > 50% of this cluster's occurrences appear right before Chorus
    const cid = sec.clusterId;
    let beforeChorus = 0, total = 0;
    for (let j = 0; j < sections.length; j++) {
      if (sections[j].clusterId === cid) {
        total++;
        if (j + 1 < sections.length && sections[j + 1].label === 'Chorus') {
          beforeChorus++;
        }
      }
    }
    if (total > 0 && beforeChorus / total >= 0.5) {
      // Label all instances of this cluster as Pre-Chorus
      for (let j = 0; j < sections.length; j++) {
        if (sections[j].clusterId === cid && !labeled.has(j)) {
          sections[j].label = 'Pre-Chorus';
          labeled.add(j);
        }
      }
    }
  }

  // 8. Remaining unlabeled → Other
  for (let i = 0; i < sections.length; i++) {
    if (!sections[i].label) sections[i].label = 'Other';
  }

  // Build patternKey for display
  for (const sec of sections) {
    const names = events.slice(sec.startIdx, sec.endIdx + 1)
      .map(e => e.chord?.name || '?');
    // Show first 4 chords as preview
    sec.patternKey = names.slice(0, 4).join('|') + (names.length > 4 ? '…' : '');
  }

  // Clean up internal properties
  for (const sec of sections) {
    delete sec._density;
    delete sec._ndRatio;
    delete sec._rhythm;
    delete sec._repetition;
    delete sec._position;
    delete sec._energy;
    delete sec.clusterId;
  }

  return sections;
}

// ═══════════════════════════════════════════════════════════
// MAIN ENTRY — detectSongSections
// ═══════════════════════════════════════════════════════════

export function detectSongSections(events) {
  if (!events.length) return [];

  // Edge case: very short songs
  if (events.length < 8) {
    return [{
      label: 'Other', startIdx: 0, endIdx: events.length - 1,
      startTime: events[0].time, endTime: events[events.length - 1].time,
      patternKey: events.map(e => e.chord?.name || '?').join('|'),
      chunkCount: events.length,
    }];
  }

  // Stage 1: Harmonic normalization
  const fnSeq = _buildFunctionSequence(events);

  // Stage 2: Mine repeating patterns
  const patternMap = _minePatterns(fnSeq);

  // Stage 3: Cluster similar patterns
  const { clusters, clusterOf } = _clusterPatterns(patternMap);

  // Stage 4: Greedy cover + segmentation
  const cover = _greedyCover(fnSeq, patternMap, clusterOf);
  const sections = _segmentSong(events, cover);

  // Stage 5: Label assignment
  _assignLabels(sections, events);

  return sections;
}

// ═══════════════════════════════════════════════════════════
// DISPLAY — unchanged public API
// ═══════════════════════════════════════════════════════════

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
