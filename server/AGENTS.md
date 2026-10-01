# server/AGENTS.md

## Module Context

Bun.serve 단일 프로세스(포트 3002) API 프록시. 프론트엔드는 Vite 프록시(`vite.config.ts`)로 `/api`를 여기에 연결한다.

## Tech Stack & Constraints

- 런타임은 Bun. Node 전용 API에 의존하지 않는다. 외부 SDK 없이 `fetch`로 Anthropic, Gemini REST를 직접 호출한다.
- 포트를 바꾸면 `vite.config.ts`의 프록시 target도 함께 바꾼다.

## Implementation Patterns

- 새 공급자 추가: `Provider` 타입, `ENV_KEYS`, `callXxx` 함수, `/api/generate` 분기, `/api/config` 응답을 모두 갱신한다. 프론트의 `src/types/index.ts`도 맞춘다.
- 모든 응답에 `CORS_HEADERS`를 붙인다 (`index.ts`의 각 `Response.json` 호출).
- 모델 응답은 반드시 `stripCodeFences` 후 `ensureRenderCall`을 거쳐 반환한다.

## Testing Strategy

- `bunx vitest run server/` 로 서버 테스트만 실행한다.
- 테스트는 `generator.ts`, `fallback.ts` 같은 순수 모듈에 대해 작성하고 같은 폴더에 `*.test.ts`로 둔다.

## Local Golden Rules

- HTTP 상태 매핑은 에러 메시지 문자열에 `503`, `429`가 포함되는지로 한다 (`index.ts:194,201`). 공급자 호출 함수는 `... error: <status>` 형식으로 던져야 한다 (`index.ts:85,112`). 이 형식을 바꾸면 매핑이 조용히 500으로 떨어진다.
- `index.ts`를 테스트에서 import하지 않는다. import 즉시 서버가 뜬다.
- `withModelFallback`은 모든 에러를 삼키고 다음 모델을 시도한다 (`fallback.ts:12-17`). 재시도하면 안 되는 에러(예: 키 오류)도 다음 모델로 넘어간다는 점을 고려한다.
