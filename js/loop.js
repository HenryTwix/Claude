import { S } from './state.js';

export function formatLoopTime(sec) {
  if (sec < 0) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function getCurrentVideoTime() {
  if (S.videoMode === 'local') {
    const v = document.getElementById('local-video');
    return v ? v.currentTime : -1;
  } else if (S.ytPlayer) {
    try { return S.ytPlayer.getCurrentTime(); } catch(_) { return -1; }
  }
  return -1;
}

export function updateLoopUI() {
  const aBtn = document.getElementById('loop-a-btn');
  const bBtn = document.getElementById('loop-b-btn');
  const aTime = document.getElementById('loop-a-time');
  const bTime = document.getElementById('loop-b-time');
  const toggleBtn = document.getElementById('loop-toggle-btn');
  if (aBtn) aBtn.classList.toggle('loop-set', S.loopA >= 0);
  if (bBtn) bBtn.classList.toggle('loop-set', S.loopB >= 0);
  if (aTime) aTime.textContent = formatLoopTime(S.loopA);
  if (bTime) bTime.textContent = formatLoopTime(S.loopB);
  if (toggleBtn) toggleBtn.classList.toggle('loop-on', S.loopActive);
}

export function setLoopA() {
  const t = getCurrentVideoTime();
  if (t < 0) return;
  S.loopA = t;
  if (S.loopB >= 0 && S.loopB <= S.loopA) S.loopB = -1;
  updateLoopUI();
}

export function setLoopB() {
  const t = getCurrentVideoTime();
  if (t < 0) return;
  S.loopB = t;
  if (S.loopA < 0 || S.loopA >= S.loopB) S.loopA = 0;
  updateLoopUI();
}

export function toggleLoop() {
  if (S.loopA < 0 || S.loopB <= S.loopA) return;
  S.loopActive = !S.loopActive;
  updateLoopUI();
}

export function clearLoop() {
  S.loopA = -1;
  S.loopB = -1;
  S.loopActive = false;
  updateLoopUI();
}

export function setPlaybackSpeed(speed) {
  if (S.videoMode === 'local') {
    const v = document.getElementById('local-video');
    if (v) v.playbackRate = speed;
  } else if (S.ytPlayer) {
    try { S.ytPlayer.setPlaybackRate(speed); } catch(_){}
  }
  document.querySelectorAll('.loop-speed-btn').forEach(btn => {
    btn.classList.toggle('speed-active', parseFloat(btn.dataset.speed) === speed);
  });
}
