
import { S3Client } from "@aws-sdk/client-s3";
import { s3Config } from "./config";

// S3 Client Singleton
// This prevents creating a new client for every request and ensures it uses
// the centralized configuration.
export const s3Client = new S3Client({
    endpoint: s3Config.endpoint,
    region: s3Config.region,
    credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
    },
    forcePathStyle: true, // Important for GCS compatibility
});
