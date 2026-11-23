// kalangoos/design: showcase PNGs grouped by SO / Ferramentas (no secrets).

export const DESIGN_REPO = 'kalangoos/design';
export const DESIGN_BRANCH = 'main';
export const DESIGN_RAW = `https://raw.githubusercontent.com/${DESIGN_REPO}/${DESIGN_BRANCH}/`;
export const DESIGN_BLOB = `https://github.com/${DESIGN_REPO}`;

export type DesignVitrinePage = {
  group: string;
  product: string;
  dir: string;
  files: string[];
};

export type DesignManifest = {
  figcraft?: string;
  vitrine: DesignVitrinePage[];
  note?: string;
};

export type DesignShot = {
  group: string;
  product: string;
  dir: string;
  file: string;
  path: string;
  label: string;
};

export async function fetchDesignManifest(signal?: AbortSignal): Promise<DesignManifest> {
  const r = await fetch(`${DESIGN_RAW}exports/manifest.json`, { signal });
  if (!r.ok) throw new Error(`manifest ${r.status}`);
  return (await r.json()) as DesignManifest;
}

export function shotUrl(shot: Pick<DesignShot, 'dir' | 'file'>): string {
  return `${DESIGN_RAW}exports/vitrine/${shot.dir.split('/').map(encodeURIComponent).join('/')}/${encodeURIComponent(shot.file)}`;
}
