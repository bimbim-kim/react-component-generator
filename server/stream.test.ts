import { describe, it, expect } from 'vitest';
import {
  parseSSE,
  anthropicDelta,
  googleDelta,
  createGenerateStream,
} from './stream';

const toStream = (chunks: string[]) =>
  new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      chunks.forEach((c) => controller.enqueue(enc.encode(c)));
      controller.close();
    },
  });

async function collect<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const v of iter) out.push(v);
  return out;
}

async function readLines(stream: ReadableStream<Uint8Array>) {
  const text = await new Response(stream).text();
  return text.trim().split('\n').map((l) => JSON.parse(l));
}

async function* gen(items: string[], failWith?: Error) {
  for (const i of items) yield i;
  if (failWith) throw failWith;
}

describe('parseSSE', () => {
  it('data 라인의 페이로드를 순서대로 내보낸다', async () => {
    const stream = toStream(['data: a\n\ndata: b\n\n']);
    expect(await collect(parseSSE(stream))).toEqual(['a', 'b']);
  });

  it('청크 경계가 라인 중간에 걸려도 이어 붙인다', async () => {
    const stream = toStream(['data: hel', 'lo\n\nda', 'ta: x\n\n']);
    expect(await collect(parseSSE(stream))).toEqual(['hello', 'x']);
  });

  it('data가 아닌 라인(event:, 빈 줄)은 무시한다', async () => {
    const stream = toStream(['event: ping\ndata: a\n\n']);
    expect(await collect(parseSSE(stream))).toEqual(['a']);
  });
});

describe('anthropicDelta', () => {
  it('content_block_delta의 텍스트를 꺼낸다', () => {
    const data = JSON.stringify({ type: 'content_block_delta', delta: { type: 'text_delta', text: 'hi' } });
    expect(anthropicDelta(data)).toBe('hi');
  });

  it('다른 이벤트 타입은 빈 문자열이다', () => {
    expect(anthropicDelta(JSON.stringify({ type: 'message_start' }))).toBe('');
  });
});

describe('googleDelta', () => {
  it('parts의 텍스트를 이어 붙여 반환한다', () => {
    const data = JSON.stringify({ candidates: [{ content: { parts: [{ text: 'a' }, { text: 'b' }] } }] });
    expect(googleDelta(data)).toBe('ab');
  });

  it('finishReason이 MAX_TOKENS면 에러를 던진다', () => {
    const data = JSON.stringify({ candidates: [{ finishReason: 'MAX_TOKENS' }] });
    expect(() => googleDelta(data)).toThrow('너무 길어');
  });
});

describe('createGenerateStream', () => {
  it('delta 이벤트 후 정규화된 코드를 done으로 보낸다', async () => {
    const lines = await readLines(createGenerateStream(gen(['const Card = () => <div/>;'])));
    expect(lines[0]).toEqual({ type: 'delta', text: 'const Card = () => <div/>;' });
    expect(lines.at(-1)).toEqual({
      type: 'done',
      code: 'const Card = () => <div/>;\n\nrender(<Card />);',
    });
  });

  it('중간에 에러가 나면 error 이벤트를 보낸다', async () => {
    const lines = await readLines(createGenerateStream(gen(['x'], new Error('boom'))));
    expect(lines.at(-1)).toEqual({ type: 'error', error: 'boom' });
  });
});
