@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

프롬프트로 React 컴포넌트를 생성하고 react-live로 실시간 미리보기를 보여주는 앱. UI 문구와 커밋 메시지는 한국어를 쓴다(커밋은 `type: 요약` 형식, `/commit` 스킬 참고).

명령어와 Golden Rules는 AGENTS.md에 있다. `.env.example`은 없고 `.env`는 gitignore 대상이다.

## 아키텍처

두 프로세스 구성이다.

- **프론트엔드** (`src/`): React 19 + Vite. `vite.config.ts`가 `/api`를 `http://localhost:3002`로 프록시한다. 서버 포트를 바꾸면 이 프록시도 함께 바꿔야 한다.
- **API 서버** (`server/index.ts`): `Bun.serve` 단일 파일. `GET /api/config`(env 키 보유 여부)와 `POST /api/generate`를 제공한다. 클라이언트가 보낸 `apiKey`가 env 키보다 우선한다.

생성 흐름: `useComponentGenerator` 훅 → `/api/generate` → Anthropic(`claude-haiku-4-5`) 또는 Google Gemini 호출 → 응답 텍스트를 `stripCodeFences` → `ensureRenderCall`로 정규화 → 클라이언트가 `LivePreview`(react-live, `noInline`)로 렌더링.

알아둘 점:

- **시스템 프롬프트와 정규화 로직은 짝이다.** `server/index.ts`의 `SYSTEM_PROMPT`는 import 금지, 인라인 스타일만, 순수 JS(TS 문법 금지), 마지막에 `render(<Comp />)` 호출을 요구한다. react-live `noInline` 모드가 `render(...)` 호출을 필요로 하기 때문이며, 모델이 빼먹으면 `server/generator.ts`의 `ensureRenderCall`이 첫 컴포넌트 선언을 찾아 주입한다. 프롬프트 규칙을 바꿀 때는 이 두 곳과 `LivePreview`의 실행 환경을 함께 확인한다.
- **Gemini는 모델 폴백**이 있다. `GOOGLE_MODELS` 배열 순서대로 `server/fallback.ts`의 `withModelFallback`이 시도하고, 모두 실패하면 마지막 에러를 던진다. Anthropic은 단일 모델이다.
- 에러 메시지 문자열에 `503`/`429`가 포함되는지로 HTTP 상태를 매핑한다(`callAnthropic`, `callGoogleModel`이 `... error: <status>` 형식으로 던지는 것에 의존).
- `server/generator.ts`와 `fallback.ts`는 부수효과가 없는 순수 함수라 단위 테스트 대상이다. `Bun.serve`가 있는 `index.ts`는 import하지 않는다.

## 테스트

Vitest(jsdom)가 `src/**/*.test.{ts,tsx}`와 `server/**/*.test.ts`를 모두 실행한다. 설정은 `vite.config.ts`의 `test` 블록, 셋업은 `src/test/setup.ts`다. 컴포넌트 테스트는 Testing Library를 쓴다.

## 스킬

`.claude/skills/`에 프로젝트 스킬(commit, autofix, deep-interview 등)이 있고, `.agents/skills/`에 Codex용 공용 사본이 있다. `skills-lock.json`으로 버전을 고정한다.
