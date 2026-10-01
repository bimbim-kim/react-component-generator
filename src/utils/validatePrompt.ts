export const MAX_PROMPT_LENGTH = 500;

export interface PromptValidation {
  valid: boolean;
  length: number;
  error?: string;
}

export function validatePrompt(prompt: string): PromptValidation {
  const length = prompt.trim().length;
  if (length > MAX_PROMPT_LENGTH) {
    return {
      valid: false,
      length,
      error: `프롬프트는 ${MAX_PROMPT_LENGTH}자를 넘을 수 없습니다.`,
    };
  }
  return { valid: true, length };
}
