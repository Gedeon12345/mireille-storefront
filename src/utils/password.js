import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// scrypt (intégré à Node) : haché lent et gourmand en mémoire, résistant aux attaques par GPU.
// Les paramètres sont écrits dans le haché : on pourra les durcir plus tard sans casser les anciens comptes.
const scryptAsync = promisify(scrypt);

const COST_LOG2 = 15; // N = 2^15
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAX_MEMORY_BYTES = 64 * 1024 * 1024;

const derive = (password, salt, keyLength, { cost, blockSize, parallelism }) =>
  scryptAsync(password.normalize("NFKC"), salt, keyLength, {
    N: 2 ** cost,
    r: blockSize,
    p: parallelism,
    maxmem: MAX_MEMORY_BYTES,
  });

/** Format : scrypt$coût$blocs$parallélisme$sel$clé (base64url). */
export async function hashPassword(password) {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, KEY_LENGTH, {
    cost: COST_LOG2,
    blockSize: BLOCK_SIZE,
    parallelism: PARALLELISM,
  });

  return ["scrypt", COST_LOG2, BLOCK_SIZE, PARALLELISM, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password, storedHash) {
  const parts = storedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, cost, blockSize, parallelism, saltText, keyText] = parts;
  const expectedKey = Buffer.from(keyText, "base64url");
  const actualKey = await derive(password, Buffer.from(saltText, "base64url"), expectedKey.length, {
    cost: Number(cost),
    blockSize: Number(blockSize),
    parallelism: Number(parallelism),
  });

  return timingSafeEqual(actualKey, expectedKey);
}
