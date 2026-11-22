/**
 * The landing page's videos, in one place. The clips are rendered with Remotion from the real screens and dropped in
 * public/video/ (WebM). Until a clip exists its entry is `null`: the page shows the poster capture with the
 * "▶ CLIPE" badge instead, so nothing points at a missing file. To publish one, set its path, e.g.
 * `agentes: { src: '/video/agentes.webm' }` (optionally `light` for a light-theme render).
 */
export type ClipSource = { src: string; light?: string } | null;

export const CLIPS: Record<'tour' | 'agentes' | 'aprovar' | 'privacidade' | 'desktop', ClipSource> = {
  /** the one-minute tour in the hero (chapters in landing.tour.chapters) */
  tour: null,
  /** the four feature rows (8 s loops), by landing.features.items[].id */
  agentes: null,
  aprovar: null,
  privacidade: null,
  desktop: null,
};

/** The known external addresses (anything not here, like Discord or a YouTube channel, is shown as "coming soon"). */
export const LINKS = {
  org: 'https://github.com/kalangoos',
  repo: 'https://github.com/kalangoos/kalangoos',
  release: 'https://github.com/kalangoos/kalangoos/releases/tag/v0.1.0',
  releases: 'https://github.com/kalangoos/kalangoos/releases',
  roadmap: 'https://github.com/kalangoos/kalangoos/blob/main/ROADMAP.md',
  members: '/membros/',
} as const;
