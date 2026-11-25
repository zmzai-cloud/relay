import { hash, verify } from "@node-rs/argon2";

/** argon2id（OWASP 推荐参数：m=19MiB t=2 p=1）。 */
const ARGON2_OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTS);
}

export function verifyPassword(hashValue: string, password: string): Promise<boolean> {
  return verify(hashValue, password);
}
