import 'dotenv/config'
import { Pool } from 'pg';
import { dbConfig } from '../src/lib/config';

console.log('--- Database Connection Test ---');
console.log('Attempting to connect with the following configuration:');
console.log(`Host (PG_HOST): ${dbConfig.host}`);
console.log(`Port (PG_PORT): ${dbConfig.port}`);
console.log(`User (PG_USER): ${dbConfig.user}`);
console.log(`Database (PG_DATABASE): ${dbConfig.database}`);
console.log('Password (PG_PASSWORD): [HIDDEN]');
console.log('---------------------------------');

const pool = new Pool({
    ...dbConfig,
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
            const errorCode = (error as any).code;
            console.error('Error code:', errorCode);
            
            console.log('\n--- Troubleshooting ---');
            if (errorCode === '28P01') {
                 console.log('This is an "invalid_password" error. Please double-check the PG_USER and PG_PASSWORD in your .env file.');
            } else if (errorCode === 'ECONNREFUSED') {
                 console.log('This is a "connection refused" error. Is the Cloud SQL Auth Proxy running locally on the correct port?');
            } else {
                 console.log('1. Check if the .env file has the correct credentials (PG_USER, PG_PASSWORD, PG_DATABASE).');
                 console.log('2. If running locally and connecting to Cloud SQL, ensure the Cloud SQL Auth Proxy is running.');
                 console.log('3. Verify that the user has permissions to connect to the specified database.');
            }
        } else {
            console.error('An unknown error occurred:', error);
        }

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
