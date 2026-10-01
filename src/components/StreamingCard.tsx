import { useEffect, useRef } from 'react';

interface StreamingCardProps {
  code: string;
}

// 생성 중인 코드를 실시간으로 보여주는 카드. 완료되면 부모가 이 카드를 내리고
// 새 ComponentCard(기본 탭: 미리보기)를 올린다.
export function StreamingCard({ code }: StreamingCardProps) {
  const blockRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const el = blockRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [code]);

  return (
    <article className="win win--output component-card streaming-card" role="status" aria-live="polite">
      <div className="win-titlebar">
        <h3 className="win-title">생성 중</h3>
      </div>
      <div className="card-toolbar">
        <div className="card-tabs" role="tablist" aria-label="보기 방식">
          <button role="tab" aria-selected={false} className="tab" disabled>
            미리보기
          </button>
          <button role="tab" aria-selected className="tab tab--active">
            코드
          </button>
        </div>
      </div>
      <div className="card-content">
        <div className="code-panel">
          <pre className="code-block" ref={blockRef}>
            <code>{code || '응답을 기다리는 중...'}</code>
            <span className="stream-caret" aria-hidden="true" />
          </pre>
        </div>
        <div className="progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </article>
  );
}
