import { describe, it, expect } from 'vitest';
import { validatePrompt, MAX_PROMPT_LENGTH } from './validatePrompt';

describe('validatePrompt', () => {
  it('최대 길이는 500자다', () => {
    expect(MAX_PROMPT_LENGTH).toBe(500);
  });

  it('500자 이하면 유효하다', () => {
    expect(validatePrompt('가'.repeat(500))).toEqual({ valid: true, length: 500 });
  });

  it('500자를 넘으면 유효하지 않고 에러 메시지를 반환한다', () => {
    const result = validatePrompt('가'.repeat(501));
    expect(result.valid).toBe(false);
    expect(result.length).toBe(501);
    expect(result.error).toBe('프롬프트는 500자를 넘을 수 없습니다.');
  });

  it('앞뒤 공백은 길이에 포함하지 않는다', () => {
    expect(validatePrompt(`  ${'a'.repeat(500)}  `).valid).toBe(true);
  });
});
