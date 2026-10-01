import { useState, useEffect } from 'react';
import { PromptInput } from './components/PromptInput';
import { ComponentCard } from './components/ComponentCard';
import { useComponentGenerator } from './hooks/useComponentGenerator';
import type { Provider } from './types';
import './App.css';

const PROVIDER_CONFIG = {
  anthropic: { label: 'Anthropic', placeholder: 'sk-ant-...' },
  google: { label: 'Google', placeholder: 'AIza...' },
} as const;

function App() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [provider, setProvider] = useState<Provider>('google');
  const [envKeys, setEnvKeys] = useState<Record<Provider, boolean>>({
    anthropic: false,
    google: false,
  });
  const { components, isLoading, error, generate, removeComponent, clearAll } =
    useComponentGenerator();

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setEnvKeys(data.envKeys))
      .catch(() => {});
  }, []);

  const hasEnvKey = envKeys[provider];

  const handleGenerate = (prompt: string) => {
    if (!apiKey.trim() && !hasEnvKey) {
      alert(`${PROVIDER_CONFIG[provider].label} API 키를 입력하거나 .env에 설정해주세요.`);
      return;
    }
    generate(prompt, apiKey || undefined, provider);
  };

  const handleProviderChange = (newProvider: Provider) => {
    setProvider(newProvider);
    setApiKey('');
  };

  const activeProvider = PROVIDER_CONFIG[provider].label;

  return (
    <div className="desktop">
      <header className="menubar">
        <h1 className="menubar-title">
          <span className="menubar-glyph" aria-hidden="true" />
          React 컴포넌트 생성기
        </h1>
        <dl className="menubar-status" aria-label="현재 작업 상태">
          <div>
            <dt>공급자</dt>
            <dd>{activeProvider}</dd>
          </div>
          <div>
            <dt>만든 컴포넌트</dt>
            <dd>{components.length}개</dd>
          </div>
        </dl>
      </header>

      <main className="workspace">
        <section className="win win--prompt composer-panel" aria-labelledby="composer-title">
          <div className="win-titlebar">
            <span className="win-title" id="composer-title">새 컴포넌트</span>
          </div>
          <div className="win-body">
            <PromptInput onGenerate={handleGenerate} isLoading={isLoading} />
          </div>
        </section>

        <aside className="win win--settings settings-panel" aria-labelledby="settings-title">
          <div className="win-titlebar">
            <span className="win-title" id="settings-title">실행 설정</span>
          </div>
          <div className="win-body settings-body">
            <div className="field">
              <label htmlFor="provider">AI 공급자</label>
              <select
                id="provider"
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as Provider)}
              >
                {Object.entries(PROVIDER_CONFIG).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="api-key">API 키</label>
              <div className="api-key-field">
                <input
                  id="api-key"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    hasEnvKey
                      ? '서버 키 사용 중 (입력하면 덮어씀)'
                      : PROVIDER_CONFIG[provider].placeholder
                  }
                />
                <button
                  className="btn btn-toggle-key"
                  onClick={() => setShowKey(!showKey)}
                  type="button"
                >
                  {showKey ? '숨기기' : '보기'}
                </button>
              </div>
              <p className={`key-status ${hasEnvKey ? 'key-status--ready' : ''}`}>
                <span className="key-lamp" aria-hidden="true" />
                {hasEnvKey ? '.env 키가 연결되어 있습니다.' : '키를 입력하거나 .env에 설정하세요.'}
              </p>
            </div>
          </div>
        </aside>
      </main>

      {error && (
        <div className="alert" role="alert">
          <span className="alert-icon" aria-hidden="true">!</span>
          <p>{error}</p>
        </div>
      )}

      <section className="results-section" aria-label="생성된 컴포넌트">
        {components.length > 0 && (
          <div className="results-header">
            <h2>생성된 컴포넌트 {components.length}개</h2>
            <button className="btn btn-clear" onClick={clearAll}>
              전체 삭제
            </button>
          </div>
        )}

        {components.length === 0 && !isLoading && (
          <div className="empty-state">
            <span className="empty-icon" aria-hidden="true" />
            <p>
              아직 만든 컴포넌트가 없습니다.
              <br />
              위 창에 원하는 UI를 적고 <strong>컴포넌트 생성</strong>을 누르세요.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="win win--output loading-card" role="status">
            <div className="win-titlebar">
              <span className="win-title">생성 중</span>
            </div>
            <div className="win-body">
              <p>컴포넌트를 만들고 있습니다.</p>
              <div className="progress" aria-hidden="true">
                <span />
              </div>
            </div>
          </div>
        )}

        <div className="results-grid">
          {components.map((component) => (
            <ComponentCard
              key={component.id}
              component={component}
              onRemove={removeComponent}
              onRegenerate={handleGenerate}
              isLoading={isLoading}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default App;
