const { FacebookAdsApi } = require('facebook-nodejs-business-sdk');
const { Client } = require('pg');
require('dotenv').config();

async function searchTargeting() {
    const client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        user: process.env.DB_USERNAME || 'such_user',
        password: process.env.DB_PASSWORD || 'such_password',
        database: process.env.DB_NAME || 'sucht_db',
    });

    try {
        await client.connect();
        const res = await client.query('SELECT * FROM marketing_accounts LIMIT 1');
        const accessToken = res.rows[0].accessToken;

        const api = FacebookAdsApi.init(accessToken);
        const adAccountId = 'act_1617179298980450';
        // const adAccountId = res.rows[0].adAccountId; // Removed duplicate

        // Set the access token for the API wrapper
        // api.setAccessToken(accessToken);

        const searchTerms = ['Reggaeton', 'Cumbia', 'Latin pop', 'Daddy Yankee'];

        console.log('--- Searching Targeting IDs (Account Context) ---');

        for (const term of searchTerms) {
            try {
                // Using targetingsearch edge on the account
                const response = await api.call('GET', [adAccountId, 'targetingsearch'], {
                    q: term,
                    limit: 3
                });

                console.log(`\nResults for "${term}":`);
                const results = response.data || [];
                results.forEach(item => {
                    console.log(`  [${item.type || 'interest'}] ${item.name} (ID: ${item.id})`);
                });

            } catch (err) {
                console.error(`Error searching ${term}:`, err.response ? err.response.data : err.message);
            }
        }

    } catch (error) {
        console.error('Database/Script Error:', error);
    } finally {
        await client.end();
    }
}

searchTargeting();
