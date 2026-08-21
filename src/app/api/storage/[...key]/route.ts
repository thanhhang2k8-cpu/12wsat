import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getObjectBuffer, isLocalDriver } from "@/lib/storage";

// Local-disk stand-in for a signed URL: every request must carry a valid
// admin session. Nothing under here is student-facing yet (Phase 2 has no
// test-taking UI); this route goes away once STORAGE_DRIVER=s3 is set.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  if (!isLocalDriver()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { key } = await params;
  const objectKey = key.join("/");

  try {
    const buffer = await getObjectBuffer(objectKey);
    const ext = objectKey.split(".").pop()?.toLowerCase();
    const contentType =
      ext === "pdf"
        ? "application/pdf"
        : ext === "png"
          ? "image/png"
          : ext === "jpg" || ext === "jpeg"
            ? "image/jpeg"
            : "application/octet-stream";
    return new NextResponse(new Uint8Array(buffer), {
      headers: { "Content-Type": contentType, "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
