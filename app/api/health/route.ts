import { NextResponse } from "next/server";
import { databaseConfigStatus, databaseErrorMessage, getDb, isDemoMode } from "@/lib/db";

export const runtime = "nodejs";

async function getAuthStoreStatus() {
  const adminEmails = ["admin@demo.com", "admin@caribbeanpos.test"];
  try {
    const result = await getDb().query<{ admin_count: string }>(
      "SELECT COUNT(*) AS admin_count FROM users WHERE email = ANY($1::text[]) AND active = TRUE",
      [adminEmails]
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
        "SELECT COUNT(*) AS admin_count FROM staff_users WHERE email = ANY($1::text[]) AND active = TRUE",
        [adminEmails]
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
        message:
          usersError instanceof Error
            ? usersError.message
            : "Unable to inspect the auth user store."
      };
    }
  }
}

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
    const auth = await getAuthStoreStatus();
    return NextResponse.json({
      ok: true,
      mode: "postgres",
      database: {
        connected: true,
        latencyMs: Date.now() - startedAt
      },
      auth,
      config
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mode: "postgres",
        database: {
          connected: false,
          message: databaseErrorMessage(error)
        },
        config
      },
      { status: 500 }
    );
  }
}
