import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { useSite } from '../lib/context';
import { Notice, SearchField, SideItem, SidePanel, useSlashFocus } from './Layout';
import { DESIGN_BLOB, fetchDesignManifest, shotUrl, type DesignManifest, type DesignShot } from './design.ts';

const GROUP_LABELS: Record<string, { pt: string; en: string }> = {
  SO: { pt: 'Sistema (SO)', en: 'OS' },
  Ferramentas: { pt: 'Ferramentas', en: 'Tools' },
};

const PRODUCT_LABELS: Record<string, string> = {
  kalangoos: 'KalangoOS',
  marca: 'Marca',
  site: 'Site',
  'kalango-audio': 'kalango-audio',
  'kalango-agents': 'kalango-agents',
  'kalango-remote': 'kalango-remote',
  'kalango-virtualdesk': 'kalango-virtualdesk',
};

/** Telas: FigCraft showcase PNGs from kalangoos/design, grouped by OS and tools. */
export function Screens({ shotPath }: { shotPath?: string }) {
  const { t, lang } = useSite();
  const L = t.members.screens;
  const [manifest, setManifest] = useState<DesignManifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useSlashFocus(input);

  useEffect(() => {
    const ac = new AbortController();
    fetchDesignManifest(ac.signal)
      .then(setManifest)
      .catch((e: Error) => {
        if (e.name !== 'AbortError') setError(e.message || L.loadError);
      });
    return () => ac.abort();
  }, [L.loadError]);

  const shots = useMemo(() => (manifest ? flattenShots(manifest) : []), [manifest]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return shots;
    return shots.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.product.toLowerCase().includes(q) ||
        s.group.toLowerCase().includes(q) ||
        s.dir.toLowerCase().includes(q),
    );
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
          groupTree(filtered).map(([group, products]) => (
            <div key={group}>
              <p className="side__group">{groupLabel(group, lang)}</p>
              {products.map(([product, list]) => (
                <div key={`${group}/${product}`} className="side__product">
                  <p className="side__product-label">{productLabel(product)}</p>
                  {list.map((s) => (
                    <SideItem
                      key={s.path}
                      href={`#/telas/${encodeShot(s.path)}`}
                      label={s.label}
                      icon="apps"
                      current={current?.path === s.path}
                    />
                  ))}
                </div>
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
            {current ? (
              <p className="screens__meta">
                {groupLabel(current.group, lang)} · {productLabel(current.product)}
              </p>
            ) : null}
          </div>
          <div className="screens__actions">
            <a className="screens__link" href={DESIGN_BLOB} target="_blank" rel="noopener noreferrer">
              <Icon name="github" />
              {L.repo}
              <Icon name="external" />
            </a>
            {current && (
              <a className="screens__link" href={shotUrl(current)} target="_blank" rel="noopener noreferrer">
                {L.openPng}
                <Icon name="external" />
              </a>
            )}
          </div>
        </header>

        {error ? (
          <Notice tone="error">{error}</Notice>
        ) : !current ? (
          <Notice>{L.empty}</Notice>
        ) : (
          <figure className="screens__figure">
            <img className="screens__img" src={shotUrl(current)} alt={current.label} loading="eager" />
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

function flattenShots(m: DesignManifest): DesignShot[] {
  const out: DesignShot[] = [];
  for (const page of m.vitrine ?? []) {
    const group = page.group || page.dir.split('/')[0] || 'SO';
    const product = page.product || page.dir.split('/')[1] || page.dir;
    for (const file of page.files ?? []) {
      out.push({
        group,
        product,
        dir: page.dir,
        file,
        path: `${page.dir}/${file}`,
        label: file.replace(/\.png$/i, '').replace(/_/g, ' '),
      });
    }
  }
  return out;
}

function groupTree(shots: DesignShot[]): [string, [string, DesignShot[]][]][] {
  const byGroup = new Map<string, Map<string, DesignShot[]>>();
  for (const s of shots) {
    let products = byGroup.get(s.group);
    if (!products) {
      products = new Map();
      byGroup.set(s.group, products);
    }
    const list = products.get(s.product) ?? [];
    list.push(s);
    products.set(s.product, list);
  }
  return [...byGroup.entries()].map(([g, products]) => [g, [...products.entries()]]);
}

function groupLabel(group: string, lang: string): string {
  const entry = GROUP_LABELS[group];
  if (!entry) return group;
  return lang === 'en' ? entry.en : entry.pt;
}

function productLabel(product: string): string {
  return PRODUCT_LABELS[product] ?? product;
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
