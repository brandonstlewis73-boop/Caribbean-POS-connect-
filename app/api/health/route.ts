import { NextResponse } from "next/server";
import {
  databaseConfigStatus,
  databaseConnectionDiagnostics,
  databaseErrorMessage,
  getDb
} from "@/lib/db";
import { whatsappConfigStatus } from "@/lib/whatsapp-server";

export const runtime = "nodejs";

async function getAuthStoreStatus() {
  try {
    const result = await getDb().query<{ admin_count: string }>(
      "SELECT COUNT(*) AS admin_count FROM users WHERE role IN ('owner', 'admin') AND active = TRUE"
    );
    return {
      source: "users",
      usersViewAvailable: true,
      adminUserPresent: Number(result.rows[0]?.admin_count ?? 0) > 0,
      adminUserCount: Number(result.rows[0]?.admin_count ?? 0)
    };
  } catch (usersError) {
    try {
      const result = await getDb().query<{ admin_count: string }>(
        "SELECT COUNT(*) AS admin_count FROM staff_users WHERE role IN ('owner', 'admin') AND active = TRUE"
      );
      return {
        source: "staff_users",
        usersViewAvailable: false,
        adminUserPresent: Number(result.rows[0]?.admin_count ?? 0) > 0,
        adminUserCount: Number(result.rows[0]?.admin_count ?? 0),
        message: "The users view is unavailable; auth is using staff_users fallback."
      };
    } catch {
      return {
        source: null,
        usersViewAvailable: false,
        adminUserPresent: false,
        message: databaseErrorMessage(usersError)
      };
    }
  }
}

function deploymentStatus() {
  return {
    vercelUrl: process.env.VERCEL_URL || null,
    gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF || null
  };
}

export async function GET() {
  const config = databaseConfigStatus();
  const diagnostics = databaseConnectionDiagnostics();
  const deployment = deploymentStatus();
  const whatsapp = whatsappConfigStatus();
  const startedAt = Date.now();

  try {
    await getDb().query("SELECT 1");
    const auth = await getAuthStoreStatus();
    return NextResponse.json({
      ok: true,
      mode: "postgres",
      database: {
        connected: true,
        select1: true,
        message: "Connected",
        ...diagnostics,
        latencyMs: Date.now() - startedAt
      },
      auth,
      config,
      deployment,
      whatsapp
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mode: "postgres",
        database: {
          connected: false,
          select1: false,
          message: databaseErrorMessage(error),
          ...diagnostics
        },
        config,
        deployment,
        whatsapp
      },
      { status: 500 }
    );
  }
}
