import { S3Client } from "@aws-sdk/client-s3";
import { appConfig } from "./config";

// S3 Client Singleton
// This prevents creating a new client for every request and ensures it uses
// the centralized configuration.
export const s3Client = new S3Client({
    endpoint: appConfig.s3.endpoint,
    region: appConfig.s3.region,
    credentials: {
        accessKeyId: appConfig.s3.accessKeyId,
        secretAccessKey: appConfig.s3.secretAccessKey,
    },
    forcePathStyle: true, // Important for GCS compatibility
});
