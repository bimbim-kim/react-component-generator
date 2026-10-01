import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorageState } from './useLocalStorageState';

describe('useLocalStorageState', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('저장된 값이 없으면 초기값을 쓴다', () => {
    const { result } = renderHook(() => useLocalStorageState('k', 'init'));
    expect(result.current[0]).toBe('init');
  });

  it('저장된 값이 있으면 그 값으로 시작한다', () => {
    localStorage.setItem('k', JSON.stringify('saved'));
    const { result } = renderHook(() => useLocalStorageState('k', 'init'));
    expect(result.current[0]).toBe('saved');
  });

  it('값을 바꾸면 localStorage에 JSON으로 저장한다', () => {
    const { result } = renderHook(() => useLocalStorageState('k', 'init'));
    act(() => result.current[1]('next'));
    expect(localStorage.getItem('k')).toBe(JSON.stringify('next'));
  });

  it('JSON이 깨져 있으면 초기값으로 되돌린다', () => {
    localStorage.setItem('k', '{broken');
    const { result } = renderHook(() => useLocalStorageState('k', 'init'));
    expect(result.current[0]).toBe('init');
  });

  it('parse가 undefined를 돌려주면 초기값을 쓴다', () => {
    localStorage.setItem('k', JSON.stringify(123));
    const { result } = renderHook(() =>
      useLocalStorageState<string>('k', 'init', (raw) => (typeof raw === 'string' ? raw : undefined)),
    );
    expect(result.current[0]).toBe('init');
  });

  it('localStorage 접근이 실패해도 상태는 동작한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useLocalStorageState('k', 'init'));
    act(() => result.current[1]('next'));
    expect(result.current[0]).toBe('next');
  });
});
