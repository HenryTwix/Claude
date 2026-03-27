# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workspace

Guitar/music 학습 도구 프로젝트. 모듈화된 ES6+ 프론트엔드 앱.
빌드 도구 없음 — Live Server(5501)로 실행. `<script type="module">` 사용.

### 프로젝트 구조
```
index.html          — HTML 구조 (~400줄)
css/
  base.css          — CSS 변수, 리셋, 레이아웃
  fretboard.css     — 지판 그리드, 노트 닷 색상
  controls.css      — 토글, 입력, 루프, 단축키 오버레이
  panels.css        — Now Playing, improv, voicing, song map, history
js/
  state.js          — 상수 + 공유 상태 객체 S
  theory.js         — 코드 식별, 키 감지, 스케일
  fretboard.js      — 지판 빌드/렌더링
  display.js        — Now Playing UI
  voicing.js        — 운지 데이터, SVG
  improv.js         — 타임라인, 아르페지오, 릭
  songmap.js        — 곡 구조 분석
  sync.js           — RAF 싱크 루프
  media.js          — MIDI/비디오 로딩
  history.js        — IndexedDB 히스토리
  loop.js           — A-B 연습 루프
  shortcuts.js      — 키보드 단축키
  app.js            — 진입점, 이벤트 와이어링
```

### 모듈 의존성 (순환 없음)
state → theory → {fretboard, display, voicing, songmap} → improv → sync → {media, shortcuts} → app

### 공유 상태
`import { S } from './state.js'` — 모든 모듈이 S 객체 참조로 상태 공유.

### 순환 의존성 해결
- media ↔ history: 콜백 레지스트리 (`registerMediaCallbacks`, `registerHistoryCallback`)
- voicing → improv: `onVoicingChange()` 콜백 (app.js에서 등록)

---

## Project Overview

**MIDI-Synced Non-Diatonic Scale Visualizer** — 유튜브 영상과 Chordify MIDI를 동기화하여 21프렛 기타 지판에 실시간 음계 표시. 논-다이아토닉 구간의 변경된 음을 시각적으로 강조.

### Tech Stack
- HTML5, CSS3 (Tailwind CDN), ES6+ Modules (빌드 도구 없음)
- @tonejs/midi (CDN, `window.Midi`) — MIDI 파싱
- YouTube IFrame Player API (`window.YT`) + HTML5 `<video>` — 영상 재생
- IndexedDB — MIDI/영상 blob 저장 | localStorage — 메타데이터, 운지 선호도

---

## 상세 레퍼런스 (docs/)

코드 수정 시 관련 문서를 참조:

| 문서 | 내용 | 참조 시점 |
|------|------|-----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 모듈 의존성, 데이터 플로우, 상태 변수 | 모듈 구조/상태 변경 시 |
| [docs/FUNCTIONS.md](docs/FUNCTIONS.md) | 핵심 함수 레퍼런스 테이블 | 함수 수정/추가 시 |
| [docs/MUSIC-THEORY.md](docs/MUSIC-THEORY.md) | 코드 식별, 스케일, 색상 규칙, 판정 로직 | 음악 이론/렌더링 로직 수정 시 |
| [docs/UI-GUIDE.md](docs/UI-GUIDE.md) | 레이아웃, 토글 버튼, 단축키, Now Playing | UI/컨트롤 수정 시 |
| [docs/FEATURES.md](docs/FEATURES.md) | History, Improv, Song Map, Practice Loop 상세 | 기능별 상세 동작 확인 시 |

---

## 핵심 규칙 (항상 준수)

### MIDI 업로드 UI
- `drop-zone`은 `<label>` + `<input type="file">` 구조 → JS에서 `midiInput.click()` 호출 불필요 (중복 다이얼로그 버그)

### 논-다이아토닉 판정
- 모든 판정에서 **근음 포함** 전체 코드톤을 다이아토닉 Set과 비교
- `replacedDiatonic` 계산에서만 **근음 제외** (인접 다이아토닉 음 보존)

### 펜타토닉 모드
- **Master Key 루트에 고정** (코드별 루트 아님)
- WITH-PENTA와 **상호 배타** — 하나 켜면 다른 하나 OFF

### 수동 모드 (chordMode = false)
- `masterKeyRoot`/`masterKeyMode` 값을 그대로 사용, Minor → Natural Minor, Major → Major 스케일

---

## 자연어 커맨드 매핑

사용자가 아래와 같은 표현을 사용하면 해당 슬래시 커맨드를 실행:

| 트리거 표현 | 실행 |
|-------------|------|
| "깃푸쉬", "깃 푸쉬", "git push", "깃에 푸쉬해줘", "푸쉬해줘", "커밋하고 푸쉬" | `/push` |
