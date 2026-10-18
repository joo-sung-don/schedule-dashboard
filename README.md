# 프로젝트 스케줄 대시보드

Google Calendar의 **프로젝트별 캘린더**를 한 화면에서 보고 관리하는 로컬 웹 앱입니다.

- **오늘·다가오는 일정**: 오늘부터 7일간의 일정을 날짜별로 정리하고, 진행 중인 일정을 강조합니다
- **캘린더**: 월간/주간 보기. 빈 칸을 드래그하면 일정이 생성되고, 일정을 끌어 옮기거나 길이를 바꿀 수 있습니다
- **타임라인**: 프로젝트별 간트 차트(1개월/3개월). 하루짜리 일정은 마일스톤(◆)으로 표시됩니다
- 일정 생성·수정·삭제, 다른 프로젝트(캘린더)로 이동
- 사이드바에서 표시할 프로젝트 선택 (선택 상태는 브라우저에 저장)

## 빠르게 둘러보기

```bash
npm install
npm run dev
```

http://localhost:5173 에서 **데모 데이터로 둘러보기**를 누르면 Google 연동 없이 모든 화면을 써볼 수 있습니다.
(데모 데이터는 새로고침하면 초기화됩니다. `http://localhost:5173/?demo` 로 바로 열 수도 있습니다.)

## Google Calendar 연동 설정

한 번만 하면 됩니다. Client Secret은 필요 없습니다.

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트를 만듭니다
2. **API 및 서비스 → 라이브러리**에서 **Google Calendar API**를 사용 설정합니다
3. **OAuth 동의 화면**: 사용자 유형 **외부**로 만들고, **테스트 사용자**에 본인 Google 계정을 추가합니다
4. **사용자 인증 정보 → 사용자 인증 정보 만들기 → OAuth 클라이언트 ID**
   - 애플리케이션 유형: **웹 애플리케이션**
   - 승인된 JavaScript 원본: `http://localhost:5173`
5. 발급된 클라이언트 ID를 저장합니다

   ```bash
   cp .env.example .env.local
   # .env.local 의 VITE_GOOGLE_CLIENT_ID= 뒤에 클라이언트 ID 붙여넣기
   ```

6. `npm run dev`를 다시 실행하고 **Google로 로그인**합니다

### 프로젝트를 캘린더로 관리하기

이 대시보드는 **캘린더 하나 = 프로젝트 하나**로 봅니다.
Google Calendar에서 **다른 캘린더 → 새 캘린더 만들기**로 프로젝트별 캘린더를 만들어 두세요.
쓰기 권한이 있는 캘린더는 기본으로 표시되고, 공휴일처럼 읽기 전용인 캘린더는 사이드바에서 켜면 보입니다.

### 참고

- 로그인 토큰은 1시간마다 만료되며 자동으로 다시 받습니다. 팝업이 차단돼 실패하면 상단의 **다시 연결**을 누르세요
- 반복 일정은 해당 회차만 수정되며, 다른 프로젝트로 옮길 수 없습니다 (Google API 제약)

## 개발

```bash
npm test         # 단위 테스트 (날짜 변환, 타임라인 배치 등)
npm run build    # 타입 체크 + 프로덕션 빌드
npm run lint
```

| 경로 | 역할 |
| --- | --- |
| `src/auth/googleAuth.ts` | Google Identity Services 토큰 발급/갱신 |
| `src/api/calendar.ts` | Calendar API 클라이언트 (`CalendarApi` 인터페이스) |
| `src/api/demo.ts` | 같은 인터페이스의 메모리 데모 구현 |
| `src/api/types.ts` | Google 응답 ↔ 앱 모델 변환 |
| `src/hooks/` | 프로젝트 목록·일정 조회·수정 (TanStack Query) |
| `src/lib/` | 날짜 계산, 타임라인 배치 로직 |
| `src/components/` | 화면 컴포넌트 |
