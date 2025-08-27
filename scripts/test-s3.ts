
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('--- S3/GCS Connection Test ---');
console.log('Attempting to connect with the following configuration:');
console.log(`Bucket Name (S3_BUCKET_NAME): ${process.env.S3_BUCKET_NAME}`);
console.log(`Endpoint URL (S3_ENDPOINT_URL): ${process.env.S3_ENDPOINT_URL}`);
console.log(`Region (S3_REGION): ${process.env.S3_REGION}`);
console.log(`Access Key ID (S3_ACCESS_KEY_ID): ${process.env.S3_ACCESS_KEY_ID ? `***${process.env.S3_ACCESS_KEY_ID.slice(-4)}` : 'Not set'}`);
console.log('Secret Access Key (S3_SECRET_ACCESS_KEY): [HIDDEN]');
console.log('---------------------------------');

async function testS3Connection() {
    const { S3_BUCKET_NAME, S3_ENDPOINT_URL, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;

    if (!S3_BUCKET_NAME || !S3_ENDPOINT_URL || !S3_REGION || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
        console.error('\n❌ ERROR! One or more S3 environment variables are not set.');
        console.error('Please check S3_BUCKET_NAME, S3_ENDPOINT_URL, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY in your .env file.');
        return;
    }

    try {
        console.log('\nInitializing S3 client...');
        const s3Client = new S3Client({
            endpoint: S3_ENDPOINT_URL,
            region: S3_REGION,
            credentials: {
                accessKeyId: S3_ACCESS_KEY_ID,
                secretAccessKey: S3_SECRET_ACCESS_KEY,
            },
            forcePathStyle: true, // Important for GCS compatibility
        });

        console.log(`Checking access to bucket "${S3_BUCKET_NAME}"...`);
        const command = new HeadBucketCommand({ Bucket: S3_BUCKET_NAME });
        await s3Client.send(command);

        console.log('\n✅ SUCCESS! Connection to the storage was established and the bucket is accessible.');

    } catch (error) {
        console.error('\n❌ ERROR! Failed to connect to storage or access the bucket.');
        if (error instanceof Error) {
            console.error('Error details:', error.message);
            console.error('Error code:', (error as any).code || 'N/A');
            console.error('Error name:', error.name);
        } else {
            console.error('An unknown error occurred:', error);
        }
         console.log('\n--- Troubleshooting ---');
        console.log('1. Check if the .env file has the correct S3 credentials and bucket name.');
        console.log('2. Ensure the service account or user has "Storage Object Admin" or "Storage Object Viewer" permissions on the bucket.');
        console.log('3. Verify the S3_ENDPOINT_URL is correct (should be "https://storage.googleapis.com" for GCS).');
    }
}

testS3Connection();
