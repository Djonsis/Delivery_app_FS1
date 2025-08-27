
import { Pool } from 'pg';
import { serverConfig } from '../src/lib/config';

console.log('--- Database Connection Test ---');
console.log('Attempting to connect with the following configuration:');
console.log(`Host (PG_HOST): ${serverConfig.db.host}`);
console.log(`Port (PG_PORT): ${serverConfig.db.port}`);
console.log(`User (PG_USER): ${serverConfig.db.user}`);
console.log(`Database (PG_DATABASE): ${serverConfig.db.database}`);
console.log('Password (PG_PASSWORD): [HIDDEN]');
console.log('---------------------------------');

const pool = new Pool({
    ...serverConfig.db,
    // When testing locally, we connect directly via TCP, so we use the standard host and port.
    // The db.ts file has special logic for Unix sockets in the App Hosting environment.
    host: serverConfig.db.host,
    port: serverConfig.db.port,
    connectionTimeoutMillis: 10000,
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
        console.log('2. If running locally and connecting to Cloud SQL, ensure the Cloud SQL Auth Proxy is running and pointing to the correct instance.');
        console.log('3. If running in App Hosting, check that the service account has the "Cloud SQL Client" role and apphosting.yaml is configured correctly.');
        console.log('4. Verify that the instance connection name in PG_HOST is correct for your environment.');

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
