// ═══════════════════════════════════════════════════════════
// APP.JS — Entry Point, Event Wiring, Initialization
// ═══════════════════════════════════════════════════════════

import { NOTE_NAMES, S } from './state.js';
import { buildFretboard, buildFretboard2, renderFretboard } from './fretboard.js';
import { updateChordDisplay, updateUpcomingChords, updateDiatonicPreview, syncToggleUI } from './display.js';
import { onVoicingChange, setVoicingPref } from './voicing.js';
import { buildSongMap, updateSongMapHighlight, resetScActiveIdx } from './songmap.js';
import { updateTimelinePanel, updateVoicingPanel, updateArpeggioPanel, updateLickPanel,
         setImprovTab, updateImprovTools, prevArpPattern, nextArpPattern } from './improv.js';
import { startSyncLoop, stopSyncLoop, seekVideoTo } from './sync.js';
import { setLoopA, setLoopB, toggleLoop, clearLoop, setPlaybackSpeed } from './loop.js';
import { loadMidi, loadYoutube, loadLocalVideo, registerHistoryCallback } from './media.js';
import { openHistoryDB, saveToHistory, loadFromHistory, deleteHistoryEntry, clearAllHistory,
         renderHistoryUI, registerMediaCallbacks } from './history.js';
import { registerShortcutHandler } from './shortcuts.js';

// ── Callback Bridges ──
registerMediaCallbacks({ loadMidi, loadYoutube, loadLocalVideo });
registerHistoryCallback(saveToHistory);
onVoicingChange(() => { updateTimelinePanel(); updateVoicingPanel(); });

// ── Expose state for debugging ──
window.S = S;

// ── Populate Master Key Dropdown ──
const masterKeyRootSel = document.getElementById('master-key-root');
const masterKeyModeSel = document.getElementById('master-key-mode');
NOTE_NAMES.forEach(n => {
  const o = document.createElement('option');
  o.value = o.textContent = n;
  masterKeyRootSel.appendChild(o);
});

// ═══════════════════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════════════════

// ── Master Key ──
masterKeyRootSel.addEventListener('change', () => {
  S.masterKeyRoot = masterKeyRootSel.value;
  updateDiatonicPreview(); updateChordDisplay(); renderFretboard();
  if (S.songMapVisible) buildSongMap();
});
masterKeyModeSel.addEventListener('change', () => {
  S.masterKeyMode = masterKeyModeSel.value;
  updateDiatonicPreview(); updateChordDisplay(); renderFretboard();
  if (S.songMapVisible) buildSongMap();
});

// ── Sync Offset ──
const syncOffsetSlider = document.getElementById('sync-offset');
const syncOffsetVal    = document.getElementById('sync-offset-val');
syncOffsetSlider.addEventListener('input', () => {
  S.syncOffset = parseInt(syncOffsetSlider.value, 10);
  syncOffsetVal.textContent = `${S.syncOffset > 0 ? '+' : ''}${S.syncOffset} ms`;
  S.lastEventTime = -1; S.currentEventIdx = -1;
});

// ── Fretboard Zoom ──
const fbZoomSlider = document.getElementById('fb-zoom');
const fbZoomVal    = document.getElementById('fb-zoom-val');
const savedFbZoom  = localStorage.getItem('chordSyncFbZoom');
if (savedFbZoom) fbZoomSlider.value = savedFbZoom;

function applyFbZoom(val) {
  const v = parseFloat(val);
  document.getElementById('fb-inner')?.style.setProperty('zoom', v);
  document.getElementById('fb2-inner')?.style.setProperty('zoom', v);
  fbZoomVal.textContent = `${Math.round(v * 100)}%`;
  localStorage.setItem('chordSyncFbZoom', val);
}
fbZoomSlider.addEventListener('input', () => applyFbZoom(fbZoomSlider.value));
fbZoomVal.addEventListener('dblclick', () => { fbZoomSlider.value = 1; applyFbZoom(1); });

