import { S } from './state.js';
import { updateDiatonicPreview, syncToggleUI } from './display.js';
import { renderFretboard } from './fretboard.js';

const HISTORY_KEY = 'chordSyncHistory';
const HISTORY_MAX = 5;
const HIST_DB_NAME = 'ChordSyncFiles';
const HIST_DB_VER = 1;
let historyDB = null;

let _media = { loadMidi: null, loadYoutube: null, loadLocalVideo: null };
export function registerMediaCallbacks(cbs) { _media = { ..._media, ...cbs }; }

export function openHistoryDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HIST_DB_NAME, HIST_DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
    };
    req.onsuccess = e => { historyDB = e.target.result; resolve(historyDB); };
    req.onerror = e => reject(e.target.error);
  });
}

function dbPut(key, blob) {
  return new Promise((resolve, reject) => {
    const tx = historyDB.transaction('files', 'readwrite');
    tx.objectStore('files').put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}

function dbGet(key) {
  return new Promise((resolve, reject) => {
    const tx = historyDB.transaction('files', 'readonly');
    const req = tx.objectStore('files').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = e => reject(e.target.error);
  });
}

function dbDelete(key) {
  return new Promise((resolve, reject) => {
    const tx = historyDB.transaction('files', 'readwrite');
    tx.objectStore('files').delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = e => reject(e.target.error);
  });
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}
function setHistory(list) { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); }

export async function saveToHistory() {
  if (!S.currentMidiFile || !S.currentVideoSource) return;
  try {
    if (!historyDB) await openHistoryDB();
    const entryId = S.currentMidiFile.name + '|' + S.currentVideoSource.type + '|' + S.currentVideoSource.source;
    let list = getHistory();
    const oldIdx = list.findIndex(e => e.id === entryId);
    if (oldIdx >= 0) list.splice(oldIdx, 1);
    list.unshift({
      id: entryId, midiName: S.currentMidiFile.name,
      videoType: S.currentVideoSource.type, videoSource: S.currentVideoSource.source,
      syncOffset: S.syncOffset, masterKeyRoot: S.masterKeyRoot, masterKeyMode: S.masterKeyMode,
      timestamp: Date.now(),
    });
    while (list.length > HISTORY_MAX) {
      const removed = list.pop();
      await dbDelete('midi:' + removed.id).catch(() => {});
      if (removed.videoType === 'local') await dbDelete('video:' + removed.id).catch(() => {});
    }
    await dbPut('midi:' + entryId, S.currentMidiFile.blob);
    if (S.currentVideoSource.type === 'local' && S.currentVideoSource.blob)
      await dbPut('video:' + entryId, S.currentVideoSource.blob);
    setHistory(list);
    renderHistoryUI();
  } catch (err) { console.warn('History save failed:', err); }
}

export async function loadFromHistory(entry) {
  try {
    if (!historyDB) await openHistoryDB();
    const midiBlob = await dbGet('midi:' + entry.id);
    if (!midiBlob) { alert('저장된 MIDI 파일을 찾을 수 없습니다.'); return; }
    const midiFile = new File([midiBlob], entry.midiName, { type: 'audio/midi' });
    if (_media.loadMidi) await _media.loadMidi(midiFile);
    if (entry.syncOffset != null) {
      S.syncOffset = entry.syncOffset;
      document.getElementById('sync-offset').value = S.syncOffset;
      document.getElementById('sync-offset-val').textContent = `${S.syncOffset >= 0 ? '+' : ''}${S.syncOffset} ms`;
    }
    if (entry.masterKeyRoot) { S.masterKeyRoot = entry.masterKeyRoot; document.getElementById('master-key-root').value = S.masterKeyRoot; }
    if (entry.masterKeyMode) { S.masterKeyMode = entry.masterKeyMode; document.getElementById('master-key-mode').value = S.masterKeyMode; }
    updateDiatonicPreview();
    syncToggleUI();
    renderFretboard();
    if (entry.videoType === 'youtube') {
      document.getElementById('tab-youtube').click();
      document.getElementById('yt-url').value = entry.videoSource;
      if (_media.loadYoutube) _media.loadYoutube();
    } else if (entry.videoType === 'local') {
      const videoBlob = await dbGet('video:' + entry.id);
      if (videoBlob) {
        document.getElementById('tab-local').click();
        const videoFile = new File([videoBlob], entry.videoSource, { type: videoBlob.type || 'video/mp4' });
        if (_media.loadLocalVideo) _media.loadLocalVideo(videoFile);
      } else {
        alert('로컬 영상 파일을 찾을 수 없습니다.');
        document.getElementById('tab-local').click();
      }
    }
    let list = getHistory();
    const idx = list.findIndex(e => e.id === entry.id);
    if (idx > 0) { list.unshift(list.splice(idx, 1)[0]); setHistory(list); renderHistoryUI(); }
  } catch (err) { console.error('History load failed:', err); alert('기록을 불러오는 중 오류가 발생했습니다.'); }
}

export async function deleteHistoryEntry(index) {
  try {
    if (!historyDB) await openHistoryDB();
    let list = getHistory();
    if (index < 0 || index >= list.length) return;
    const removed = list.splice(index, 1)[0];
    await dbDelete('midi:' + removed.id).catch(() => {});
    if (removed.videoType === 'local') await dbDelete('video:' + removed.id).catch(() => {});
    setHistory(list);
    renderHistoryUI();
  } catch (err) { console.warn('History delete failed:', err); }
}

export async function clearAllHistory() {
  try {
    if (!historyDB) await openHistoryDB();
    const list = getHistory();
    for (const e of list) {
      await dbDelete('midi:' + e.id).catch(() => {});
      if (e.videoType === 'local') await dbDelete('video:' + e.id).catch(() => {});
    }
    setHistory([]);
    renderHistoryUI();
  } catch (err) { console.warn('History clear failed:', err); }
}

export function renderHistoryUI() {
  const container = document.getElementById('history-list');
  const clearBtn = document.getElementById('history-clear');
  if (!container) return;
  const list = getHistory();
  if (!list.length) {
    container.innerHTML = '<span class="text-xs text-gray-600">아직 기록이 없습니다</span>';
    if (clearBtn) clearBtn.classList.add('hidden');
    return;
  }
  if (clearBtn) clearBtn.classList.remove('hidden');
  container.innerHTML = list.map((e, i) => {
    const d = new Date(e.timestamp);
    const timeStr = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
    const icon = e.videoType === 'youtube' ? '&#9654;' : '&#128193;';
    return `<div class="history-item" data-hist-idx="${i}">
      <div class="history-item-main">
        <span class="history-midi">${e.midiName}</span>
        <span class="history-video">${icon} ${e.videoSource}</span>
      </div><div class="history-meta">
        <span class="history-key">${e.masterKeyRoot||'?'} ${e.masterKeyMode||''}</span>
        <span class="history-time">${timeStr}</span>
      </div><button class="history-delete" data-hist-del="${i}" title="삭제">&times;</button></div>`;
  }).join('');
}
