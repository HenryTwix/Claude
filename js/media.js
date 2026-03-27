import { S } from './state.js';
import { identifyChord, extractChordEvents, detectKeyFromChords } from './theory.js';
import { startSyncLoop, stopSyncLoop } from './sync.js';
import { detectSongSections, buildSongMap, resetScActiveIdx } from './songmap.js';
import { updateDiatonicPreview, syncToggleUI, updateBpmDisplay } from './display.js';
import { renderFretboard } from './fretboard.js';
import { loadVoicingPrefs } from './voicing.js';

let _saveToHistory = null;
export function registerHistoryCallback(cb) { _saveToHistory = cb; }

export function showMidiStatus(msg, cls) {
  const el = document.getElementById('midi-status');
  el.textContent = msg;
  el.className = `text-xs text-center ${cls}`;
  el.classList.remove('hidden');
}

export function renderMidiInfo() {
  if (!S.midiData) return;
  const bpm      = S.midiData.header.tempos[0]?.bpm?.toFixed(1) ?? '—';
  const duration = S.midiData.duration.toFixed(1);
  const trackNames = S.midiData.tracks
    .map((t, i) => `<span class="text-gray-500">${i+1}.</span> ${t.name||'(unnamed)'} <span class="text-gray-600">(${t.notes.length} notes)</span>`)
    .join('<br>');
  const body = document.getElementById('midi-info-body');
  body.innerHTML = `
    <p><span class="text-gray-500">BPM:</span> ${bpm}</p>
    <p><span class="text-gray-500">트랙 수:</span> ${S.midiData.tracks.length}</p>
    <p><span class="text-gray-500">길이:</span> ${duration}초</p>
    <p><span class="text-gray-500">코드 이벤트:</span> ${S.midiChordEvents.length}개</p>
    <p class="pt-1"><span class="text-gray-500">트랙 목록:</span><br>${trackNames}</p>`;
  document.getElementById('midi-info').classList.remove('hidden');
}

export async function loadMidi(file) {
  try {
    const buf = await file.arrayBuffer();
    S.midiData        = new window.Midi(buf);
    S.midiChordEvents = extractChordEvents(S.midiData);
    S.lastEventTime   = -1;
    S.currentEventIdx = -1;
    S.midiChordEvents.forEach(ev => { ev.chord = identifyChord(ev.notePCs); });
    if (S.midiChordEvents.length) {
      const detected = detectKeyFromChords(S.midiChordEvents);
      S.masterKeyRoot = detected.root;
      S.masterKeyMode = detected.mode;
      document.getElementById('master-key-root').value = S.masterKeyRoot;
      document.getElementById('master-key-mode').value = S.masterKeyMode;
      updateDiatonicPreview();
      renderFretboard();
    }
    showMidiStatus(
      `✓ ${file.name} — ${S.midiChordEvents.length}개 코드 이벤트 파싱됨 · 감지된 키: ${S.masterKeyRoot} ${S.masterKeyMode}`,
      'text-green-400'
    );
    renderMidiInfo();
    updateBpmDisplay();
    syncToggleUI();
    S.songSections = detectSongSections(S.midiChordEvents);
    resetScActiveIdx();
    buildSongMap();
    S.currentMidiFile = { name: file.name, blob: new Blob([buf]) };
    loadVoicingPrefs();
    if (_saveToHistory) _saveToHistory();
    if (S.ytPlayer && typeof S.ytPlayer.getPlayerState === 'function') {
      try {
        if (S.ytPlayer.getPlayerState() === 1 && S.midiChordEvents.length) {
          S.chordMode = true;
          startSyncLoop();
        }
      } catch (_) {}
    }
    if (S.videoMode === 'local' && S.midiChordEvents.length) {
      const lv = document.getElementById('local-video');
      if (lv && !lv.paused && !lv.ended) {
        S.chordMode = true;
        startSyncLoop();
      }
    }
  } catch (err) {
    showMidiStatus(`오류: ${err.message}`, 'text-red-400');
  }
}

