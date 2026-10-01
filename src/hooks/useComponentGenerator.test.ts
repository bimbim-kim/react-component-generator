import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useComponentGenerator } from './useComponentGenerator';

const mockFetch = (body: unknown, ok = true) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, json: async () => body }));

describe('useComponentGenerator 영속성', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('생성한 컴포넌트가 새로 마운트해도 복원되고 createdAt은 Date다', async () => {
    mockFetch({ code: 'render(<div/>)' });
    const first = renderHook(() => useComponentGenerator());
    await act(() => first.result.current.generate('카드', undefined, 'google'));
    first.unmount();

    const second = renderHook(() => useComponentGenerator());
    expect(second.result.current.components).toHaveLength(1);
    expect(second.result.current.components[0].prompt).toBe('카드');
    expect(second.result.current.components[0].createdAt).toBeInstanceOf(Date);
  });

  it('삭제한 컴포넌트는 복원되지 않는다', async () => {
    mockFetch({ code: 'x' });
    const first = renderHook(() => useComponentGenerator());
    await act(() => first.result.current.generate('카드', undefined, 'google'));
    act(() => first.result.current.clearAll());
    first.unmount();

    const second = renderHook(() => useComponentGenerator());
    expect(second.result.current.components).toEqual([]);
  });

  it('형식이 잘못된 저장 데이터는 무시한다', () => {
    localStorage.setItem('rcg:components', JSON.stringify([{ foo: 1 }]));
    const { result } = renderHook(() => useComponentGenerator());
    expect(result.current.components).toEqual([]);
  });

  it('생성 요청한 프롬프트가 최신순 히스토리로 저장·복원된다', async () => {
    mockFetch({ code: 'x' });
    const first = renderHook(() => useComponentGenerator());
    await act(() => first.result.current.generate('A', undefined, 'google'));
    await act(() => first.result.current.generate('B', undefined, 'google'));
    first.unmount();

    const second = renderHook(() => useComponentGenerator());
    expect(second.result.current.promptHistory).toEqual(['B', 'A']);
  });

  it('생성에 실패한 프롬프트는 히스토리에 남기지 않는다', async () => {
    mockFetch({ error: '503' }, false);
    const { result } = renderHook(() => useComponentGenerator());
    await act(() => result.current.generate('A', undefined, 'google'));
    expect(result.current.promptHistory).toEqual([]);
  });

  it('같은 프롬프트는 중복 없이 맨 앞으로 올라온다', async () => {
    mockFetch({ code: 'x' });
    const { result } = renderHook(() => useComponentGenerator());
    await act(() => result.current.generate('A', undefined, 'google'));
    await act(() => result.current.generate('B', undefined, 'google'));
    await act(() => result.current.generate('A', undefined, 'google'));
    expect(result.current.promptHistory).toEqual(['A', 'B']);
  });

  it('히스토리는 최대 20개까지만 유지한다', async () => {
    mockFetch({ code: 'x' });
    const { result } = renderHook(() => useComponentGenerator());
    for (let i = 0; i < 22; i++) {
      await act(() => result.current.generate(`p${i}`, undefined, 'google'));
    }
    expect(result.current.promptHistory).toHaveLength(20);
    expect(result.current.promptHistory[0]).toBe('p21');
  });
});