// ── Toggle Buttons ──
document.getElementById('label-toggle').addEventListener('click', () => {
  S.showNoteNames = !S.showNoteNames;
  document.getElementById('label-toggle-text').textContent = S.showNoteNames ? '음계' : '도수';
  document.getElementById('label-toggle').classList.toggle('toggle-on', S.showNoteNames);
  renderFretboard();
});
document.getElementById('penta-toggle').addEventListener('click', () => {
  S.pentatonicMode = !S.pentatonicMode;
  if (S.pentatonicMode) S.withPentaMode = false;
  document.getElementById('penta-toggle').classList.toggle('toggle-on', S.pentatonicMode);
  document.getElementById('with-penta-toggle').classList.toggle('toggle-on', S.withPentaMode);
  renderFretboard();
});
document.getElementById('with-penta-toggle').addEventListener('click', () => {
  S.withPentaMode = !S.withPentaMode;
  if (S.withPentaMode) S.pentatonicMode = false;
  document.getElementById('with-penta-toggle').classList.toggle('toggle-on', S.withPentaMode);
  document.getElementById('penta-toggle').classList.toggle('toggle-on', S.pentatonicMode);
  renderFretboard();
});
document.getElementById('chord-only-toggle').addEventListener('click', () => {
  S.chordOnlyMode = !S.chordOnlyMode;
  document.getElementById('chord-only-toggle').classList.toggle('toggle-on', S.chordOnlyMode);
  renderFretboard();
});
document.getElementById('gray-toggle').addEventListener('click', () => {
  S.grayMode = !S.grayMode;
  document.getElementById('gray-toggle').classList.toggle('toggle-on', S.grayMode);
  renderFretboard();
});
document.getElementById('pre-nond-toggle').addEventListener('click', () => {
  S.preNonDMode = !S.preNonDMode;
  document.getElementById('pre-nond-toggle').classList.toggle('toggle-on', S.preNonDMode);
  renderFretboard();
});
document.getElementById('approach-toggle').addEventListener('click', () => {
  S.approachNoteMode = !S.approachNoteMode;
  document.getElementById('approach-toggle').classList.toggle('toggle-on', S.approachNoteMode);
  renderFretboard();
});
document.getElementById('next-fb-toggle').addEventListener('click', () => {
  const section = document.getElementById('fretboard2-section');
  const isShown = !section.classList.contains('hidden');
  section.classList.toggle('hidden', isShown);
  document.getElementById('next-fb-toggle').classList.toggle('toggle-on', !isShown);
});

// ── Song Map Toggle ──
document.getElementById('song-map-toggle').addEventListener('click', () => {
  S.songMapVisible = !S.songMapVisible;
  const btn   = document.getElementById('song-map-toggle');
  const panel = document.getElementById('song-map-panel');
  const stats = document.getElementById('song-map-stats');
  btn.textContent = S.songMapVisible ? '▼ Song Map' : '▶ Song Map';
  btn.classList.toggle('toggle-on', S.songMapVisible);
  if (S.songMapVisible) {
    panel.classList.remove('hidden');
    buildSongMap();
    if (S.currentEventIdx >= 0) { resetScActiveIdx(); updateSongMapHighlight(S.currentEventIdx); }
  } else {
    panel.classList.add('hidden');
    if (stats) stats.classList.add('hidden');
  }
});
document.getElementById('song-map-content').addEventListener('click', e => {
  const card = e.target.closest('[data-sc-idx]');
  if (card) seekVideoTo(S.midiChordEvents[+card.dataset.scIdx]?.time);
});

// ── Improv Tools ──
document.getElementById('improv-toggle').addEventListener('click', () => {
  S.improvVisible = !S.improvVisible;
  document.getElementById('improv-toggle').classList.toggle('toggle-on', S.improvVisible);
  document.getElementById('improv-tools').classList.toggle('hidden', !S.improvVisible);
  if (S.improvVisible) updateImprovTools();
  else document.getElementById('pos-zone')?.classList.add('hidden');
});
document.getElementById('improv-tab-timeline').addEventListener('click', () => { setImprovTab('timeline'); updateTimelinePanel(); });
document.getElementById('improv-tab-voicing').addEventListener('click', () => { setImprovTab('voicing'); updateVoicingPanel(); });
document.getElementById('improv-tab-arpeggio').addEventListener('click', () => { setImprovTab('arpeggio'); updateArpeggioPanel(); });
document.getElementById('improv-tab-both').addEventListener('click', () => { setImprovTab('both'); updateVoicingPanel(); updateArpeggioPanel(); });
document.getElementById('improv-tab-lick').addEventListener('click', () => { setImprovTab('lick'); updateLickPanel(); });
document.getElementById('arp-pattern-prev').addEventListener('click', () => { prevArpPattern(); updateArpeggioPanel(); });
document.getElementById('arp-pattern-next').addEventListener('click', () => { nextArpPattern(); updateArpeggioPanel(); });

