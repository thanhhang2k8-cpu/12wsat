import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    // Drop a stale/revoked cookie so the browser stops sending it.
    await clearSessionCookie();
  }
  return NextResponse.json(
    { valid: !!session },
    { headers: { "Cache-Control": "no-store" } },
  );
}
