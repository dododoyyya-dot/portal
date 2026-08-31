# CLAUDE.md — 대한민국플라잉디스크연맹 홈페이지

> 저장소 `dododoyyya-dot/portal` · GitHub Pages 정적 호스팅 (빌드 단계 없음)
> 라이브: https://xn--3e0bs9hwxbnzdb8dgzd5uq6mgd1dcu4a8tlm1a.com · https://dododoyyya-dot.github.io/portal

## 이 프로젝트의 성격

연맹 실무진(중앙·시도임원·클럽장·교사·학생)이 **매일 실제로 쓰는** 운영 사이트입니다.
개발 서버가 없고 배포 = 즉시 라이브입니다. **기능이 하나라도 깨지면 그날 업무가 멈춥니다.**

## 절대 원칙

1. **기존 기능을 절대 깨지 않는다.** 새 기능보다 기존 동작 보존이 우선.
2. **한 번에 하나씩.** 여러 수정을 몰아서 배포하지 않는다. 하나 배포 → 검증 → 다음.
3. **삭제보다 추가.** 기존 필드·함수는 남기고 새 것을 더한다. 마이그레이션 시 구 키 폴백 유지.
4. **Firebase 보안 규칙 · Google Cloud Console · EmailJS 설정은 사용자가 직접 한다.**
   정확한 규칙 문안·클릭 경로는 작성해 드리되, **절대 대신 적용하지 않는다.**
5. **회원 데이터 일괄 수정 도구는 안전판 필수** — 미리보기(쓰기 0건) → 백업 JSON 다운로드 →
   1명 시험 → 선택 적용 → 되돌리기. 예외 없음.

## 배포 전 검증 절차 (코드를 건드리는 모든 작업 공통)

```
1. 라이브 원본 대조   raw.githubusercontent.com 에서 받아 로컬과 sha256 비교
                     다르면 라이브 쪽으로 덮어쓰고 시작
2. 프로그램 치환      손으로 재타이핑 금지. 문자열 치환 스크립트로 편집
3. 재적용 대조        라이브 원본에 같은 치환을 다시 적용 → 편집본과 바이트 단위 일치 확인
4. 문법 검사          인라인 <script> 추출 후 node --check
5. 동작 검증          로컬 서버 + Playwright 로 실제 클릭 테스트
                     기능 변경은 반드시 원본/수정본 A/B 대조
6. 배포 후            라이브 해시 일치 + 함수 정의 확인 + 콘솔 에러 0건
```

**콘솔 에러 기준선**: `firebase.app is not a function`, `LVS` TDZ 2건은 **원본에도 있는 기존 오류**입니다.
0건이 아니라 **이 2건 외 0건**을 기준으로 삼으십시오.

## 기술 스택

- 순수 정적 HTML + 인라인 `<script>`. 프레임워크·번들러·빌드 없음.
- Firebase **v8 compat** SDK (CDN). v9 모듈 문법 쓰지 말 것.
- 공용: `style.css` · `kfdf.js` · `auth_ui.js` · `site_config.js` · `region_map.js`
- 페이지 34개. 큰 파일: admin.html 495KB · competition.html 219KB · mypage.html 203KB

### ⚠ 캐시 버전 문자열
공용 파일은 전부 `?v=날짜` 로 고정돼 있습니다. **공용 파일만 고치면 사용자에게 도달하지 않습니다.**
반드시 참조하는 페이지들의 버전 문자열을 함께 올릴 것. (현재 불일치 상태 — 작업목록 1-2, 1-3 참조)

### 🔴 `kfdf.js`의 `onAuthStateChanged`는 죽은 코드
유일한 진입점 `KFDF.ready()` 가 사이트 전체에서 한 번도 호출되지 않습니다.
로그인 훅이 필요하면 **`auth_ui.js`** 에 넣으십시오 (34개 중 29개 페이지가 로드).

## 데이터 구조 메모 (실측)

### 대회 참가 — `compSlots/{slotId}`
```
claimed[]        참가 신청 (배열 — 동시성 취약, 작업목록 3-3)
  ├ 개인:  {uid, pid, name, birth, kid, prefs[], payStatus, needPaper}
  └ 팀:    {uid, pid, team:true, name, teamType, roster:[{name,birth,school}], consentFiles[]}
confirmed[]      확정 명단 — ⚠ uid 단위 (신청은 pid 단위, 작업목록 3-1)
reviewStatus{}   심사 상태 — 맵 필드 (동시성 안전) key = pid
paperConsents{}  수기 동의 확인 — 맵 필드
                 key = 개인은 pid / 팀원은 `{팀pid}_{명단인덱스}`  ← 순번 기반, 작업목록 3-2
                 값 = {name, by, at, files[]}
sido / bySido    시도 (등록 경로에 따라 필드명이 다름 — 둘 다 확인할 것)
```

- **참가자 키는 `ckey(c) = c.pid || c.uid`** — 참가는 건 단위, 심판·운영은 계정 단위.
- 클럽 명단의 생년월일은 **가입 시점 스냅샷**입니다. 회원 문서를 고쳐도 명단은 안 바뀝니다.
- `teamConsents/{slotId}_{pid}` — 클럽장 일괄 업로드 동의서. **문서 ID 직접 조회로만** 읽으십시오
  (컬렉션 전체 나열은 규칙상 막힐 수 있음).

### 권한
```
isCompStaff()  = owner || role ∈ [admin, regionAdmin, sidoOfficer, gugunOfficer]
겸직 가능       role(대표 등급) 과 roles[](전체) 를 함께 볼 것 — cHasRole() 사용
regionAdmin    권역장 = 자격증과 무관한 일시적 사업 전용 권한.
               실제 자격 업무는 시도연맹(sidoOfficer)과 중앙이 진행. 혼동 금지.
```

### 개인정보 — 취급 주의
- `privateInfo` 컬렉션에 **주민등록번호**
- Storage에 자격증·학위·재직 증빙 사본, **미성년 보호자 동의서 스캔본**
- 업로드 경로는 `logs/{uid}/...` (일반 회원도 쓰기 가능한 경로)
→ 보안 규칙 점검이 최우선 과제로 보류 중입니다.

## 연습 사이트 (샌드박스)

`sandbox/` — Firebase SDK를 통째로 대체하는 **인메모리 가짜 DB**(`sandbox.js`).
실 DB 접근 0건. 계정 9종(중앙관리자·시도임원·클럽장·보호자·학생·생년월일없음 등) 전환 가능.
상태는 `localStorage`에 저장 (탭 간 공유를 위해 `sessionStorage` 아님).
**페이지를 고치면 샌드박스 사본도 함께 갱신할 것.**

## 하지 말 것

- `git push`를 사용자 확인 없이 실행 (배포 = 즉시 라이브)
- 회원 문서 일괄 수정을 미리보기·백업 없이 실행
- Firebase 규칙·GCP 설정을 대신 적용
- Firebase 웹 API 키를 "비밀"로 취급해 제거 시도 —
  구글 공식 문서상 **비밀이 아니며**, 지우면 전 페이지가 즉시 작동 불능이 됩니다.
  정답은 키 제거가 아니라 **리퍼러 제한 + 보안 규칙 강화**입니다.
- 38개 페이지 일괄 업로드 (과거 실패) — 8~10개씩 분할하고 회차마다 검증
