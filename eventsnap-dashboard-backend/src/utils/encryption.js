import crypto from "node:crypto";

// Encrypts sensitive profile fields (currently just User.accountNumber) at
// rest, so a database dump/leak doesn't expose a photographer's raw bank
// account number. Values round-trip transparently: encrypted on write,
// decrypted on read, everywhere else in the app keeps seeing plain text.
const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:";

// Falls back to JWT_SECRET only so an existing deployment that hasn't set
// ACCOUNT_ENCRYPTION_KEY yet doesn't break — set a dedicated key in .env for
// real key separation.
const getKey = () => {
  const secret = process.env.ACCOUNT_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "Missing ACCOUNT_ENCRYPTION_KEY (or JWT_SECRET) to encrypt sensitive profile fields"
    );
  }
  return crypto.createHash("sha256").update(secret).digest();
};

// Returns "" for empty input, and "enc:v1:<iv>:<tag>:<ciphertext>" (all hex)
// otherwise. Never throws on a normal string input.
export const encryptSecret = (plainText) => {
  const value = String(plainText ?? "");
  if (!value) return "";

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("hex")}:${authTag.toString(
    "hex"
  )}:${ciphertext.toString("hex")}`;
};

// Decrypts a value produced by encryptSecret. A value that doesn't carry the
// "enc:v1:" prefix is treated as legacy plaintext (data saved before this
// field was encrypted) and returned unchanged, so old accounts keep working.
export const decryptSecret = (storedValue) => {
  const value = String(storedValue ?? "");
  if (!value.startsWith(PREFIX)) return value;

  try {
    const [ivHex, tagHex, dataHex] = value.slice(PREFIX.length).split(":");
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getKey(),
      Buffer.from(ivHex, "hex")
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch {
    // Corrupted ciphertext or wrong key — never leak raw ciphertext to a client.
    return "";
  }
};
