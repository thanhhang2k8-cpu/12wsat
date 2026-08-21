import { hash, verify } from "@node-rs/argon2";

// argon2id, OWASP-recommended baseline parameters for a login-time hash.
const OPTS = {
  algorithm: 2, // argon2id
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTS);
}

export function verifyPassword(passwordHash: string, plain: string): Promise<boolean> {
  return verify(passwordHash, plain).catch(() => false);
}
