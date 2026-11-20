/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Address of the login service (Cloudflare Worker), e.g. https://auth.kalangoos.com. Empty: the members area is not connected. */
  readonly VITE_AUTH_URL?: string;
  /** "1" only in local builds to look at the members area without a session (docs and spec are public data). */
  readonly VITE_MEMBERS_PREVIEW?: string;
}