export function extractVideoId(input) {
  input = input.trim();
  for (const re of [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ]) {
    const m = input.match(re);
    if (m) return m[1];
  }
  return null;
}

export function loadYoutube() {
  const rawUrl = document.getElementById('yt-url').value;
  const vid = extractVideoId(rawUrl);
  if (!vid) { alert('유효한 YouTube URL 또는 영상 ID를 입력하세요.'); return; }
  document.getElementById('yt-player-wrap').classList.remove('hidden');
  S.currentVideoSource = { type: 'youtube', source: rawUrl.trim() };
  if (_saveToHistory) _saveToHistory();
  if (S.ytPlayer) {
    S.ytPlayer.loadVideoById(vid);
  } else {
    S.ytPlayer = new window.YT.Player('yt-player', {
      videoId: vid, width: '100%', height: '100%',
      playerVars: { rel: 0 },
      events: { onReady: () => console.log('YouTube player ready'), onStateChange: onPlayerStateChange },
    });
  }
}

export function loadLocalVideo(file) {
  const lv = document.getElementById('local-video');
  if (lv.src) URL.revokeObjectURL(lv.src);
  lv.src = URL.createObjectURL(file);
  lv.classList.remove('hidden');
  const fn = document.getElementById('video-filename');
  fn.textContent = file.name;
  fn.classList.remove('hidden');
  lv.onplay = () => {
    if (S.midiChordEvents.length) { S.chordMode = true; startSyncLoop(); }
  };
  lv.onpause = lv.onended = () => {
    stopSyncLoop();
    document.getElementById('sync-indicator').classList.add('hidden');
    document.getElementById('sync-mode-label').textContent = lv.ended ? 'Ended' : 'Paused';
  };
  S.currentVideoSource = { type: 'local', source: file.name, blob: file };
  if (_saveToHistory) _saveToHistory();
}

export function onPlayerStateChange(e) {
  if (e.data === window.YT.PlayerState.PLAYING) {
    if (S.midiChordEvents.length) { S.chordMode = true; startSyncLoop(); }
  } else if (e.data === window.YT.PlayerState.PAUSED || e.data === window.YT.PlayerState.ENDED) {
    stopSyncLoop();
    document.getElementById('sync-indicator').classList.add('hidden');
    document.getElementById('sync-mode-label').textContent =
      e.data === window.YT.PlayerState.ENDED ? 'Ended' : 'Paused';
  }
}

// ═══════════════════════════════════════════════════════════
// Chrome Extension Bridge — window.postMessage receiver
// ═══════════════════════════════════════════════════════════

function _base64ToBuf(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

window.addEventListener('message', async (e) => {
  if (e.data?.type !== 'chord-sync-bridge-midi') return;
  const { midi, filename, youtubeId } = e.data;
  try {
    // Decode base64 → ArrayBuffer → File
    const buf = _base64ToBuf(midi);
    const blob = new Blob([buf], { type: 'audio/midi' });
    const file = new File([blob], filename || 'chordify.mid', { type: 'audio/midi' });
    await loadMidi(file);
    showMidiStatus(
      `🔗 ${filename} — 브라우저 확장에서 수신`,
      'text-indigo-400'
    );

    // Auto-load YouTube video if ID provided
    if (youtubeId) {
      S.videoMode = 'youtube';
      document.getElementById('tab-youtube').className = 'px-3 py-1 bg-indigo-600 text-white transition-colors';
      document.getElementById('tab-local').className = 'px-3 py-1 bg-gray-800 text-gray-400 hover:text-gray-200 transition-colors';
      document.getElementById('panel-youtube').classList.remove('hidden');
      document.getElementById('panel-local').classList.add('hidden');
      document.getElementById('yt-url').value = `https://www.youtube.com/watch?v=${youtubeId}`;
      loadYoutube();
    }
  } catch (err) {
    showMidiStatus(`확장 수신 오류: ${err.message}`, 'text-red-400');
  }
});
