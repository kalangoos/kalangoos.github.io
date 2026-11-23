/**
 * The landing page's videos, in one place. The clips are rendered with Remotion from the real screens (remotion repo,
 * src/kalango/site: SiteTour and Clip* compositions, 1280×800, VP9) and live in public/video/ as WebM, one render per
 * theme (`src` dark, `light` light) plus a poster JPG (the first frame) for each. Media.tsx picks the render for the
 * page's theme and swaps it when the theme changes. An entry that is `null` shows the poster capture with the
 * "▶ CLIPE" badge instead, so nothing points at a missing file.
 */
export type ClipSource = { src: string; light?: string; poster?: string; posterLight?: string } | null;

const video = (name: string): NonNullable<ClipSource> => ({
  src: `/video/${name}-dark.webm`,
  light: `/video/${name}-light.webm`,
  poster: `/video/${name}-dark.jpg`,
  posterLight: `/video/${name}-light.jpg`,
});

export const CLIPS: Record<'tour' | 'agentes' | 'aprovar' | 'privacidade' | 'desktop', ClipSource> = {
  /** the one-minute tour in the hero (chapters in landing.tour.chapters) */
  tour: video('tour'),
  /** the four feature rows (8 s loops), by landing.features.items[].id */
  agentes: video('clip-agentes'),
  aprovar: video('clip-aprovar'),
  privacidade: video('clip-privacidade'),
  desktop: video('clip-desktop'),
};

/** The known external addresses (anything not here, like Discord or a YouTube channel, is shown as "coming soon"). */
export const LINKS = {
  org: 'https://github.com/kalangoos',
  repo: 'https://github.com/kalangoos/kalangoos',
  release: 'https://github.com/kalangoos/kalangoos/releases/tag/v0.1.0',
  releases: 'https://github.com/kalangoos/kalangoos/releases',
  roadmap: 'https://github.com/kalangoos/kalangoos/blob/main/ROADMAP.md',
  members: '/membros/',
  discord: 'https://discord.gg/Yvu762kNr',
  youtube: 'https://www.youtube.com/@KalangoOS',
} as const;
