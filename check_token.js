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

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');
        // Fix: Query column names exactly as they are in the entity (camelCase usually maps to quotes in Postgres if TypeORM didn't snake_case them)
        // Earlier log showed: "MarketingAccount"."accessToken"
        // So in DB it is likely "accessToken" (quoted) or accessToken (if lowercase).
        // TypeORM usually preserves camelCase as quoted identifiers if not using snake naming strategy.
        // Let's try quoted "accessToken".
        const res = await client.query('SELECT id, "accountId", left("accessToken", 15) as prefix, length("accessToken") as len FROM marketing_accounts WHERE "isActive" = true');
        console.log('Active Accounts:', res.rows);
        await client.end();
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
