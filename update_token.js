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

const NEW_TOKEN = 'EAATiKO6oNQYBQBDU25pCrHK0WJ09JPjD0zwhZAso9u4ks6G6ZAY4DbG3aoj7UG7SXMnveLdmobxw4EHZAgP6xtymiOGSn7kvm1ampfYVyguVlUdcboKZCuszZCjxK2ZA7gEVk1fqQrOq01qqBieX4MMuVw5d0PtVktSvYHviMS5tZBiE2izXQmWpRVw8ZBrHwmm66ZBpUUyQWdmlSWvqiJT80';

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        // Update the active account with the new token
        // Assuming there is one active account we want to update.
        const res = await client.query('UPDATE marketing_accounts SET "accessToken" = $1 WHERE "isActive" = true RETURNING id, "accountId"', [NEW_TOKEN]);

        console.log('Updated Accounts:', res.rows);
        await client.end();
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
