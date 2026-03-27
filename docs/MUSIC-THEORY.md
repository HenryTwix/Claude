# Music Theory Reference

## Chord Identification (theory.js)
- 12루트 × 17코드타입 조합에 대해 피어슨 상관계수 비교
- 지원 코드: maj, m, 7, m7, maj7, m7b5, dim7, dim, aug, sus4, sus2, 6, m6, add9, 9, maj9, m9
- 신뢰도 50% 미만이면 null 반환

## Key Detection (theory.js)
- Krumhansl-Schmuckler 알고리즘
- 12루트 × Major/Minor 프로파일 피어슨 상관
- MIDI 로드 시 자동 실행

## Diatonic Sets
- Major: [0,2,4,5,7,9,11]
- Minor: [0,2,3,5,7,8,10]

## Scale Suggestions (theory.js)
| 코드 위치 (Major) | 추천 스케일 |
|---|---|
| I | 메이저 스케일, 메이저 펜타 |
| ii | 도리안, 마이너 펜타 |
| iii | 프리지안, 마이너 펜타 |
| IV | 리디안, 메이저 펜타 |
| V | 믹솔리디안, 메이저 펜타 |
| V7 | 믹솔리디안, 블루스, 얼터드 |
| vi | 에올리안, 마이너 펜타 |
| vii° | 로크리안 |
| Non-dia (7) | 믹솔리디안(코드 루트), 블루스 |
| Non-dia (m) | 도리안(코드 루트), 마이너 펜타 |

## Color Rules

### General Mode
| Class | Color | Meaning |
|-------|-------|---------|
| `.ndot.root` | Red #dc2626 | 근음 |
| `.ndot.chord` | Green #14532d | 코드톤 (다이아토닉) |
| `.ndot.nondiatonic` | Gold #92400e | 논-다이아토닉 코드톤 |
| `.ndot.tone` | Blue #172554 | 다이아토닉 (비-코드톤) |

### Pentatonic Mode
| Class | Color | Meaning |
|-------|-------|---------|
| `.ndot.penta` | Teal #134e4a | 펜타토닉 음 |
| `.ndot.penta-match` | Gold #78350f | 펜타 + 논-다이아 코드톤 일치 |
| `.ndot.penta-avoid` | Dark gray #111827 | 펜타 + 코드톤 반음 충돌 |

### WITH-PENTA Mode
| Class | Color | Meaning |
|-------|-------|---------|
| `.ndot.wp-penta` | Teal #0f766e | 펜타토닉 음 (주력) |
| `.ndot.wp-scale` | Slate #1e293b | 다이아토닉 비-펜타 (보조) |
| `.ndot.wp-nondiatonic` | Gold #78350f | 논-다이아토닉 코드톤 |
| `.ndot.wp-penta-avoid` | Warm gray #1c1917 | 펜타 + 코드톤 충돌 |
| `.ndot.wp-scale-avoid` | Zinc #18181b | 비-펜타 + 코드톤 충돌 |

### Special
| Class | Color | Meaning |
|-------|-------|---------|
| `.ndot.ghost` | Amber #3d1f02 | Pre-NonD 미리보기 |
| `.ndot.approach` | Brown #3d1f02 bg / Amber text | 어프로치 노트 |
| `.ndot.gray` | Gray #1f2937 | Gray 모드 단일 색상 |
| `.ndot.root-nondiatonic` | Red #dc2626 + Gold outline #f59e0b | 논-다이아 근음 |

### Song Map 섹션 배지
| Class | Color | Section |
|-------|-------|---------|
| `.sc-badge-intro` | 회색 | Intro |
| `.sc-badge-verse` | 인디고 | Verse |
| `.sc-badge-prechorus` | 틸 | Pre-Chorus |
| `.sc-badge-chorus` | 퍼플 | Chorus |
| `.sc-badge-bridge` | 앰버 | Bridge |
| `.sc-badge-outro` | 회색 | Outro |
| `.sc-badge-other` | 다크 그레이 | Other |

---

## 논-다이아토닉 판정 규칙

### 판정 기준
- **근음 포함** 전체 코드톤을 다이아토닉 Set과 비교 (updateChordDisplay, Pre-NonD, upcoming, next fretboard)
- `replacedDiatonic` 계산에서만 **근음 제외** — 근음이 논-다이아일 때 인접 다이아토닉 음 보존

### 대체음 제거 (replacedDiatonic)
- 논-다이아 코드톤(예: Eb) → 반음 위/아래 다이아토닉 음(예: E)을 지판에서 숨김

### 펜타토닉 모드
- **Master Key 루트에 고정** (코드별 루트 아님)
- Major key → Major Pentatonic [0,2,4,7,9]
- Minor key → Minor Pentatonic [0,3,5,7,10]
- WITH-PENTA와 상호 배타 (하나 켜면 다른 하나 OFF)

### WITH-PENTA 모드 판정
- 근음: Master Key 루트만 표시
- 펜타 + 코드톤 일치 → `penta-match` (적극 활용)
- 펜타 + 코드톤 ±1 반음 → `wp-penta-avoid` (주의)
- 비-펜타 다이아 + 코드톤 ±1 반음 → `wp-scale-avoid` (경고)
- grayMode 후처리 스킵 (자체 색상 체계)
