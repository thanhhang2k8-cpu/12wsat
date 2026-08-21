import "server-only";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Storage abstraction so the app can start on local disk (this dev/eval
 * environment has no S3-compatible bucket) and move to Supabase
 * Storage / Cloudflare R2 in production without touching call sites — both
 * speak the S3 API, so only STORAGE_DRIVER + the S3_* env vars change.
 */

const DRIVER = process.env.STORAGE_DRIVER === "s3" ? "s3" : "local";
const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

function s3Client() {
  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
  });
}

export async function putObject(key: string, data: Buffer, contentType: string): Promise<void> {
  if (DRIVER === "s3") {
    await s3Client().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );
    return;
  }

  const filePath = path.join(LOCAL_ROOT, key);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  if (DRIVER === "s3") {
    const res = await s3Client().send(
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key }),
    );
    const bytes = await res.Body!.transformToByteArray();
    return Buffer.from(bytes);
  }
  return readFile(path.join(LOCAL_ROOT, key));
}

/**
 * A short-lived URL to view the object. On the `s3` driver this is a real
 * signed URL (per spec 2.3: "ảnh phục vụ qua signed URL ngắn hạn"). On the
 * `local` driver it proxies through an admin-only route handler instead —
 * there is no signed-URL concept for local disk, so access control there is
 * "must have a valid admin session", not "URL expires in N minutes". Swap to
 * the `s3` driver before any of this is reachable by students.
 */
export async function getObjectUrl(key: string): Promise<string> {
  if (DRIVER === "s3") {
    const cmd = new GetObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: key });
    return getSignedUrl(s3Client(), cmd, { expiresIn: 600 });
  }
  return `/api/storage/${key}`;
}

export function isLocalDriver(): boolean {
  return DRIVER === "local";
}
