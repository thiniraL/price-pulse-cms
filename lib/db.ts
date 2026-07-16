import { Pool, QueryResultRow } from 'pg';

const globalForPg = globalThis as unknown as { pgPool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured');
  }

  return new Pool({
    connectionString,
    max: 10,
    ssl: connectionString.includes('supabase.com')
      ? { rejectUnauthorized: false }
      : undefined,
  });
}

export function getPool(): Pool {
  if (!globalForPg.pgPool) {
    globalForPg.pgPool = createPool();
  }
  return globalForPg.pgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return getPool().query<T>(text, params);
}
