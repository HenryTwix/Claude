# Function Reference

## 지판 렌더링

| 함수 | 위치 | 역할 |
|------|------|------|
| `_buildFretboard(containerId, prefix)` | fretboard.js | 지판 HTML 생성 + 셀 캐시 반환 |
| `buildFretboard()` / `buildFretboard2()` | fretboard.js | fbCells / fbCells2 초기화 |
| `_renderCells(cells, chordInfoParam, ghostPCSet)` | fretboard.js | 지판 렌더링 핵심 로직 |
| `renderFretboard()` | fretboard.js | 현재 코드 지판 렌더 + ghostPCSet 계산 |
| `renderNextFretboard(nextIdx)` | fretboard.js | 다음 코드 지판 렌더 |
| `fretFlex(f)` | fretboard.js | 프렛별 유동 너비 계산 |

## 음악 이론 / 분석

| 함수 | 위치 | 역할 |
|------|------|------|
| `identifyChord(notePCs)` | theory.js | 피치 클래스 배열 → 코드명/루트 식별 |
| `detectKeyFromChords(chordEvents)` | theory.js | Krumhansl-Schmuckler 조성 감지 |
| `getDiatonicSet(rootName, mode)` | theory.js | 다이아토닉 피치 클래스 Set 반환 |
| `getDiatonicNames(rootName, mode)` | theory.js | 다이아토닉 음이름 배열 반환 |
| `getChordRomanNumeral(rootPc, chordSuffix)` | theory.js | 로마 숫자 코드 기능 (V7, vi 등) |
| `getScaleSuggestions(rootPc, chordSuffix, notePCs)` | theory.js | 추천 스케일 반환 |
| `detectSongSections(events)` | songmap.js | 4코드 패턴 반복으로 곡 구조 감지 |

## 싱크 & 재생

| 함수 | 위치 | 역할 |
|------|------|------|
| `syncToTime(t)` | sync.js | 재생 시간 → binary search → 렌더 트리거 |
| `startSyncLoop()` / `stopSyncLoop()` | sync.js | RAF 싱크 루프 시작/종료 |
| `onPlayerStateChange(e)` | media.js | YouTube 플레이어 상태 변경 핸들러 |
| `seekVideoTo(timeSec)` | sync.js | 영상 특정 시간으로 점프 |

## A-B Practice Loop

| 함수 | 위치 | 역할 |
|------|------|------|
| `setLoopA()` / `setLoopB()` | loop.js | 루프 시작/끝점 설정 |
| `toggleLoop()` | loop.js | A-B 루프 활성화/비활성화 |
| `clearLoop()` | loop.js | 루프 구간 초기화 |
| `setPlaybackSpeed(speed)` | loop.js | 재생 속도 변경 (0.5x, 0.75x, 1x) |
| `updateLoopUI()` | loop.js | 루프 마커/시간 표시 갱신 |
| `getCurrentVideoTime()` | loop.js | YouTube/로컬 현재 재생 시간 반환 |

## 키보드 단축키

| 함수 | 위치 | 역할 |
|------|------|------|
| `toggleVideoPlayPause()` | shortcuts.js | 재생/일시정지 토글 (Space) |
| `jumpToChord(direction)` | shortcuts.js | 이전/다음 코드 점프 (←/→) |

## 디스플레이 업데이트

| 함수 | 위치 | 역할 |
|------|------|------|
| `updateChordDisplay()` | display.js | 코드명, 코드톤, 스케일 추천, 논-다이아 경고 갱신 |
| `updateUpcomingChords(currentIdx)` | display.js | Next 코드 4개 미리보기 카드 |
| `updateDiatonicPreview()` | display.js | 다이아토닉 음 미리보기 |
| `syncToggleUI()` | display.js | 토글 버튼 상태 동기화 |

## 영상 / MIDI 로딩

