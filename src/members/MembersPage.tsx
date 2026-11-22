import { useMemo } from 'react';
import type { Content, Lang } from '../content';
import { Site } from '../lib/context';
import { MembersApp } from './MembersApp';

/** The members page (/membros/, /en/members/): its own layout (no footer, no dock). Loaded only on that page, so the
 *  Markdown reader and the repository code are not part of every other page's JavaScript. */
export function MembersPage({ lang, t }: { lang: Lang; t: Content }) {
  const ctx = useMemo(() => ({ t, lang, page: 'members' as const, openShot: () => undefined }), [t, lang]);
  return (
    <Site.Provider value={ctx}>
      <MembersApp />
    </Site.Provider>
  );
}
