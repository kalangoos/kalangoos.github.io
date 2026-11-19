import type pt from './content/pt-BR.json';

/** The page's text: src/content/pt-BR.json and src/content/en.json have the same shape. */
export type Content = typeof pt;
export type Lang = 'pt-BR' | 'en';

/** Every screenshot on the page: real captures from the KalangoOS test session (see site/README.md). */
/** small: there is a 640 px version too; light: there is a capture of the same screen in the light theme (<name>-light). */
export const SHOTS: Record<string, { w: number; h: number; small?: boolean; light?: boolean }> = {
  desktop: { w: 1280, h: 800, small: true, light: true },
  'files-agent': { w: 1280, h: 800, small: true, light: true },
  documents: { w: 1280, h: 800, small: true, light: true },
  'command-ui': { w: 1280, h: 800, small: true, light: true },
  'new-agent': { w: 1280, h: 800, small: true, light: true },
  'chat-changes': { w: 1280, h: 800, small: true, light: true },
  'privacy-panel': { w: 460, h: 590, light: true },
  'monitor-agents': { w: 1280, h: 800, small: true, light: true },
  'install-agent': { w: 1280, h: 800, small: true, light: true },
  today: { w: 1280, h: 800, small: true, light: true },
  spaces: { w: 1280, h: 800, small: true, light: true },
  lock: { w: 1280, h: 800, small: true, light: true },
  appearance: { w: 1280, h: 800, small: true, light: true },
  editor: { w: 1280, h: 800, small: true, light: true },
  music: { w: 1280, h: 800, small: true, light: true },
  help: { w: 1280, h: 800, small: true, light: true },
  'chat-data': { w: 1280, h: 800, small: true, light: true },
  calculator: { w: 1280, h: 800, small: true, light: true },
  'first-use': { w: 699, h: 320, light: true },
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