| 함수 | 위치 | 역할 |
|------|------|------|
| `loadMidi(file)` | media.js | MIDI 파싱 + 코드 계산 + 조성 감지 + 히스토리 저장 |
| `loadYoutube()` | media.js | YouTube URL 파싱 + IFrame API 로드 |
| `loadLocalVideo(file)` | media.js | 로컬 영상 로드 + play/pause 바인딩 |
| `extractVideoId(input)` | media.js | YouTube URL/ID 파싱 |
| `showMidiStatus(msg, cls)` | media.js | MIDI 상태 메시지 표시 |
| `renderMidiInfo()` | media.js | MIDI 메타데이터 UI 표시 |

## 히스토리

| 함수 | 위치 | 역할 |
|------|------|------|
| `openHistoryDB()` | history.js | IndexedDB 열기/초기화 |
| `dbPut(key, blob)` / `dbGet(key)` / `dbDelete(key)` | history.js | IndexedDB CRUD |
| `saveToHistory()` | history.js | MIDI+영상 조합 저장 (최근 5개) |
| `loadFromHistory(entry)` | history.js | 히스토리 항목에서 복원 |
| `deleteHistoryEntry(index)` | history.js | 개별 항목 삭제 |
| `clearAllHistory()` | history.js | 전체 히스토리 초기화 |
| `renderHistoryUI()` | history.js | 히스토리 목록 UI 렌더링 |

## 운지표 (Voicing)

| 함수 | 위치 | 역할 |
|------|------|------|
| `getVoicingsForChord(name, rootPc)` | voicing.js | 코드명 → 운지 데이터 배열 |
| `getBaseFret(rootPc, rootStr)` | voicing.js | 루트 피치클래스 → 실제 프렛 |
| `pickBestVoicing(chordName, rootPc)` | voicing.js | 스마트 운지 선택 |
| `setVoicingPref(chordName, idx)` | voicing.js | 운지 선호도 저장 |
| `loadVoicingPrefs()` / `saveVoicingPrefs()` | voicing.js | MIDI별 운지 선호도 관리 |
| `renderVoicingSVG(voicing, compact)` | voicing.js | 운지 → SVG 다이어그램 |

## 아르페지오

| 함수 | 위치 | 역할 |
|------|------|------|
| `getArpeggioNotes(rootPc, notePCs)` | improv.js | 코드톤 → 아르페지오 음 배열 |
| `renderArpTab(rootPc, notePCs)` | improv.js | 아르페지오 → TAB 문자열 |

## 릭 라이브러리

| 함수 | 위치 | 역할 |
|------|------|------|
| `getLickCategory(suffix, isNonDia)` | improv.js | 코드 타입 → 릭 카테고리 |
| `computeLickOffset(targetRootPc, refRootPc)` | improv.js | Am 기준 릭 트랜스포즈 |
| `renderLickTABFromNotes(notes, offset)` | improv.js | 릭 → TAB (벤드/해머온) |
| `updateLickPanel()` | improv.js | 현재 코드에 맞는 릭 표시 |

## Improv & Song Map

| 함수 | 위치 | 역할 |
|------|------|------|
| `updatePositionGuide()` | improv.js | 추천 포지션 존 오버레이 |
| `updateImprovTools()` | improv.js | 현재 탭 업데이트 일괄 호출 |
| `setImprovTab(tab)` | improv.js | Improv 탭 전환 |
| `updateTimelinePanel()` | improv.js | 코드 타임라인 + 운지 |
| `updateVoicingPanel()` | improv.js | 운지 카드 표시 |
| `updateArpeggioPanel()` | improv.js | 아르페지오 TAB |
| `buildSongMap()` | songmap.js | Song Map UI 생성 |
| `updateSongMapHighlight(idx)` | songmap.js | 현재 코드 카드 하이라이트 |
| `scFnClass(rootPc, notePCs)` | songmap.js | 코드 기능별 CSS 클래스 |
| `scBadgeClass(label)` | songmap.js | 섹션 라벨별 배지 CSS |
