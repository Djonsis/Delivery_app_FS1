
import { S3Client } from "@aws-sdk/client-s3";
import { serverConfig } from "./config";

// S3 Client Singleton
// This prevents creating a new client for every request and ensures it uses
// the centralized configuration.
export const s3Client = new S3Client({
    endpoint: serverConfig.s3.endpoint,
    region: serverConfig.s3.region,
    credentials: {
        accessKeyId: serverConfig.s3.accessKeyId,
        secretAccessKey: serverConfig.s3.secretAccessKey,
    },
    forcePathStyle: true, // Important for GCS compatibility
});
