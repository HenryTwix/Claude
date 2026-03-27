import { S } from './state.js';
import { seekVideoTo } from './sync.js';
import { setLoopA, setLoopB, toggleLoop, clearLoop } from './loop.js';

export function toggleVideoPlayPause() {
  if (S.videoMode === 'local') {
    const v = document.getElementById('local-video');
    if (!v) return;
    v.paused ? v.play() : v.pause();
  } else if (S.ytPlayer) {
    try {
      const st = S.ytPlayer.getPlayerState();
      st === 1 ? S.ytPlayer.pauseVideo() : S.ytPlayer.playVideo();
    } catch(_){}
  }
}

export function jumpToChord(direction) {
  if (S.currentEventIdx < 0 || !S.midiChordEvents.length) return;
  const newIdx = S.currentEventIdx + direction;
  if (newIdx < 0 || newIdx >= S.midiChordEvents.length) return;
  const ev = S.midiChordEvents[newIdx];
  if (ev) seekVideoTo(ev.time);
}

export function registerShortcutHandler() {
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    const key = e.key;
    if (key === '?') {
      e.preventDefault();
      document.getElementById('shortcut-overlay').classList.toggle('hidden');
      return;
    }
    if (key === 'Escape') {
      document.getElementById('shortcut-overlay').classList.add('hidden');
      return;
    }
    if (key === ' ') { e.preventDefault(); toggleVideoPlayPause(); return; }
    if (key === 'ArrowLeft')  { e.preventDefault(); jumpToChord(-1); return; }
    if (key === 'ArrowRight') { e.preventDefault(); jumpToChord(1); return; }
    const toggleMap = {
      '1':'label-toggle','2':'penta-toggle','3':'with-penta-toggle',
      '4':'chord-only-toggle','5':'gray-toggle','6':'pre-nond-toggle',
      '7':'approach-toggle','8':'next-fb-toggle','9':'improv-toggle','0':'song-map-toggle',
    };
    if (toggleMap[key]) { e.preventDefault(); document.getElementById(toggleMap[key])?.click(); return; }
    const lk = key.toLowerCase();
    if (lk === 'a') { e.preventDefault(); setLoopA(); return; }
    if (lk === 'b') { e.preventDefault(); setLoopB(); return; }
    if (lk === 'l') { e.preventDefault(); toggleLoop(); return; }
    if (lk === 'x') { e.preventDefault(); clearLoop(); return; }
  });
}
