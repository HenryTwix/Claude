# UI Guide

## Layout (위→아래)

1. **App Title** — "Chord Sync"
2. **MIDI Upload** — 드래그앤드롭 / 클릭
3. **History** — 최근 5개 MIDI+영상 조합
4. **Video** — YouTube URL 또는 로컬 mp4/webm
5. **MIDI Info** — BPM, 트랙, 듀레이션
6. **Controls**
   - Row 1: Master Key + Sync Offset + 다이아토닉 프리뷰
   - Row 1.5: Practice Loop (A-B 구간 반복 + Speed)
   - Row 2: Legend + Toggle 버튼 3그룹 + 코드 배지 + ? 도움말
7. **Now Playing** — 코드명, 로마숫자, Next 4개, 스케일 추천
8. **Improv Tools** — Timeline / Voicing / Arpeggio / Both / Lick 탭
9. **Fretboard 1** — 현재 코드 (항상 표시)
10. **Fretboard 2** — 다음 코드 (토글, 60% 투명)
11. **Song Map** — 곡 구조 분석, 섹션별 코드 카드

---

## Toggle Buttons (단축키)

### Display Mode
| Button ID | Key | Active Color | Function |
|-----------|-----|-------------|----------|
| `label-toggle` | 1 | Sky #0ea5e9 | 도수 ↔ 음계 전환 |
| `penta-toggle` | 2 | Teal #14b8a6 | 펜타토닉 모드 |
| `with-penta-toggle` | 3 | Teal #2dd4bf | WITH-PENTA 모드 |
| `chord-only-toggle` | 4 | Violet #8b5cf6 | 코드톤만 표시 |
| `gray-toggle` | 5 | Gray #9ca3af | Gray 모드 |

### Analysis
| Button ID | Key | Active Color | Function |
|-----------|-----|-------------|----------|
| `pre-nond-toggle` | 6 | Rose #f43f5e | Pre-NonD 미리보기 |
| `approach-toggle` | 7 | Indigo #818cf8 | 어프로치 노트 모드 |
| `next-fb-toggle` | 8 | Indigo #6366f1 | 두 번째 지판 표시 |

### Panels
| Button ID | Key | Active Color | Function |
|-----------|-----|-------------|----------|
| `improv-toggle` | 9 | Emerald #10b981 | Improv Tools 패널 |
| `song-map-toggle` | 0 | Amber #f59e0b | Song Map 패널 |

---

## Keyboard Shortcuts

### Playback
| Key | Function |
|-----|----------|
| Space | 재생/일시정지 |
| ← / → | 이전/다음 코드 점프 |

### Display/Analysis (1-8)
| Key | Function |
|-----|----------|
| 1-5 | Display Mode 토글 (Label, Penta, W-Penta, Chord, Gray) |
| 6-8 | Analysis 토글 (PreND, Approach, Next Board) |

### Panels (9-0)
| Key | Function |
|-----|----------|
| 9 | Improv Tools 패널 |
| 0 | Song Map 패널 |

### Practice Loop
| Key | Function |
|-----|----------|
| A | 구간 시작점 설정 |
| B | 구간 끝점 설정 |
| L | 루프 켜기/끄기 |
| X | 루프 초기화 |

### Other
| Key | Function |
|-----|----------|
| ? | 단축키 도움말 |
| Esc | 오버레이 닫기 |

입력란(input/select/textarea)에 포커스가 있으면 단축키 비활성화.

---

## Now Playing 영역

| Element ID | 역할 |
|------------|------|
| `chord-name` | 현재 코드명 (큰 텍스트) |
| `chord-function-badge` | 로마 숫자 코드 기능 (I, ii, V7 등) |
| `chord-tones-info` | 코드 구성음 (C · E · G · B) |
| `scale-suggestion` | 추천 스케일 목록 |
| `nondiatonic-info` | 논-다이아토닉 경고 배너 |
| `sync-indicator` | 재생 중 펄스 애니메이션 (`.sync-active`) |
| `upcoming-cards` | 다음 4개 코드 미리보기 카드 |
