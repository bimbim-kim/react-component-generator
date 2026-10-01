import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useComponentGenerator } from './useComponentGenerator';

const ndjson = (events: object[]) =>
  new Response(events.map((e) => `${JSON.stringify(e)}\n`).join(''), {
    headers: { 'Content-Type': 'application/x-ndjson' },
  });

describe('useComponentGenerator 스트리밍', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('완료되면 done의 최종 코드로 컴포넌트를 추가하고 streamingCode는 null이 된다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        ndjson([
          { type: 'delta', text: 'const A' },
          { type: 'delta', text: 'bc = 1;' },
          { type: 'done', code: 'const Abc = 1;\n\nrender(<Abc />);' },
        ]),
      ),
    );
    const { result } = renderHook(() => useComponentGenerator());
    expect(result.current.streamingCode).toBeNull();
    await act(() => result.current.generate('카드', undefined, 'google'));
    expect(result.current.streamingCode).toBeNull();
    expect(result.current.components[0].code).toBe('const Abc = 1;\n\nrender(<Abc />);');
  });

  it('스트림 중간 error 이벤트는 에러로 노출하고 컴포넌트를 추가하지 않는다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        ndjson([{ type: 'delta', text: 'x' }, { type: 'error', error: '잘렸습니다' }]),
      ),
    );
    const { result } = renderHook(() => useComponentGenerator());
    await act(() => result.current.generate('카드', undefined, 'google'));
    expect(result.current.error).toBe('잘렸습니다');
    expect(result.current.components).toEqual([]);
    expect(result.current.streamingCode).toBeNull();
  });

  it('생성 중에 받은 delta가 streamingCode로 보인다', async () => {
    const enc = new TextEncoder();
    let push!: (s: string) => void;
    let close!: () => void;
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        push = (s) => c.enqueue(enc.encode(s));
        close = () => c.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body)));
    const { result } = renderHook(() => useComponentGenerator());
    let promise!: Promise<void>;
    act(() => {
      promise = result.current.generate('카드', undefined, 'google');
    });
    await act(async () => {
      push('{"type":"delta","text":"const A"}\n');
    });
    await waitFor(() => expect(result.current.streamingCode).toBe('const A'));
    await act(async () => {
      push('{"type":"done","code":"const A"}\n');
      close();
      await promise;
    });
  });
});
