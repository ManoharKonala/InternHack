import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn();

vi.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: class {
      send = mockSend;
    },
    PutObjectCommand: class { constructor(args: any) { Object.assign(this, args); } },
    DeleteObjectCommand: class { constructor(args: any) { Object.assign(this, args); } },
    GetObjectCommand: class { constructor(args: any) { Object.assign(this, args); } },
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://presigned.url/test"),
}));

vi.mock("@aws-sdk/s3-presigned-post", () => ({
  createPresignedPost: vi.fn().mockResolvedValue({ url: "https://post.url", fields: { key: "val" } }),
}));

describe("s3.utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createUniqueS3Key", () => {
    it("should generate a valid key", async () => {
      const { createUniqueS3Key } = await import("./s3.utils.js");
      const key = createUniqueS3Key("resumes", "user123", "my resume!.pdf");
      expect(key).toMatch(/^resumes\/user123\/[0-9a-fA-F-]{36}-my_resume_.pdf$/);
    });
  });

  describe("uploadToS3", () => {
    it("should upload and return url", async () => {
      const { uploadToS3 } = await import("./s3.utils.js");
      mockSend.mockResolvedValueOnce({});
      
      const url = await uploadToS3(Buffer.from("test"), "test-key.txt", "text/plain");
      expect(url).toMatch(/^https:\/\/.*\.amazonaws\.com\/test-key\.txt$/);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteFromS3", () => {
    it("should call send with DeleteObjectCommand", async () => {
      const { deleteFromS3 } = await import("./s3.utils.js");
      mockSend.mockResolvedValueOnce({});
      
      await deleteFromS3("test-key.txt");
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe("getBufferFromS3", () => {
    it("should fetch object and return buffer", async () => {
      const { getBufferFromS3 } = await import("./s3.utils.js");
      mockSend.mockResolvedValueOnce({
        Body: { transformToByteArray: async () => new Uint8Array([116, 101, 115, 116]) }
      });
      
      const buf = await getBufferFromS3("test-key.txt");
      expect(buf.toString()).toBe("test");
    });
  });

  describe("getS3KeyFromUrl", () => {
    it("should extract key if prefix matches", async () => {
      vi.stubEnv("AWS_S3_BUCKET", "test-bucket");
      vi.stubEnv("AWS_REGION", "ap-south-1");
      vi.resetModules();
      const { getS3KeyFromUrl } = await import("./s3.utils.js");
      const key = getS3KeyFromUrl("https://test-bucket.s3.ap-south-1.amazonaws.com/folder/file.txt");
      expect(key).toBe("folder/file.txt");
    });

    it("should return null if url is not from bucket", async () => {
      const { getS3KeyFromUrl } = await import("./s3.utils.js");
      const key = getS3KeyFromUrl("https://example.com/folder/file.txt");
      expect(key).toBeNull();
    });
  });

  describe("signUrl and signUrls", () => {
    it("should sign valid s3 url", async () => {
      vi.stubEnv("AWS_S3_BUCKET", "test-bucket");
      vi.stubEnv("AWS_REGION", "ap-south-1");
      vi.resetModules();
      const { signUrl } = await import("./s3.utils.js");
      const url = await signUrl("https://test-bucket.s3.ap-south-1.amazonaws.com/file.txt");
      expect(url).toBe("https://presigned.url/test");
    });

    it("should return non-s3 url as is", async () => {
      const { signUrl } = await import("./s3.utils.js");
      const url = await signUrl("https://example.com/file.txt");
      expect(url).toBe("https://example.com/file.txt");
    });
    
    it("should sign multiple urls", async () => {
      vi.stubEnv("AWS_S3_BUCKET", "test-bucket");
      vi.stubEnv("AWS_REGION", "ap-south-1");
      vi.resetModules();
      const { signUrls } = await import("./s3.utils.js");
      const urls = await signUrls([
        "https://test-bucket.s3.ap-south-1.amazonaws.com/file.txt",
        "https://example.com/file.txt"
      ]);
      expect(urls).toEqual(["https://presigned.url/test", "https://example.com/file.txt"]);
    });
  });

  describe("generatePresignedUploadUrl", () => {
    it("should generate pre-signed upload url", async () => {
      const { generatePresignedUploadUrl } = await import("./s3.utils.js");
      const result = await generatePresignedUploadUrl("resumes/test.pdf", "application/pdf", "resumes");
      expect(result.url).toBe("https://post.url");
      expect(result.fields.key).toBe("val");
    });

    it("should throw error if folder is invalid", async () => {
      const { generatePresignedUploadUrl } = await import("./s3.utils.js");
      await expect(generatePresignedUploadUrl("test.pdf", "application/pdf", "invalid-folder"))
        .rejects.toThrow("Invalid or unauthorized upload folder");
    });

    it("should throw error if mime type is invalid", async () => {
      const { generatePresignedUploadUrl } = await import("./s3.utils.js");
      await expect(generatePresignedUploadUrl("test.txt", "text/plain", "resumes"))
        .rejects.toThrow("Invalid file type");
    });
  });
});
