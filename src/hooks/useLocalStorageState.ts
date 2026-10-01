import { useState, useEffect } from 'react';

// localStorage와 동기화되는 상태. 접근 실패나 깨진 데이터는 초기값으로 대체한다.
export function useLocalStorageState<T>(
  key: string,
  initial: T,
  parse: (raw: unknown) => T | undefined = (raw) => raw as T,
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return initial;
      return parse(JSON.parse(stored)) ?? initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 저장 공간이 막혀 있어도 메모리 상태로 계속 동작한다.
    }
  }, [key, value]);

  return [value, setValue] as const;
}
