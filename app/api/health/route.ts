import { NextResponse } from "next/server";
import { databaseConfigStatus, getDb, isDemoMode } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const config = databaseConfigStatus();
  const startedAt = Date.now();

  if (isDemoMode) {
    return NextResponse.json({
      ok: true,
      mode: "demo",
      database: {
        connected: false,
        message: "Demo memory mode is active. Saves are not persistent across server restarts."
      },
      config
    });
  }

  try {
    await getDb().query("SELECT 1");
    return NextResponse.json({
      ok: true,
      mode: "postgres",
      database: {
        connected: true,
        latencyMs: Date.now() - startedAt
      },
      config
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mode: "postgres",
        database: {
          connected: false,
          message: error instanceof Error ? error.message : "Database health check failed."
        },
        config
      },
      { status: 500 }
    );
  }
}
