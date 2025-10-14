// src/lib/__tests__/config.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("config module", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, NODE_ENV: 'test' };
  });

  describe("isCloud()", () => {
    it("should return true when K_SERVICE is set", async () => {
      process.env.K_SERVICE = "my-service";
      const { isCloud } = await import("../config");
      expect(isCloud()).toBe(true);
    });

    it("should return false when K_SERVICE is not set", async () => {
      delete process.env.K_SERVICE;
      const { isCloud } = await import("../config");
      expect(isCloud()).toBe(false);
    });
  });

  describe("getProjectId()", () => {
    it("should return GCLOUD_PROJECT when set", async () => {
      process.env.GCLOUD_PROJECT = "my-prod-project";
      const { getProjectId } = await import("../config");
      expect(getProjectId()).toBe("my-prod-project");
    });

    it("should return 'local-project' fallback when not set", async () => {
      delete process.env.GCLOUD_PROJECT;
      const { getProjectId } = await import("../config");
      expect(getProjectId()).toBe("local-project");
    });
  });

  describe("getLogLevel()", () => {
    it("should return LOG_LEVEL when set", async () => {
      process.env.LOG_LEVEL = "debug";
      const { getLogLevel } = await import("../config");
      expect(getLogLevel()).toBe("debug");
    });

    it("should return 'info' fallback when not set", async () => {
      delete process.env.LOG_LEVEL;
      const { getLogLevel } = await import("../config");
      expect(getLogLevel()).toBe("info");
    });
  });

  describe("getNodeEnv()", () => {
    // FIXED: Added mocks for all required production variables
    it("should return current NODE_ENV", async () => {
      process.env.NODE_ENV = "production";
      // Add mocks for all other required env vars to prevent import from throwing
      process.env.PG_HOST = "prod_host";
      process.env.PG_USER = "prod_user";
      process.env.PG_PASSWORD = "prod_pass";
      process.env.PG_DATABASE = "prod_db";
      process.env.S3_BUCKET_NAME = "prod_bucket";
      process.env.S3_ENDPOINT_URL = "https://s3.amazonaws.com";
      process.env.S3_REGION = "us-east-1";
      process.env.S3_ACCESS_KEY_ID = "prod_key";
      process.env.S3_SECRET_ACCESS_KEY = "prod_secret";

      const { getNodeEnv } = await import("../config");
      expect(getNodeEnv()).toBe("production");
    });

    it("should return 'development' fallback when not set", async () => {
      delete process.env.NODE_ENV;
      const { getNodeEnv } = await import("../config");
      expect(getNodeEnv()).toBe("development");
    });
  });

  describe("dbConfig", () => {
    it("should correctly parse all DB config values", async () => {
      process.env.PG_HOST = "localhost";
      process.env.PG_PORT = "5433";
      process.env.PG_USER = "testuser";
      process.env.PG_PASSWORD = "testpass";
      process.env.PG_DATABASE = "testdb";

      const { dbConfig } = await import("../config");

      expect(dbConfig.host).toBe("localhost");
      expect(dbConfig.port).toBe(5433);
      expect(dbConfig.user).toBe("testuser");
      expect(dbConfig.password).toBe("testpass");
      expect(dbConfig.database).toBe("testdb");
    });

    it("should use default port 5432 when PG_PORT not set", async () => {
      process.env.PG_HOST = "localhost";
      process.env.PG_USER = "user";
      process.env.PG_PASSWORD = "pass";
      process.env.PG_DATABASE = "db";
      delete process.env.PG_PORT;

      const { dbConfig } = await import("../config");
      expect(dbConfig.port).toBe(5432);
    });

    it("should throw in production when required DB var missing", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.PG_HOST;

      await expect(import("../config")).rejects.toThrow(
        /Missing required environment variable: PG_HOST/
      );
    });
  });

  describe("s3Config", () => {
    it("should correctly parse all S3 config values", async () => {
      process.env.S3_BUCKET_NAME = "my-bucket";
      process.env.S3_ENDPOINT_URL = "https://s3.amazonaws.com";
      process.env.S3_REGION = "us-west-2";
      process.env.S3_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE";
      process.env.S3_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";

      const { s3Config } = await import("../config");

      expect(s3Config.bucketName).toBe("my-bucket");
      expect(s3Config.endpoint).toBe("https://s3.amazonaws.com");
      expect(s3Config.region).toBe("us-west-2");
      expect(s3Config.accessKeyId).toBe("AKIAIOSFODNN7EXAMPLE");
      expect(s3Config.secretAccessKey).toBe("wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY");
    });
  });

  describe("loggingConfig", () => {
    it("should export correct logging paths", async () => {
      const { loggingConfig } = await import("../config");
      expect(loggingConfig.logDir).toBe("logs");
      expect(loggingConfig.logFile).toBe("debug.log");
    });
  });
});