import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { useSite } from '../lib/context';
import { Notice, SearchField, SideItem, SidePanel, useSlashFocus } from './Layout';
import { DESIGN_BLOB, DESIGN_RAW, fetchDesignLive, fetchDesignManifest, type DesignLive, type DesignManifest, type DesignShot } from './design.ts';

/** Telas: FigCraft showcase PNGs from kalangoos/design, plus the live server status for view-only share. */
export function Screens({ shotPath }: { shotPath?: string }) {
  const { t } = useSite();
  const L = t.members.screens;
  const [manifest, setManifest] = useState<DesignManifest | null>(null);
  const [live, setLive] = useState<DesignLive | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useSlashFocus(input);

  useEffect(() => {
    const ac = new AbortController();
    Promise.all([fetchDesignManifest(ac.signal), fetchDesignLive(ac.signal)])
      .then(([m, l]) => {
        setManifest(m);
        setLive(l);
      })
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setError(e.message || L.loadError);
      });
    return () => ac.abort();
  }, [L.loadError]);

  const shots = useMemo(() => (manifest ? flattenShots(manifest) : []), [manifest]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return shots;
    return shots.filter((s) => s.label.toLowerCase().includes(q) || s.dir.toLowerCase().includes(q));
  }, [shots, query]);

  const current = shotPath ? shots.find((s) => s.path === shotPath) : filtered[0] ?? shots[0];
  const search = (inSheet: boolean) => (
    <SearchField value={query} onChange={setQuery} placeholder={L.search} inputRef={inSheet ? undefined : input} />
  );

  return (
    <div className="mview mview--screens">
      <SidePanel title={L.title} current={current?.label ?? L.title} icon="apps" search={search}>
        {error ? (
          <p className="side__empty">{error}</p>
        ) : !manifest ? (
          <p className="side__empty">{L.loading}</p>
        ) : filtered.length === 0 ? (
          <p className="side__empty">{L.empty}</p>
        ) : (
          groupByDir(filtered).map(([dir, list]) => (
            <div key={dir}>
              <p className="side__group">{dirLabel(dir)}</p>
              {list.map((s) => (
                <SideItem key={s.path} href={`#/telas/${encodeShot(s.path)}`} label={s.label} icon="apps" current={current?.path === s.path} />
              ))}
            </div>
          ))
        )}
      </SidePanel>

      <div className="mcontent screens">
        <header className="screens__head">
          <div>
            <p className="screens__eyebrow">{L.eyebrow}</p>
            <h1 className="screens__title">{current?.label ?? L.title}</h1>
            <p className="screens__lead">{L.lead}</p>
          </div>
          <div className="screens__actions">
            <a className="screens__link" href={DESIGN_BLOB} target="_blank" rel="noopener noreferrer">
              <Icon name="github" />
              {L.repo}
              <Icon name="external" />
            </a>
            {current && (
              <a
                className="screens__link"
                href={`${DESIGN_RAW}exports/vitrine/${encodeURIComponent(current.dir)}/${encodeURIComponent(current.file)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {L.openPng}
                <Icon name="external" />
              </a>
            )}
          </div>
        </header>

        <LiveBanner live={live} copy={L} />

        {error ? (
          <Notice tone="error">{error}</Notice>
        ) : !current ? (
          <Notice>{L.empty}</Notice>
        ) : (
          <figure className="screens__figure">
            <img
              className="screens__img"
              src={`${DESIGN_RAW}exports/vitrine/${encodeURIComponent(current.dir)}/${encodeURIComponent(current.file)}`}
              alt={current.label}
              loading="eager"
            />
            <figcaption className="screens__cap">
              <code>
                exports/vitrine/{current.dir}/{current.file}
              </code>
            </figcaption>
          </figure>
        )}
      </div>
    </div>
  );
}

function LiveBanner({
  live,
  copy,
}: {
  live: DesignLive | null;
  copy: {
    liveTitle: string;
    liveWaiting: string;
    liveOpen: string;
    liveServer: string;
    liveHealth: string;
    liveHint: string;
  };
}) {
  if (!live) return null;
  const view = live.viewUrl?.trim() || null;
  return (
    <section className="screens__live" aria-label={copy.liveTitle}>
      <div className="screens__live-text">
        <strong>{copy.liveTitle}</strong>
        <p>{view ? copy.liveOpen : copy.liveWaiting}</p>
        <p className="screens__live-hint">{copy.liveHint}</p>
      </div>
      <div className="screens__live-links">
        {view ? (
          <a className="screens__btn" href={view} target="_blank" rel="noopener noreferrer">
            {copy.liveOpen}
            <Icon name="external" />
          </a>
        ) : null}
        <a className="screens__link" href={live.health || live.server.replace(/^wss:/, 'https:').replace(/\/$/, '') + '/healthz'} target="_blank" rel="noopener noreferrer">
          {copy.liveHealth}
          <Icon name="external" />
        </a>
        <code className="screens__server" title={copy.liveServer}>
          {live.server}
        </code>
      </div>
    </section>
  );
}

function flattenShots(m: DesignManifest): DesignShot[] {
  const out: DesignShot[] = [];
  for (const page of m.vitrine ?? []) {
    for (const file of page.files ?? []) {
      out.push({
        dir: page.dir,
        file,
        path: `${page.dir}/${file}`,
        label: file.replace(/\.png$/i, '').replace(/_/g, ' '),
      });
    }
  }
  return out;
}

function groupByDir(shots: DesignShot[]): [string, DesignShot[]][] {
  const map = new Map<string, DesignShot[]>();
  for (const s of shots) {
    const list = map.get(s.dir) ?? [];
    list.push(s);
    map.set(s.dir, list);
  }
  return [...map.entries()];
}

function dirLabel(dir: string): string {
  return dir.replace(/_/g, ' ').replace(/-/g, ' · ');
}

/** Path segments for the hash: encode each piece so spaces and unicode stay stable. */
export function encodeShot(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

export function decodeShot(path: string): string {
  return path
    .split('/')
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    })
    .join('/');
}
