import { ICONS } from '../lib/icons.generated';
import { SITE_ICONS } from '../lib/icons.site';

/** A symbolic icon from the KalangoOS Design System (24×24, drawn in currentColor). */
export function Icon({ name, className = 'icon', label }: { name: string; className?: string; label?: string }) {
  const body = ICONS[name] ?? SITE_ICONS[name] ?? ICONS.spark;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}
