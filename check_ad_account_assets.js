
const { FacebookAdsApi } = require('facebook-nodejs-business-sdk');
require('dotenv').config();
const { Client } = require('pg');

async function checkAdAccountAssets() {
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

        // We need to check if the AD ACCOUNT (act_1617179298980450) has permissions/assigned assets for this IG User
        // But usually, if the Page is assigned to the Ad Account, the IG account connected to the Page is usable.
        // Let's list the Ad Account's connected Pages and see.

        const adAccountId = 'act_1617179298980450';
        console.log(`Checking Assets for Ad Account: ${adAccountId}`);

        // Get connected pages/assets
        // 'promote_pages' shows pages the ad account can advertise on
        const accountData = await api.call('GET', [adAccountId], {
            fields: ['name', 'promote_pages']
        });

        console.log('--- Ad Account Promote Pages ---');
        if (accountData.promote_pages) {
            accountData.promote_pages.data.forEach(p => {
                console.log(`Page: ${p.name} (ID: ${p.id})`);
            });
        } else {
            console.log("No promote_pages found.");
        }

    } catch (error) {
        console.error('Error checking Ad Account assets:', error.response ? error.response.data : error);
    } finally {
        await client.end();
    }
}

checkAdAccountAssets();