// ── Voicing Panel Click ──
document.getElementById('voicing-panel').addEventListener('click', e => {
  const card = e.target.closest('[data-voicing-idx]');
  if (card) setVoicingPref(card.dataset.chordName, +card.dataset.voicingIdx);
});

// ── MIDI Upload ──
const dropZone  = document.getElementById('drop-zone');
const midiInput = document.getElementById('midi-input');
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('border-indigo-500'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-indigo-500'));
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.classList.remove('border-indigo-500');
  if (e.dataTransfer.files[0]) loadMidi(e.dataTransfer.files[0]);
});
midiInput.addEventListener('change', e => { if (e.target.files[0]) loadMidi(e.target.files[0]); });

// ── Video Tabs ──
document.getElementById('tab-youtube').addEventListener('click', () => {
  S.videoMode = 'youtube';
  document.getElementById('tab-youtube').className = 'px-3 py-1 bg-indigo-600 text-white transition-colors';
  document.getElementById('tab-local').className = 'px-3 py-1 bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors';
  document.getElementById('panel-youtube').classList.remove('hidden');
  document.getElementById('panel-local').classList.add('hidden');
  const lv = document.getElementById('local-video'); lv.pause(); lv.classList.add('hidden');
  stopSyncLoop();
});
document.getElementById('tab-local').addEventListener('click', () => {
  S.videoMode = 'local';
  document.getElementById('tab-local').className = 'px-3 py-1 bg-indigo-600 text-white transition-colors';
  document.getElementById('tab-youtube').className = 'px-3 py-1 bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors';
  document.getElementById('panel-local').classList.remove('hidden');
  document.getElementById('panel-youtube').classList.add('hidden');
  document.getElementById('yt-player-wrap').classList.add('hidden');
  if (S.ytPlayer) { try { S.ytPlayer.pauseVideo(); } catch(_){} }
  stopSyncLoop();
});

// ── YouTube / Local Video ──
document.getElementById('yt-load').addEventListener('click', loadYoutube);
document.getElementById('yt-url').addEventListener('keydown', e => { if (e.key === 'Enter') loadYoutube(); });
const videoInput = document.getElementById('video-input');
const videoDrop  = document.getElementById('video-drop-zone');
videoInput.addEventListener('change', e => { if (e.target.files[0]) loadLocalVideo(e.target.files[0]); });
videoDrop.addEventListener('dragover', e => { e.preventDefault(); videoDrop.classList.add('border-indigo-500'); });
videoDrop.addEventListener('dragleave', () => videoDrop.classList.remove('border-indigo-500'));
videoDrop.addEventListener('drop', e => {
  e.preventDefault(); videoDrop.classList.remove('border-indigo-500');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('video/')) loadLocalVideo(f);
});

// ── History ──
document.getElementById('history-list').addEventListener('click', e => {
  const delBtn = e.target.closest('[data-hist-del]');
  if (delBtn) { e.stopPropagation(); deleteHistoryEntry(+delBtn.dataset.histDel); return; }
  const item = e.target.closest('[data-hist-idx]');
  if (item) { const list = JSON.parse(localStorage.getItem('chordSyncHistory') || '[]'); loadFromHistory(list[+item.dataset.histIdx]); }
});
document.getElementById('history-clear').addEventListener('click', () => {
  if (confirm('모든 기록을 삭제하시겠습니까?')) clearAllHistory();
});

// ── Loop Controls ──
document.getElementById('loop-a-btn').addEventListener('click', setLoopA);
document.getElementById('loop-b-btn').addEventListener('click', setLoopB);
document.getElementById('loop-toggle-btn').addEventListener('click', toggleLoop);
document.getElementById('loop-clear-btn').addEventListener('click', clearLoop);
document.querySelectorAll('.loop-speed-btn').forEach(btn => {
  btn.addEventListener('click', () => setPlaybackSpeed(parseFloat(btn.dataset.speed)));
});

// ── Shortcut Help ──
document.getElementById('shortcut-help-btn').addEventListener('click', () => {
  document.getElementById('shortcut-overlay').classList.toggle('hidden');
});

// ═══════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════

updateDiatonicPreview();
buildFretboard();
buildFretboard2();
renderFretboard();
applyFbZoom(fbZoomSlider.value);
openHistoryDB().then(() => renderHistoryUI()).catch(() => renderHistoryUI());
registerShortcutHandler();
