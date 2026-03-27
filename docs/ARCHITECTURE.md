# Architecture

## Module Dependency Graph

```
Level 0: state.js          (상수 + 공유 상태 객체 S)
Level 1: theory.js          → state
         loop.js            → state
Level 2: voicing.js         → state
         fretboard.js       → state, theory
         display.js         → state, theory
         songmap.js         → state, theory
Level 3: improv.js          → state, theory, voicing
Level 4: sync.js            → state, theory, display, fretboard, improv, songmap
Level 5: media.js           → state, theory, sync, songmap, display, fretboard, voicing
         history.js         → state, display, fretboard (media는 콜백)
         shortcuts.js       → state, sync, loop
Level 6: app.js             → 전체 (진입점)
```

## Callback Bridges (순환 방지)

| Bridge | 위치 | 등록 |
|--------|------|------|
| media ↔ history | `registerMediaCallbacks()` in history.js / `registerHistoryCallback()` in media.js | app.js |
| voicing → improv | `onVoicingChange()` in voicing.js | app.js |

## Shared State Pattern

```js
// state.js
export const S = { masterKeyRoot: 'C', ... };
```

모든 모듈이 `import { S } from './state.js'`로 읽기/쓰기. 단일 객체 참조로 변경사항 즉시 공유.

## Data Flow

```
User Action → app.js (event handler)
  → S.* 상태 변경
  → 관련 모듈 함수 호출
  → DOM 업데이트

MIDI Sync Loop:
  sync.js tick() → rawVideoTime 읽기
    → A-B Loop 체크
    → syncToTime(t)
      → S.currentChordInfo 업데이트
      → updateChordDisplay() [display]
      → renderFretboard() [fretboard]
      → updateUpcomingChords() [display]
      → renderNextFretboard() [fretboard]
      → updateImprovTools() [improv]
      → updateSongMapHighlight() [songmap]
```

## File Responsibilities

| File | 역할 | 크기 |
|------|------|------|
| state.js | 상수 + S 객체 | ~107줄 |
| theory.js | 음악 이론 순수 함수 | ~149줄 |
| fretboard.js | 지판 구축/렌더링 | ~208줄 |
| display.js | Now Playing UI 업데이트 | ~111줄 |
| voicing.js | 운지 데이터/SVG/선호도 | ~167줄 |
| improv.js | 즉흥 연주 도구 전체 | ~282줄 |
| songmap.js | 곡 구조 분석/표시 | ~139줄 |
| sync.js | RAF 싱크 루프 | ~81줄 |
| media.js | MIDI/비디오 로딩 | ~144줄 |
| history.js | IndexedDB 히스토리 | ~174줄 |
| loop.js | A-B 연습 루프 | ~72줄 |
| shortcuts.js | 키보드 단축키 | ~55줄 |
| app.js | 진입점/이벤트/초기화 | ~233줄 |

---

## 주요 상태 변수 (S 객체)

### 코어 상태
```js
S.masterKeyRoot      // Master Key 루트 음 (예: 'E')
S.masterKeyMode      // 'Major' | 'Minor'
S.currentChordInfo   // { name, rootPc, notePCs } — 현재 재생 중인 코드
S.nextChordInfo      // { name, rootPc, notePCs } — 다음 코드
S.midiChordEvents    // [{ time, notePCs, chord }] — 사전 계산된 전체 코드 이벤트
S.midiData           // 전체 MIDI 파싱 객체 (@tonejs/midi)
S.currentEventIdx    // midiChordEvents 내 현재 인덱스
S.chordMode          // true = MIDI 싱크, false = 수동 모드
S.videoMode          // 'youtube' | 'local'
S.syncOffset         // ms 단위 영상/MIDI 싱크 오프셋
```

### Improv / Voicing
```js
S.improvVisible      // Improvisation Tools 패널 표시
S.improvTab          // 'timeline' | 'voicing' | 'arpeggio' | 'both' | 'lick'
S.voicingPrefs       // { chordName: voicingIndex } — 곡별 운지 선호도
S.lastSelectedBaseFret // 직전 코드 baseFret — 근접성 추적
S.arpPatternIdx      // 아르페지오 패턴 인덱스 (0-4)
```

### 미디어 / 히스토리
```js
S.currentMidiFile    // { name, blob }
S.currentVideoSource // { type, source, blob? }
S.songSections       // 감지된 곡 구조 섹션 배열
S.ytPlayer           // YouTube IFrame API 플레이어
S.rafId              // requestAnimationFrame ID
S.lastEventTime      // 중복 렌더 방지용
```

### 표시 모드 토글 (boolean)
```js
S.showNoteNames      // 도수 ↔ 음계 전환
S.pentatonicMode     // 펜타토닉 음만 표시
S.chordOnlyMode      // 코드톤만 표시
S.grayMode           // 단일 회색 모드
S.preNonDMode        // Pre-NonD ghost 미리보기
S.approachNoteMode   // 어프로치 노트 표시
S.withPentaMode      // 다이아토닉 + 펜타토닉 구분 모드
S.songMapVisible     // Song Map 패널 표시
```

### Practice Loop
```js
S.loopA              // 루프 시작점 (raw video seconds), -1 = 미설정
S.loopB              // 루프 끝점, -1 = 미설정
S.loopActive         // A-B 루프 활성화 여부
```
