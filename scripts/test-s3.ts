import 'dotenv/config'
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { serverConfig } from '../src/lib/config';

const { bucketName, endpoint, region, accessKeyId, secretAccessKey } = serverConfig.s3;

console.log('--- S3/GCS Connection Test ---');
console.log('Attempting to connect with the following configuration:');
console.log(`Bucket Name (S3_BUCKET_NAME): ${bucketName}`);
console.log(`Endpoint URL (S3_ENDPOINT_URL): ${endpoint}`);
console.log(`Region (S3_REGION): ${region}`);
console.log(`Access Key ID (S3_ACCESS_KEY_ID): ${accessKeyId ? `***${accessKeyId.slice(-4)}` : 'Not set'}`);
console.log('Secret Access Key (S3_SECRET_ACCESS_KEY): [HIDDEN]');
console.log('---------------------------------');

async function testS3Connection() {
    if (!bucketName || !endpoint || !region || !accessKeyId || !secretAccessKey) {
        console.error('\n❌ ERROR! One or more S3 environment variables are not set.');
        console.error('Please check S3_BUCKET_NAME, S3_ENDPOINT_URL, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY in your .env file.');
        return;
    }

    try {
        console.log('\nInitializing S3 client...');
        const s3Client = new S3Client({
            endpoint: endpoint,
            region: region,
            credentials: {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey,
            },
            forcePathStyle: true, // Important for GCS compatibility
        });

        console.log(`Checking access to bucket "${bucketName}"...`);
        const command = new HeadBucketCommand({ Bucket: bucketName });
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
