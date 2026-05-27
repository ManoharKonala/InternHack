import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the resend module
const mockSend = vi.fn();
const mockBatchSend = vi.fn();

vi.mock("resend", () => {
  return {
    Resend: class {
      emails = { send: mockSend };
      batch = { send: mockBatchSend };
    },
  };
});

describe("email.utils", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, RESEND_API_KEY: "test-key", EMAIL_FROM: "test@example.com" };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  describe("sendEmail", () => {
    it("should send an email successfully", async () => {
      const { sendEmail } = await import("./email.utils.js");
      mockSend.mockResolvedValueOnce({ data: { id: "123" }, error: null });

      const result = await sendEmail({
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test HTML</p>",
        text: "Test Text",
        attachments: [{ filename: "test.txt", content: Buffer.from("test") }],
      });

      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith({
        from: process.env.EMAIL_FROM || "onboarding@resend.dev",
        to: "test@example.com",
        subject: "Test Subject",
        html: "<p>Test HTML</p>",
        text: "Test Text",
        attachments: [{ filename: "test.txt", content: Buffer.from("test") }],
      });
    });

    it("should throw an error if sending fails", async () => {
      const { sendEmail } = await import("./email.utils.js");
      mockSend.mockResolvedValueOnce({ data: null, error: { message: "Failed" } });

      await expect(
        sendEmail({ to: "test@example.com", subject: "Test", html: "html" })
      ).rejects.toThrow();
    });

    it("should handle missing RESEND_API_KEY gracefully", async () => {
      delete process.env.RESEND_API_KEY;
      const { sendEmail } = await import("./email.utils.js");

      const result = await sendEmail({ to: "test@example.com", subject: "Test", html: "html" });
      expect(result).toBe(false);
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe("sendEmailBatch", () => {
    it("should return early if emails array is empty", async () => {
      const { sendEmailBatch } = await import("./email.utils.js");
      const result = await sendEmailBatch([]);
      expect(result).toEqual({ sent: 0, failed: 0, errors: [] });
      expect(mockBatchSend).not.toHaveBeenCalled();
    });

    it("should send a batch successfully", async () => {
      const { sendEmailBatch } = await import("./email.utils.js");
      mockBatchSend.mockResolvedValueOnce({ data: { data: [{ id: "1" }, { id: "2" }] }, error: null });

      const emails = [
        { to: "1@example.com", subject: "S1", html: "H1" },
        { to: "2@example.com", subject: "S2", html: "H2" },
      ];
      
      const result = await sendEmailBatch(emails);
      expect(result).toEqual({ sent: 2, failed: 0, errors: [] });
      expect(mockBatchSend).toHaveBeenCalledTimes(1);
    });

    it("should throw if more than 100 emails are passed", async () => {
      const { sendEmailBatch } = await import("./email.utils.js");
      const emails = Array.from({ length: 101 }).map((_, i) => ({
        to: `${i}@example.com`, subject: "S", html: "H"
      }));

      await expect(sendEmailBatch(emails)).rejects.toThrow("Resend batch supports max 100 emails");
    });
    
    it("should fail gracefully if batch send returns error", async () => {
      const { sendEmailBatch } = await import("./email.utils.js");
      mockBatchSend.mockResolvedValueOnce({ data: null, error: { message: "Batch failed" } });

      const emails = [{ to: "1@example.com", subject: "S1", html: "H1" }];
      const result = await sendEmailBatch(emails);
      
      expect(result.failed).toBe(1);
      expect(result.sent).toBe(0);
      expect(result.errors.length).toBe(1);
    });
  });
});
