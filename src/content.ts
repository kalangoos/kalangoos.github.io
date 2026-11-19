import type pt from './content/pt-BR.json';

/** The page's text: src/content/pt-BR.json and src/content/en.json have the same shape. */
export type Content = typeof pt;
export type Lang = 'pt-BR' | 'en';

/** Every screenshot on the page: real captures from the KalangoOS test session (see site/README.md). */
export const SHOTS: Record<string, { w: number; h: number; small?: boolean }> = {
  desktop: { w: 1280, h: 800, small: true },
  'files-agent': { w: 1280, h: 800, small: true },
  documents: { w: 1280, h: 800, small: true },
  'command-ui': { w: 1280, h: 800, small: true },
  'new-agent': { w: 1280, h: 800, small: true },
  'chat-changes': { w: 1280, h: 800, small: true },
  'privacy-panel': { w: 460, h: 590 },
  'monitor-agents': { w: 1280, h: 800, small: true },
  'install-agent': { w: 1280, h: 800, small: true },
  today: { w: 1280, h: 800, small: true },
  spaces: { w: 1280, h: 800, small: true },
  lock: { w: 1280, h: 800, small: true },
  light: { w: 1280, h: 800, small: true },
  editor: { w: 1280, h: 800, small: true },
  music: { w: 1280, h: 800, small: true },
  help: { w: 1280, h: 800, small: true },
  'chat-data': { w: 1280, h: 800, small: true },
  calculator: { w: 1280, h: 800, small: true },
  'first-use': { w: 699, h: 320 },
};

export type ShotRef = { shot: string; caption: string; alt: string };

/** The page's captures in reading order, without repeats: what the lightbox steps through. */
export function allShots(t: Content): ShotRef[] {
  const list: ShotRef[] = [
    { shot: 'desktop', caption: t.hero.shotCaption, alt: t.hero.shotAlt },
    ...t.agents.tabs.map((x) => ({ shot: x.shot, caption: x.title, alt: x.alt })),
    ...t.privacy.shots,
    { shot: 'install-agent', caption: t.security.install.caption, alt: t.security.install.alt },
    ...t.desktop.bento,
    ...t.gallery.items,
  ];
  const seen = new Set<string>();
  return list.filter((s) => (seen.has(s.shot) ? false : (seen.add(s.shot), true)));
}
