
const { FacebookAdsApi } = require('facebook-nodejs-business-sdk');
require('dotenv').config();
const { Client } = require('pg');

async function checkInstagram() {
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

        const pageId = '136400443099389'; // SUCHT Page ID

        console.log(`Checking Instagram for Page ID: ${pageId}`);

        // Get Page details including connected instagram accounts
        const pageData = await api.call('GET', [pageId], {
            fields: ['name', 'instagram_business_account', 'connected_instagram_account', 'id']
        });

        console.log('--- Page Data ---');
        console.log(JSON.stringify(pageData, null, 2));

    } catch (error) {
        console.error('Error checking Instagram:', error.response ? error.response.data : error);
    } finally {
        await client.end();
    }
}

checkInstagram();
