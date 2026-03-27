# Feature Details

## History (최근 기록)

### 저장 구조
- **localStorage** (`chordSyncHistory`): 메타데이터 배열 (최대 5개, 최신순)
  - `id`: `midiFileName|videoType|videoSource` — 중복 판별 키
  - `midiName`, `videoType`, `videoSource`, `syncOffset`, `masterKeyRoot`, `masterKeyMode`, `timestamp`
- **IndexedDB** (`ChordSyncFiles`): MIDI blob + 로컬 영상 blob
  - 키: `midi:{id}`, `video:{id}`

### 동작 흐름
- `loadMidi()` 완료 → `currentMidiFile` 세팅 → `saveToHistory()`
- `loadYoutube()` / `loadLocalVideo()` → `currentVideoSource` 세팅 → `saveToHistory()`
- 둘 다 있을 때만 저장, 동일 조합은 타임스탬프만 갱신
- `loadFromHistory(entry)`: MIDI 로드 → 설정 복원 → 영상 로드
- 5개 초과 시 가장 오래된 항목 blob까지 자동 삭제

---

## Practice Loop (A-B 구간 반복)

### 기능
- 어려운 코드 전환 구간을 반복 재생하여 집중 연습
- YouTube / 로컬 영상 모두 지원
- 재생 속도 조절 (0.5x, 0.75x, 1x)

### 동작 흐름
1. 재생 중 시작점에서 `A` → `loopA` 설정
2. 끝점에서 `B` → `loopB` 설정
3. `L`로 루프 활성화 → `loopActive = true`
4. `tick()` 함수에서 `rawTime >= loopB`일 때 `loopA`로 자동 점프
5. Speed 버튼으로 `playbackRate` 변경
6. `X`로 초기화

### 구현 위치
- 상태: `loopA`, `loopB`, `loopActive` (S 객체)
- UI: Controls Row 1.5
- 루프 체크: `startSyncLoop()` → `tick()` 내부, syncOffset 적용 전

---

## Improvisation Tools

### 탭 구성 (5개)
1. **Timeline** — 코드 진행 타임라인 + 각 코드별 운지 다이어그램
2. **Voicing** — 현재 코드 운지 카드 (클릭으로 선호 운지 설정)
3. **Arpeggio** — 5가지 아르페지오 패턴 TAB
4. **Both** — Voicing + Arpeggio 동시 표시
5. **Lick** — 코드 타입별 릭 라이브러리

### 코드 운지표 (Chord Voicing Diagram)
- `VOICING_SHAPES`: 코드 타입별 이동 가능 운지 형태 (17개 타입)
  - `rootStr`: 근음 기준 줄 (0=6번줄, 1=5번줄)
  - `rel[]`: 근음 프렛 기준 상대 프렛 오프셋
- `getBaseFret()`: 루트 피치클래스 → 해당 줄의 실제 프렛
- `renderVoicingSVG()`: 운지 → SVG 다이어그램 (너트, 프렛, 바레, 근음 표시)

### 운지 선택 시스템
- `pickBestVoicing()`:
  1. 유저 설정 선호 운지 (`voicingPrefs[chordName]`) 우선
  2. 없으면 직전 baseFret에 가장 가까운 운지 (최소 이동)
  3. `lastSelectedBaseFret` 추적으로 연속 포지션 유지
- 운지표 탭에서 카드 클릭 → `setVoicingPref()` → 타임라인 즉시 반영
- `voicingPrefs`는 MIDI 파일명 기준 localStorage 저장/복원 (`chordSyncVoicingPrefs`)

### 아르페지오 패턴 TAB
- `ARP_PATTERNS`: 5가지 (상행, 하행, 상행+하행, 1-3-5-3, 스위프)
- `getArpeggioNotes()`: 코드톤 기준 6현×12프렛에서 1옥타브 음 추출
- `renderArpTab()`: TAB 문자열, 근음(빨간)/논-다이아(황금) 하이라이트
- 이전/다음 버튼으로 패턴 순환

### 릭 라이브러리 (Lick Library)
- `LICK_LIBRARY`: 5개 카테고리, 총 14개 릭
  - `minor` (4): Blues pentatonic, BB King, Dorian, Triplet
  - `major` (3): Country pentatonic, Chuck Berry, Lydian
  - `dom7` (4): Blues box, Mixolydian, SRV, Whole tone
  - `dim` (1): Diminished arpeggio
  - `nondiatonic` (2): Chromatic approach, Borrowed chord
