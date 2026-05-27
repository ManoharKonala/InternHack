import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateOrReject } from "./file-validation.utils.js";
import * as fs from "fs/promises";

// Mock dependencies
vi.mock("fs/promises", () => ({
  readFile: vi.fn().mockResolvedValue(Buffer.from("")),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("file-type", () => ({
  fromBuffer: vi.fn(),
  default: {
    fromBuffer: vi.fn(),
  },
}));

describe("file-validation.utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateOrReject", () => {
    it("should resolve when the file mime type is allowed", async () => {
      const mockBuffer = Buffer.from("mock data");
      vi.mocked(fs.readFile).mockResolvedValueOnce(mockBuffer);
      
      const fileType = await import("file-type");
      vi.mocked(fileType.default.fromBuffer).mockResolvedValueOnce({ ext: "pdf", mime: "application/pdf" } as any);

      await expect(
        validateOrReject("test.pdf", ["application/pdf"], "Invalid file")
      ).resolves.toBeUndefined();

      expect(fs.readFile).toHaveBeenCalledWith("test.pdf");
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it("should resolve when the file is text/plain and allowedMimes includes text/plain", async () => {
      const mockBuffer = Buffer.from("mock text");
      vi.mocked(fs.readFile).mockResolvedValueOnce(mockBuffer);
      
      const fileType = await import("file-type");
      vi.mocked(fileType.default.fromBuffer).mockResolvedValueOnce(undefined as any);

      await expect(
        validateOrReject("test.txt", ["text/plain"], "Invalid file")
      ).resolves.toBeUndefined();

      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it("should throw error and unlink file when mime type is not allowed", async () => {
      const mockBuffer = Buffer.from("mock data");
      vi.mocked(fs.readFile).mockResolvedValueOnce(mockBuffer);
      vi.mocked(fs.unlink).mockResolvedValueOnce(undefined);
      
      const fileType = await import("file-type");
      vi.mocked(fileType.default.fromBuffer).mockResolvedValueOnce({ ext: "exe", mime: "application/x-msdownload" } as any);

      await expect(
        validateOrReject("test.exe", ["application/pdf"], "Invalid file type")
      ).rejects.toThrow("Invalid file type");

      expect(fs.unlink).toHaveBeenCalledWith("test.exe");
    });

    it("should resolve for docx when application/zip is detected and docx is allowed", async () => {
      const mockBuffer = Buffer.from("mock docx");
      vi.mocked(fs.readFile).mockResolvedValueOnce(mockBuffer);
      
      const fileType = await import("file-type");
      vi.mocked(fileType.default.fromBuffer).mockResolvedValueOnce({ ext: "zip", mime: "application/zip" } as any);

      await expect(
        validateOrReject(
          "test.docx", 
          ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"], 
          "Invalid file"
        )
      ).resolves.toBeUndefined();
    });

    it("should ignore unlink error if unlink fails during rejection", async () => {
      const mockBuffer = Buffer.from("mock data");
      vi.mocked(fs.readFile).mockResolvedValueOnce(mockBuffer);
      vi.mocked(fs.unlink).mockRejectedValueOnce(new Error("Unlink failed"));
      
      const fileType = await import("file-type");
      vi.mocked(fileType.fromBuffer).mockResolvedValueOnce({ ext: "exe", mime: "application/x-msdownload" });

      await expect(
        validateOrReject("test.exe", ["application/pdf"], "Invalid file type")
      ).rejects.toThrow("Invalid file type");

      expect(fs.unlink).toHaveBeenCalledWith("test.exe");
    });
  });
});
