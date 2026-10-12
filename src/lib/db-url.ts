/**
 * Resolves the Postgres connection string from whichever name the host
 * injected. Vercel's Postgres integrations differ: Neon sets DATABASE_URL
 * (pooled) + DATABASE_URL_UNPOOLED, Supabase sets POSTGRES_PRISMA_URL /
 * POSTGRES_URL, Prisma Postgres sets DATABASE_URL / POSTGRES_URL.
 * scripts/vercel-build.mjs applies the same order at build time.
 */
const POOLED = ['DATABASE_URL', 'POSTGRES_PRISMA_URL', 'POSTGRES_URL'] as const;

const isPostgres = (v: string | undefined): v is string => !!v && /^postgres(ql)?:\/\//.test(v);

export function databaseUrl(): string | undefined {
  for (const key of POOLED) {
    const value = process.env[key];
    if (isPostgres(value)) return value;
  }
  return undefined;
}

export const databaseConfigured = () => databaseUrl() !== undefined;
