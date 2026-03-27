import { S } from './state.js';
import { identifyChord } from './theory.js';
import { updateChordDisplay, updateUpcomingChords } from './display.js';
import { renderFretboard, renderNextFretboard } from './fretboard.js';
import { updateImprovTools } from './improv.js';
import { updateSongMapHighlight } from './songmap.js';

export function startSyncLoop() {
  if (S.rafId) return;
  function tick() {
    S.rafId = requestAnimationFrame(tick);
    if (!S.midiChordEvents.length) return;
    let rawTime;
    if (S.videoMode === 'local') {
      const v = document.getElementById('local-video');
      if (!v || v.paused || v.ended) return;
      rawTime = v.currentTime;
    } else {
      if (!S.ytPlayer) return;
      try {
        if (S.ytPlayer.getPlayerState() !== 1) return;
        rawTime = S.ytPlayer.getCurrentTime();
      } catch (_) { return; }
    }
    // A-B Practice Loop
    if (S.loopActive && S.loopA >= 0 && S.loopB > S.loopA && rawTime >= S.loopB) {
      if (S.videoMode === 'local') {
        document.getElementById('local-video').currentTime = S.loopA;
      } else {
        try { S.ytPlayer.seekTo(S.loopA, true); } catch(_){}
      }
      S.lastEventTime = -1;
      return;
    }
    syncToTime(rawTime + S.syncOffset / 1000);
  }
  S.rafId = requestAnimationFrame(tick);
}

export function stopSyncLoop() {
  if (S.rafId) { cancelAnimationFrame(S.rafId); S.rafId = null; }
}

export function syncToTime(t) {
  let lo = 0, hi = S.midiChordEvents.length - 1, idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (S.midiChordEvents[mid].time <= t) { idx = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  if (idx < 0) return;
  const event = S.midiChordEvents[idx];
  if (event.time === S.lastEventTime) return;
  S.lastEventTime = event.time;
  S.currentEventIdx = idx;
  const identified = event.chord ?? identifyChord(event.notePCs);
  if (!identified) return;
  S.currentChordInfo = { name: identified.name, rootPc: identified.rootPc, notePCs: event.notePCs };
  const nextEv = S.midiChordEvents[idx + 1];
  S.nextChordInfo = nextEv?.chord
    ? { name: nextEv.chord.name, rootPc: nextEv.chord.rootPc, notePCs: nextEv.notePCs }
    : null;
  updateChordDisplay();
  renderFretboard();
  updateUpcomingChords(idx);
  renderNextFretboard(idx + 1);
  updateImprovTools();
  updateSongMapHighlight(idx);
}

export function seekVideoTo(timeSec) {
  const t = Math.max(0, timeSec - S.syncOffset / 1000);
  if (S.videoMode === 'local') {
    const lv = document.getElementById('local-video');
    if (lv) lv.currentTime = t;
  } else if (S.ytPlayer) {
    try { S.ytPlayer.seekTo(t, true); } catch (_) {}
  }
  S.lastEventTime = -1;
  syncToTime(timeSec);
}
