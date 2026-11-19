import { createContext, useContext } from 'react';
import type { Content, Lang } from '../content';

export type SiteContext = { t: Content; lang: Lang; openShot: (shot: string) => void };
export const Site = createContext<SiteContext | null>(null);

export function useSite(): SiteContext {
  const c = useContext(Site);
  if (!c) throw new Error('useSite outside <Site.Provider>');
  return c;
}
