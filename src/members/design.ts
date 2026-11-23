// kalangoos/design: showcase PNGs + optional live FigCraft share metadata (no secrets).

export const DESIGN_REPO = 'kalangoos/design';
export const DESIGN_BRANCH = 'main';
export const DESIGN_RAW = `https://raw.githubusercontent.com/${DESIGN_REPO}/${DESIGN_BRANCH}/`;
export const DESIGN_BLOB = `https://github.com/${DESIGN_REPO}`;

export type DesignManifest = {
  figcraft?: string;
  vitrine: { dir: string; files: string[] }[];
  note?: string;
};

export type DesignLive = {
  server: string;
  health?: string;
  viewUrl?: string | null;
  viewCode?: string | null;
  note?: string;
};

export type DesignShot = { dir: string; file: string; path: string; label: string };

export async function fetchDesignManifest(signal?: AbortSignal): Promise<DesignManifest> {
  const r = await fetch(`${DESIGN_RAW}exports/manifest.json`, { signal });
  if (!r.ok) throw new Error(`manifest ${r.status}`);
  return (await r.json()) as DesignManifest;
}

export async function fetchDesignLive(signal?: AbortSignal): Promise<DesignLive | null> {
  const r = await fetch(`${DESIGN_RAW}exports/live.json`, { signal });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`live ${r.status}`);
  return (await r.json()) as DesignLive;
}
