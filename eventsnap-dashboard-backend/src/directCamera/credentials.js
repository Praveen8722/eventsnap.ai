import crypto from "crypto";

// Event-scoped camera logins. Usernames are random (not the event id or the
// public share id); passwords are random, shown to the owner once, and only
// a salted scrypt hash is stored.

const ALPHANUM = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"; // no 0/O/1/l/I

const randomFrom = (alphabet, length) => {
  let out = "";
  while (out.length < length) {
    for (const byte of crypto.randomBytes(length * 2)) {
      // Rejection sampling keeps every character equally likely.
      if (byte < 256 - (256 % alphabet.length)) out += alphabet[byte % alphabet.length];
      if (out.length === length) break;
    }
  }
  return out;
};

// e.g. "es7k2m9p4q" — easy to type on a camera keyboard.
export const newUsername = () => `es${randomFrom("abcdefghijkmnpqrstuvwxyz23456789", 8)}`;

// 20 characters from 57 → about 117 bits; letters and digits only, so it
// can be typed on any camera's on-screen keyboard.
export const newPassword = () => randomFrom(ALPHANUM, 20);

const SCRYPT = { N: 16384, r: 8, p: 1 };

export const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32, SCRYPT).toString("hex");
  return { passwordHash: hash, passwordSalt: salt };
};

export const verifyPassword = (password, { passwordHash, passwordSalt }) => {
  if (typeof password !== "string" || !password || password.length > 128 || !passwordHash || !passwordSalt) return false;
  const actual = crypto.scryptSync(password, passwordSalt, 32, SCRYPT);
  const expected = Buffer.from(passwordHash, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
};
