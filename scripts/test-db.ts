
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('--- Database Connection Test ---');
console.log('Attempting to connect with the following configuration:');
console.log(`Host (PG_HOST): ${process.env.PG_HOST}`);
console.log(`Port (PG_PORT): ${process.env.PG_PORT}`);
console.log(`User (PG_USER): ${process.env.PG_USER}`);
console.log(`Database (PG_DATABASE): ${process.env.PG_DATABASE}`);
console.log('Password (PG_PASSWORD): [HIDDEN]');
console.log('---------------------------------');

const pgHost = process.env.PG_HOST || '';
const isCloudSql = pgHost.includes(':');
console.log(`Detected Cloud SQL instance: ${isCloudSql}`);

const pool = new Pool({
    host: isCloudSql ? path.join('/cloudsql', pgHost) : pgHost,
    port: isCloudSql ? undefined : (process.env.PG_PORT ? parseInt(process.env.PG_PORT, 10) : 5432),
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    connectionTimeoutMillis: 10000, // Increase timeout to 10s for testing
    ssl: false, // SSL is handled by the Cloud SQL Proxy, so it should be false here
});

async function testConnection() {
    let client;
    try {
        console.log('\nConnecting to the database...');
        client = await pool.connect();
        console.log('✅ SUCCESS! Connection to the database was established.');
        
        console.log('\nChecking query execution...');
        const timeResult = await client.query('SELECT NOW()');
        console.log('Current time on the database server:', timeResult.rows[0].now);
        console.log('✅ SUCCESS! Query executed.');

    } catch (error) {
        console.error('\n❌ ERROR! Failed to connect to the database.');
        if (error instanceof Error) {
            console.error('Error details:', error.message);
            console.error('Error code:', (error as any).code);
        } else {
            console.error('An unknown error occurred:', error);
        }
        console.log('\n--- Troubleshooting ---');
        console.log('1. Check if the .env file has the correct credentials.');
        console.log('2. If running locally and connecting to Cloud SQL, ensure the Cloud SQL Auth Proxy is running.');
        console.log('3. If running in App Hosting, check that the service account has the "Cloud SQL Client" role.');
        console.log('4. Verify that the instance connection name in PG_HOST is correct.');

    } finally {
        if (client) {
            client.release();
            console.log('\nClient connection released.');
        }
        await pool.end();
        console.log('Connection pool closed.');
    }
}

testConnection();
