# AGENTS.md

## Operational Commands

- 패키지 매니저와 서버 런타임은 bun 고정. npm, yarn, pnpm 사용 금지.
- 개발 서버: `bun run dev` (API 3002 + Vite 5173 동시 실행)
- API 서버만: `bun run server`
- 전체 테스트: `bun run test` (vitest run, `src/`와 `server/` 모두 포함)
- 단일 테스트: `bunx vitest run server/generator.test.ts`, 이름 필터는 `bunx vitest run -t "이름"`
- 린트: `bun run lint`
- 빌드 및 타입체크: `bun run build` (tsc -b && vite build)
- 변경 후에는 `bun run lint`, `bun run test`, `bun run build` 순으로 통과를 확인한다.

## Golden Rules

### Immutable

- API 키는 서버 경계를 넘어 노출하지 않는다. `/api/config`는 키 보유 여부(boolean)만 반환한다 (`server/index.ts:149-153`). 키 값을 응답에 담지 않는다.
- Google 호출 URL에 키가 쿼리스트링으로 들어간다 (`server/index.ts:99`). 이 URL이나 에러 객체를 로그, 응답 본문에 출력하지 않는다.
- 클라이언트가 입력한 키는 React state에만 둔다 (`src/App.tsx:14`). localStorage 등에 저장하지 않는다.
- `.env`는 gitignore 대상이다. 커밋하지 않는다.

### Hard Constraint

- 미리보기는 react-live `noInline` 모드다 (`src/components/LivePreview.tsx:11`). 생성 코드 끝에 `render(<Comp />)` 호출이 없으면 아무것도 그려지지 않는다.
- 생성 코드는 import 문 없이 전역 React만 쓰고, 순수 JS여야 한다 (TS 문법 금지). 근거는 `server/index.ts`의 `SYSTEM_PROMPT` 규칙이며 react-live가 TS를 실행하지 못한다는 제약에 대응한다.

### Double Defense

- `render(...)` 요구는 두 곳에서 막는다: `SYSTEM_PROMPT`의 지시 (`server/index.ts:12`)와 사후 보정 `ensureRenderCall` (`server/generator.ts:16-25`). 한쪽만 고치지 말고 둘을 함께 검토한다.

### Asymmetry

- 모델 폴백(`GOOGLE_MODELS`, `withModelFallback`)과 `MAX_TOKENS` 절단 감지는 Google 경로에만 있다 (`server/index.ts:5,123,135`). Anthropic 경로(`callAnthropic`)에는 없다. 공급자 동작을 바꿀 때 다른 쪽에 같은 처리가 필요한지 판단한다.

### Test Boundary

- 순수 함수(`server/generator.ts`, `server/fallback.ts`)는 테스트가 있다. `server/index.ts`는 import 시 `Bun.serve`가 즉시 실행되어 테스트가 없다. 테스트가 필요한 로직은 `index.ts`에 두지 말고 순수 모듈로 분리한다.

## Project Context

- 프롬프트로 React 컴포넌트를 생성하고 실시간 미리보기와 코드를 제공하는 앱. 소개와 실행 방법은 `README.md` 참고.
- Stack: React 19, TypeScript, Vite, Bun, react-live, Vitest, Testing Library.

## Standards & References

- 커밋 메시지: `type: 한국어 요약` (feat, fix, refactor, chore). 요약 50자 이내, 마침표 없음. `.claude/skills/commit` 참고.
- UI 문구, 에러 메시지, 주석은 한국어.
- 서버 전용 규칙은 `server/AGENTS.md` 참고.
- Maintenance Policy: 규칙과 코드가 어긋나면 이 파일의 업데이트를 제안한다.

## Context Map

- **[API 서버 수정 (server/)](./server/AGENTS.md)** — 공급자 호출, 에러 매핑, 응답 정규화 작업 시.
