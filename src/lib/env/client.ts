import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod/v4';

export const clientEnv = createEnv({
  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_GA4_ID: z.string().optional(),
    NEXT_PUBLIC_GTM_ID: z.string().optional(),
    NEXT_PUBLIC_META_PIXEL_ID: z.string().optional(),
    NEXT_PUBLIC_GOOGLE_ADS_ID: z.string().optional(),
    NEXT_PUBLIC_TRIAGE_E2E_PUBLIC_KEY: z.string().optional(),
    NEXT_PUBLIC_TRIAGE_E2E_KEY_VERSION: z.string().optional(),
  },

  experimental__runtimeEnv: {
    NEXT_PUBLIC_GA4_ID: process.env.NEXT_PUBLIC_GA4_ID,
    NEXT_PUBLIC_GTM_ID: process.env.NEXT_PUBLIC_GTM_ID,
    NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
    NEXT_PUBLIC_GOOGLE_ADS_ID: process.env.NEXT_PUBLIC_GOOGLE_ADS_ID,
    NEXT_PUBLIC_TRIAGE_E2E_PUBLIC_KEY: process.env.NEXT_PUBLIC_TRIAGE_E2E_PUBLIC_KEY,
    NEXT_PUBLIC_TRIAGE_E2E_KEY_VERSION: process.env.NEXT_PUBLIC_TRIAGE_E2E_KEY_VERSION,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined.
   * `SOME_VAR: z.string()` and `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
