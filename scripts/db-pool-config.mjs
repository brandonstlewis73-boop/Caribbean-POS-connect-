const SSL_QUERY_PARAMS = ["sslmode", "ssl", "sslcert", "sslkey", "sslrootcert"];

function normalizeConnectionString(connectionString) {
  const trimmedConnectionString = connectionString.trim();
  try {
    const parsed = new URL(trimmedConnectionString);
    const sslMode =
      parsed.searchParams.get("sslmode")?.toLowerCase() ||
      parsed.searchParams.get("ssl")?.toLowerCase() ||
      null;
    for (const param of SSL_QUERY_PARAMS) {
      parsed.searchParams.delete(param);
    }
    return {
      connectionString: parsed.toString(),
      host: parsed.hostname,
      sslMode
    };
  } catch {
    const host = trimmedConnectionString.match(/@([^/:?]+)(?::\d+)?/)?.[1] || "";
    const sslMode = trimmedConnectionString.match(/[?&](?:sslmode|ssl)=([^&]+)/i)?.[1]?.toLowerCase() || null;
    return {
      connectionString: trimmedConnectionString,
      host,
      sslMode
    };
  }
}

export function createPoolConfig(connectionString) {
  const normalized = normalizeConnectionString(connectionString);
  const usesSupabase = normalized.host.includes("supabase.co") ||
    normalized.host.endsWith(".pooler.supabase.com");
  const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  const ssl = normalized.sslMode === "no-verify" || usesSupabase
    ? { rejectUnauthorized: false }
    : normalized.sslMode === "require" || isProduction || process.env.PGSSLMODE === "require"
      ? true
      : undefined;

  return {
    connectionString: normalized.connectionString,
    ssl
  };
}
