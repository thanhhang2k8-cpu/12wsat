import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @node-rs/argon2 ships a native (.node) addon — if Next tries to bundle
  // it like regular JS, password hashing breaks in the deployed Lambda even
  // though local `next dev` works fine (it doesn't go through the same
  // bundling path). @prisma/adapter-pg + pg are kept external for the same
  // "native/runtime-resolved dependency" reason.
  serverExternalPackages: ["@node-rs/argon2", "@prisma/adapter-pg", "pg"],
  // Default Server Action body limit is 1MB — a scanned SAT test PDF blows
  // past that easily, so the admin upload form's request just dies with no
  // useful error on the client. Raised to cover realistic multi-page scans.
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
