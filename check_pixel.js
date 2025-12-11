
const { FacebookAdsApi, AdAccount } = require('facebook-nodejs-business-sdk');
require('dotenv').config();
const { Client } = require('pg');

async function checkPixel() {
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
        const account = res.rows[0];
        const accessToken = account.accessToken;
        const api = FacebookAdsApi.init(accessToken);

        // Ad Account ID (hardcoded or from DB, using the one we know works)
        const adAccountId = 'act_1617179298980450';
        console.log(`Checking Pixels for Ad Account: ${adAccountId}`);

        // const pixels = await accountObj.getAdAccountPixels(['name', 'id', 'last_fired_time'], { limit: 5 });
        const pixelsResponse = await api.call('GET', [adAccountId, 'adspixels'], {
            fields: ['name', 'id', 'last_fired_time']
        });
        const pixels = pixelsResponse.data || [];

        console.log('--- Account Pixels ---');
        pixels.forEach(p => {
            console.log(`Name: ${p.name}, ID: ${p.id}, Last Fired: ${p.last_fired_time}`);
        });

    } catch (error) {
        console.error('Error checking Pixels:', error.response ? error.response.data : error);
    } finally {
        await client.end();
    }
}

checkPixel();
