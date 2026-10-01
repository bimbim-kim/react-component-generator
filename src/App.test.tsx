import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App 설정 영속성', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ envKeys: { anthropic: false, google: false } }) }),
    );
  });

  it('입력한 API 키는 localStorage에 저장되지 않고 새로 마운트하면 비워진다', async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.type(screen.getByLabelText('API 키'), 'AIza-test');
    expect(JSON.stringify({ ...localStorage })).not.toContain('AIza-test');
    first.unmount();

    render(<App />);
    expect(screen.getByLabelText('API 키')).toHaveValue('');
  });

  it('선택한 공급자가 새로 마운트해도 유지된다', async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await user.selectOptions(screen.getByLabelText('AI 공급자'), 'anthropic');
    first.unmount();

    render(<App />);
    expect(screen.getByLabelText('AI 공급자')).toHaveValue('anthropic');
  });

  it('저장된 공급자 값이 올바르지 않으면 기본값(google)을 쓴다', () => {
    localStorage.setItem('rcg:provider', JSON.stringify('openai'));
    render(<App />);
    expect(screen.getByLabelText('AI 공급자')).toHaveValue('google');
  });
});
