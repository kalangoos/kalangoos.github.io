import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useSite } from '../lib/context';
import { AUTH_URL, MEMBERS_PATH, fetchSession, signOut, type Session } from '../members/auth';

/** What the bar knows about the visitor: not connected (no login service yet), unknown, signed out or signed in. */
export type MemberState = { kind: 'soon' } | { kind: 'checking' } | { kind: 'out' } | { kind: 'in'; session: Session };

/** The landing page asks the login service once; the members page passes what it already knows. */
export function useMemberState(given?: MemberState): MemberState {
  const [state, setState] = useState<MemberState>(given ?? (AUTH_URL ? { kind: 'checking' } : { kind: 'soon' }));
  useEffect(() => {
    if (given) {
      setState(given);
      return;
    }
    if (!AUTH_URL) return;
    const ac = new AbortController();
    fetchSession(ac.signal)
      .then((s) => setState(s ? { kind: 'in', session: s } : { kind: 'out' }))
      .catch(() => setState({ kind: 'out' }));
    return () => ac.abort();
  }, [given]);
  return state;
}

function Avatar({ session, size }: { session: Session; size: number }) {
  const [broken, setBroken] = useState(false);
  const initials = (session.name || session.login)
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return session.avatarUrl && !broken ? (
    <img className="avatar" src={`${session.avatarUrl}${session.avatarUrl.includes('?') ? '&' : '?'}s=${size * 2}`} width={size} height={size} alt="" onError={() => setBroken(true)} />
  ) : (
    <span className="avatar avatar--initials" style={{ width: size, height: size }} aria-hidden="true">
      {initials}
    </span>
  );
}

/** The bar's right end: "Entrar" (with "em breve" while the login service is not connected) or the account menu. */
export function MemberButton({ state }: { state: MemberState }) {
  const { t } = useSite();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    menu.current?.querySelector<HTMLElement>('a, button')?.focus();
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (state.kind !== 'in') {
    const soon = state.kind === 'soon';
    return (
      <a className={`member-btn${soon ? ' is-soon' : ''}`} href={MEMBERS_PATH} title={soon ? t.bar.soonHint : t.bar.members}>
        <Icon name="github" className="icon member-btn__gh" />
        <span className="member-btn__label">{t.bar.signIn}</span>
        {soon && (
          <>
            <span className="member-btn__soon" aria-hidden="true">{t.bar.soon}</span>
            <span className="visually-hidden">({t.bar.soonHint})</span>
          </>
        )}
      </a>
    );
  }

  const s = state.session;
  return (
    <div className="account">
      <button
        ref={btn}
        type="button"
        className="account__btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${t.bar.account}: ${s.login}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Avatar session={s} size={32} />
        <span className="account__login">{s.login}</span>
        <Icon name="chevdown" className="icon account__chev" />
      </button>
      {open && (
        <div ref={menu} id={menuId} className="account__menu" role="menu">
          <div className="account__who">
            <Avatar session={s} size={40} />
            <div>
              <b>{s.name || s.login}</b>
              <span>
                @{s.login} · {t.bar.memberOf}
              </span>
            </div>
          </div>
          <hr />
          <a role="menuitem" href={MEMBERS_PATH} className="account__item">
            <Icon name="doc" />
            {t.bar.members}
          </a>
          <a role="menuitem" href={`https://github.com/${encodeURIComponent(s.login)}`} className="account__item" target="_blank" rel="noopener noreferrer">
            <Icon name="external" />
            {t.bar.profile}
          </a>
          <hr />
          <button
            role="menuitem"
            type="button"
            className="account__item"
            onClick={async () => {
              await signOut();
              location.href = '/';
            }}
          >
            <Icon name="power" />
            {t.bar.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
