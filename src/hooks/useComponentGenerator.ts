import { useState, useCallback } from 'react';
import type { GeneratedComponent, Provider } from '../types';
import { useLocalStorageState } from './useLocalStorageState';

const COMPONENTS_KEY = 'rcg:components';
const HISTORY_KEY = 'rcg:promptHistory';
const MAX_HISTORY = 20;

// 저장된 JSON(createdAt이 문자열)을 검증하고 Date로 복원한다. 잘못된 항목은 버린다.
function parseComponents(raw: unknown): GeneratedComponent[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.flatMap((item) => {
    if (
      item &&
      typeof item.id === 'string' &&
      typeof item.prompt === 'string' &&
      typeof item.code === 'string'
    ) {
      const createdAt = new Date(item.createdAt);
      if (!Number.isNaN(createdAt.getTime())) {
        return [{ id: item.id, prompt: item.prompt, code: item.code, createdAt }];
      }
    }
    return [];
  });
}

function parseHistory(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.filter((item): item is string => typeof item === 'string').slice(0, MAX_HISTORY);
}

type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; code: string }
  | { type: 'error'; error: string };

// 서버의 NDJSON 응답을 한 줄씩 이벤트로 파싱한다.
async function* readNdjson(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim()) yield JSON.parse(line) as StreamEvent;
    }
  }
  if (buffer.trim()) yield JSON.parse(buffer) as StreamEvent;
}

interface UseComponentGeneratorReturn {
  components: GeneratedComponent[];
  promptHistory: string[];
  isLoading: boolean;
  /** 생성 중 누적되는 코드. 생성 중이 아니면 null. */
  streamingCode: string | null;
  error: string | null;
  generate: (prompt: string, apiKey: string | undefined, provider: Provider) => Promise<void>;
  removeComponent: (id: string) => void;
  clearAll: () => void;
}

export function useComponentGenerator(): UseComponentGeneratorReturn {
  const [components, setComponents] = useLocalStorageState<GeneratedComponent[]>(
    COMPONENTS_KEY,
    [],
    parseComponents,
  );
  const [promptHistory, setPromptHistory] = useLocalStorageState<string[]>(
    HISTORY_KEY,
    [],
    parseHistory,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [streamingCode, setStreamingCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (prompt: string, apiKey: string | undefined, provider: Provider) => {
    setIsLoading(true);
    setError(null);
    setStreamingCode('');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, ...(apiKey && { apiKey }), provider }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate component');
      }

      let finalCode: string | null = null;
      for await (const event of readNdjson(res.body)) {
        if (event.type === 'delta') {
          setStreamingCode((prev) => (prev ?? '') + event.text);
        } else if (event.type === 'done') {
          finalCode = event.code;
        } else if (event.type === 'error') {
          throw new Error(event.error);
        }
      }

      if (finalCode === null) {
        throw new Error('응답이 중간에 끊겼습니다. 다시 시도해주세요.');
      }

      const newComponent: GeneratedComponent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        prompt,
        code: finalCode,
        createdAt: new Date(),
      };

      setComponents((prev) => [newComponent, ...prev]);
      setPromptHistory((prev) => [prompt, ...prev.filter((p) => p !== prompt)].slice(0, MAX_HISTORY));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setStreamingCode(null);
      setIsLoading(false);
    }
  }, [setComponents, setPromptHistory]);

  const removeComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  }, [setComponents]);

  const clearAll = useCallback(() => {
    setComponents([]);
  }, [setComponents]);

  return { components, promptHistory, isLoading, streamingCode, error, generate, removeComponent, clearAll };
}
