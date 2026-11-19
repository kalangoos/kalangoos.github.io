import type { CSSProperties } from 'react';
import { Icon } from './Icon';
import { useSite } from '../lib/context';

type Approval = { title: string; risk: string; body: string; command: string; scope: string; deny: string; allowOnce: string; always: string };

/** The approval card, as the system draws it (component "Aprovação"). Illustrative: its buttons do nothing. */
export function ApprovalCard({ a, className = '', style }: { a: Approval; className?: string; style?: CSSProperties }) {
  return (
    <div className={`approval ${className}`} style={style}>
      <div className="approval__head">
        <Icon name="shield" />
        <b>{a.title}</b>
        <span className="badge badge--gold">{a.risk}</span>
      </div>
      <p>{a.body}</p>
      <code>{a.command}</code>
      <small>{a.scope}</small>
      <div className="approval__actions" aria-hidden="true">
        <span className="deny">{a.deny}</span>
        <span className="allow">{a.allowOnce}</span>
        <span className="always">{a.always}</span>
      </div>
    </div>
  );
}

export function StepRow({ title, detail, waiting, style, className = '' }: { title: string; detail: string; waiting?: boolean; style?: CSSProperties; className?: string }) {
  return (
    <li className={`step${waiting ? ' step--waiting' : ''} ${className}`} style={style}>
      <Icon name={waiting ? 'alert' : 'check'} />
      <span className="step__text">
        <b>{title}</b>
        <span>{detail}</span>
      </span>
      <Icon name="chev" />
    </li>
  );
}

/** The right side bar in Agent mode, made of the system's components: an illustration, labelled as such. */
export function AgentPanel() {
  const { t } = useSite();
  const P = t.hero.panel;
  return (
    <aside className="agent-panel is-illustration" aria-label={P.label}>
      <div className="agent-panel__modes" aria-hidden="true">
        <div className="segmented">
          {P.tabs.map((x, i) => (
            <span key={x} className={i === 2 ? 'is-on' : ''}>{x}</span>
          ))}
        </div>
      </div>
      <div className="panel-head">
        <span className="avatar"><Icon name="spark" /></span>
        <span className="panel-head__who">
          <b>{P.agent}</b>
          <span>{P.model}</span>
        </span>
        <span className="panel-head__tools" aria-hidden="true">
          <span><Icon name="dots" /></span>
          <span><Icon name="close" /></span>
        </span>
      </div>
      <div className="agent-panel__body">
        <p className="msg-user cascade" style={{ '--i': 0 } as CSSProperties}>{P.user}</p>
        <p className="steps-summary cascade" style={{ '--i': 1 } as CSSProperties}>
          <Icon name="bolt" />
          {P.stepsSummary}
        </p>
        <ol className="stack-v" style={{ gap: 10 }}>
          {P.steps.map((s, i) => (
            <StepRow key={s.title} title={s.title} detail={s.detail} waiting={s.state === 'waiting'} className="cascade" style={{ '--i': i + 2 } as CSSProperties} />
          ))}
        </ol>
        <ApprovalCard a={P.approval} className="cascade" style={{ '--i': 5 } as CSSProperties} />
      </div>
      <div className="composer" aria-hidden="true">
        <span className="composer__placeholder">{P.composer}</span>
        <span className="composer__tools">
          <span><Icon name="plus" /></span>
          <span><Icon name="network" /></span>
          <span><Icon name="sliders" /></span>
          <span className="composer__model"><span className="dot" />LFM3 1.7B</span>
          <span><Icon name="mic" /></span>
          <span className="composer__send"><Icon name="send" /></span>
        </span>
      </div>
      <p className="agent-panel__label">
        <Icon name="info" />
        {P.label}
      </p>
    </aside>
  );
}
