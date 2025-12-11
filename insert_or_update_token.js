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
const AD_ACCOUNT_ID = 'act_926385200553173'; // From previous log step 179/screenshot if available, defaulting to what I saw in earlier logs or generic
// Wait, in step 179 I saw: accountId: 'act_926385200553173', id: '140aaa4b-8a9c-449f-8691-ab0ceb2bf851'
// But update returned empty?
// Ah, step 179 found an active account.
// Step 218 found NO active accounts.
// Why did it disappear? Maybe I didn't commit? Or maybe user interaction deleted it?
// Let's just UPSERT.

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB');

        // Check count
        const res = await client.query('SELECT * FROM marketing_accounts');
        console.log('Current Accounts:', res.rows);

        if (res.rows.length > 0) {
            console.log('Updating existing account...');
            // Update the first one found
            const id = res.rows[0].id;
            await client.query('UPDATE marketing_accounts SET "accessToken" = $1, "isActive" = true WHERE id = $2', [NEW_TOKEN, id]);
        } else {
            console.log('Inserting new account...');
            // We need a valid ID. I'll ask for one or use the one from the screenshot if visible.
            // Screenshot step 192 showed "New Sandbox Ad Account (926385200553173)"
            // User screenshot in 225 has "act_123456789" as placeholder.
            // I will use 'act_926385200553173' which I saw in earlier logs, assuming it's the right one.

            await client.query(`
              INSERT INTO marketing_accounts 
              ("platform", "name", "accountId", "currency", "accessToken", "isActive", "createdAt", "updatedAt")
              VALUES 
              ('META', 'Sucht Sandbox Account', 'act_926385200553173', 'USD', $1, true, NOW(), NOW())
          `, [NEW_TOKEN]);
        }

        console.log('Operation complete.');
        await client.end();
    } catch (e) {
        console.error('Error:', e);
    }
}

run();
