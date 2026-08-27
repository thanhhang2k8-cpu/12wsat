import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @node-rs/argon2 ships a native (.node) addon — if Next tries to bundle
  // it like regular JS, password hashing breaks in the deployed Lambda even
  // though local `next dev` works fine (it doesn't go through the same
  // bundling path). @prisma/adapter-pg + pg are kept external for the same
  // "native/runtime-resolved dependency" reason.
  serverExternalPackages: ["@node-rs/argon2", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;
