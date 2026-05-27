import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encrypt, decrypt } from "./crypto.utils.js";

describe("crypto.utils", () => {
  const originalEnv = process.env;
  const validKey = "a".repeat(64);

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("encrypt & decrypt", () => {
    it("should correctly encrypt and decrypt a string", () => {
      process.env.APP_PASSWORD_ENCRYPTION_KEY = validKey;
      const plaintext = "my secret message";
      
      const encrypted = encrypt(plaintext);
      expect(encrypted).not.toBe(plaintext);
      expect(typeof encrypted).toBe("string");
      expect(encrypted.split(":")).toHaveLength(3); // iv:tag:data
      
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it("should throw an error if APP_PASSWORD_ENCRYPTION_KEY is missing", () => {
      delete process.env.APP_PASSWORD_ENCRYPTION_KEY;
      expect(() => encrypt("test")).toThrow("APP_PASSWORD_ENCRYPTION_KEY must be a 64-char hex string");
      expect(() => decrypt("test")).toThrow("APP_PASSWORD_ENCRYPTION_KEY must be a 64-char hex string");
    });

    it("should throw an error if APP_PASSWORD_ENCRYPTION_KEY is invalid length", () => {
      process.env.APP_PASSWORD_ENCRYPTION_KEY = "invalid";
      expect(() => encrypt("test")).toThrow("APP_PASSWORD_ENCRYPTION_KEY must be a 64-char hex string");
    });

    it("should throw an error if decrypting an invalid format string", () => {
      process.env.APP_PASSWORD_ENCRYPTION_KEY = validKey;
      expect(() => decrypt("invalid-format")).toThrow("Invalid encrypted value format");
    });

    it("should throw an error if decrypting tampered data", () => {
      process.env.APP_PASSWORD_ENCRYPTION_KEY = validKey;
      const encrypted = encrypt("test");
      const parts = encrypted.split(":");
      parts[2] = Buffer.from("tampered").toString("base64"); // tamper ciphertext
      
      expect(() => decrypt(parts.join(":"))).toThrow(); // Decipher throws
    });
  });
});
