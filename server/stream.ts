// 공급자 스트림(SSE)을 파싱하고 클라이언트용 NDJSON 스트림으로 변환하는 순수 함수들.
// 부수효과(Bun.serve 등)가 없어 단위 테스트가 가능하다.
import { stripCodeFences, ensureRenderCall } from './generator';

/** SSE 응답 본문에서 `data:` 라인의 페이로드만 순서대로 내보낸다. */
export async function* parseSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const drain = function* (flush: boolean) {
    const lines = buffer.split('\n');
    buffer = flush ? '' : (lines.pop() ?? '');
    for (const line of lines) {
      if (line.startsWith('data:')) yield line.slice(5).trim();
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    yield* drain(false);
  }
  buffer += decoder.decode();
  yield* drain(true);
}

/** Anthropic 스트림 이벤트에서 텍스트 조각을 꺼낸다. 텍스트가 없는 이벤트는 빈 문자열. */
export function anthropicDelta(data: string): string {
  const event = JSON.parse(data) as { type: string; delta?: { text?: string } };
  return event.type === 'content_block_delta' ? (event.delta?.text ?? '') : '';
}

/** Gemini 스트림 청크에서 텍스트 조각을 꺼낸다. MAX_TOKENS로 잘리면 에러를 던진다. */
export function googleDelta(data: string): string {
  const chunk = JSON.parse(data) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
  };
  const candidate = chunk.candidates?.[0];
  if (candidate?.finishReason === 'MAX_TOKENS') {
    throw new Error('생성된 코드가 너무 길어 잘렸습니다. 더 간단한 컴포넌트를 요청해주세요.');
  }
  return candidate?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
}

/**
 * 텍스트 조각 스트림을 NDJSON(`{type:'delta'|'done'|'error'}` 한 줄씩)으로 변환한다.
 * 완료 시 stripCodeFences → ensureRenderCall을 거친 최종 코드를 done으로 보낸다.
 */
export function createGenerateStream(chunks: AsyncIterable<string>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      const send = (event: object) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      let full = '';
      try {
        for await (const text of chunks) {
          if (!text) continue;
          full += text;
          send({ type: 'delta', text });
        }
        send({ type: 'done', code: ensureRenderCall(stripCodeFences(full)) });
      } catch (err) {
        send({ type: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
      }
      controller.close();
    },
  });
}
