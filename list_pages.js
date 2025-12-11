
const { FacebookAdsApi, AdAccount } = require('facebook-nodejs-business-sdk');
require('dotenv').config();
const { Client } = require('pg');

async function listPages() {
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

        if (!account) {
            console.error('No marketing account found in DB');
            return;
        }

        const accessToken = account.accessToken;
        const api = FacebookAdsApi.init(accessToken);

        console.log('Access Token (first 20 chars):', accessToken.substring(0, 20) + '...');

        // Query /me/accounts to get Pages
        // Note: In Graph API, /me/accounts returns the pages the user has access to.
        const response = await api.call('GET', ['me', 'accounts'], {
            fields: ['name', 'access_token', 'category', 'id', 'tasks']
        });

        console.log('--- User Pages ---');
        response.data.forEach(page => {
            console.log(`Name: ${page.name}, ID: ${page.id}, Tasks: ${JSON.stringify(page.tasks)}`);
        });

    } catch (error) {
        console.error('Error listing pages:', error.response ? error.response.data : error);
    } finally {
        await client.end();
    }
}

listPages();
