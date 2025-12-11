const fs = require('fs');
const { Client } = require('pg');

const envConfig = {};
try {
    const envContent = fs.readFileSync('.env', 'utf8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            envConfig[key] = value;
        }
    });
} catch (e) {
    console.log("Could not read .env file");
}

const client = new Client({
    host: envConfig.DB_HOST || 'localhost',
    port: parseInt(envConfig.DB_PORT || '5432'),
    user: envConfig.DB_USERNAME || 'such_user',
    password: envConfig.DB_PASSWORD,
    database: envConfig.DB_NAME || 'sucht_db',
});

// The valid confirmed account
// Name: sucht
// ID: act_1617179298980450
// Status: 1 (Active)
const NEW_ACCOUNT_ID = 'act_1617179298980450';

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        const res = await client.query('UPDATE marketing_accounts SET "accountId" = $1, "name" = $2 WHERE "isActive" = true RETURNING id, "accountId", "name"', [NEW_ACCOUNT_ID, 'Sucht Production Account']);

        console.log('Updated to Valid Account:', res.rows);
        await client.end();
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