- 릭 데이터: `{ name, style, difficulty(★), desc, refRootPc, notes: [{s,f,mod}] }`
- Am 기준 릭을 현재 키로 트랜스포즈

### 포지션 가이드
- 메인 지판 위 반투명 인디고 오버레이 (`pos-zone`)
- 6번줄 근음 기준 4-5프렛 범위 추천 포지션
- 코드 변경 시 자동 이동 (CSS transition)

---

## Song Map (곡 구조 분석)

### 감지 알고리즘 (`detectSongSections`)
- MIDI 코드 이벤트를 4코드 단위로 그룹화
- 반복 패턴 식별 → 섹션 라벨 (Chorus, Verse, Pre-Chorus, Bridge, Intro, Outro, Other)
- 가장 많이 반복 → Chorus, 두 번째 → Verse 자동 분류

### UI 구성
- 섹션별 색상 배지 (`.sc-badge-*`) + 코드 카드
- 코드 카드 클릭 → `seekVideoTo(timeSec)` 영상 이동
- 재생 중 현재 코드 하이라이트 (`.sc-active`) + 자동 스크롤

### 통계
- 섹션별 논-다이아토닉 비율(%)
- 유니크 코드 수
- 섹션 총 듀레이션

---

## Key Logic Details

### MIDI 사전 계산
- `loadMidi()` 시 모든 이벤트에 `ev.chord = identifyChord(ev.notePCs)` 저장
- `syncToTime()`에서 재사용 → 실시간 연산 최소화

### 논-다이아토닉 대체음 제거
- 논-다이아 코드톤(예: Eb) → 반음 위/아래 다이아토닉 음(예: E)을 `replacedDiatonic`으로 숨김

### Pre-NonD 미리보기
- 다음 코드가 논-다이아토닉일 때만 활성화
- `ghostPCSet` = 다음 코드 notePCs 중 다이아토닉에 없는 음
- 펜타토닉 ON 시: ghostPCSet ∩ pentaSet (penta-match 예고만)
- 현재 지판 빈 자리에만 `.ndot.ghost`로 표시

### WITH-PENTA 모드
- 다이아토닉 전체 + 펜타/비-펜타 색상 구분
- 근음은 **Master Key 루트만** 표시 (코드 근음 아님)
- 논-다이아 코드 시:
  - 펜타 + 코드톤 일치 → `penta-match`
  - 펜타 + 코드톤 ±1 충돌 → `wp-penta-avoid`
  - 비-펜타 다이아 + 코드톤 ±1 충돌 → `wp-scale-avoid`
- grayMode 후처리 스킵 (자체 색상 체계)

### 어프로치 노트 모드
- 코드톤의 반음 아래(크로매틱) 음 → `→` 라벨
- 재즈/비밥 어프로치 노트 시각화
- `.ndot.approach` 스타일

### 로컬 영상 재생
- `loadLocalVideo(file)`: Object URL → `<video>` src → play/pause 바인딩
- `tick()`에서 `videoMode === 'local'` 분기: `<video>.currentTime` 사용
- MIDI 로드 시 로컬 비디오 재생 중이면 즉시 싱크 루프 시작

### 상수 데이터 요약
- `NOTE_NAMES`: 12 피치 클래스명
- `OPEN_NOTES`: 표준 튜닝 MIDI (6현)
- `TOTAL_FRETS`: 21
- `CHORD_TYPES`: 17개 코드 타입
- `CHORD_IV_LABELS`: 도수 라벨 (R, ♭2, 2, ♭3, 3, 4, ♭5, 5, ♭6, 6, ♭7, △7)
- `DIATONIC_IVS`: Major/Minor 다이아토닉 인터벌 Set
- `PENTA_MAJOR`: [0,2,4,7,9] / `PENTA_MINOR`: [0,3,5,7,10]
- `SCALES`: Major, Natural Minor, Major/Minor Pentatonic, Blues, Dorian, Mixolydian
- `VOICING_SHAPES`: 코드 타입별 운지 형태
- `ARP_PATTERNS`: 5가지 아르페지오 패턴
- `LICK_LIBRARY`: 5 카테고리 × 14개 릭
