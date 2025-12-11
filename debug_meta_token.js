const https = require('https');

const TOKEN = 'EAATiKO6oNQYBQBDU25pCrHK0WJ09JPjD0zwhZAso9u4ks6G6ZAY4DbG3aoj7UG7SXMnveLdmobxw4EHZAgP6xtymiOGSn7kvm1ampfYVyguVlUdcboKZCuszZCjxK2ZA7gEVk1fqQrOq01qqBieX4MMuVw5d0PtVktSvYHviMS5tZBiE2izXQmWpRVw8ZBrHwmm66ZBpUUyQWdmlSWvqiJT80';

function makeRequest(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'graph.facebook.com',
            path: `/v20.0${path}&access_token=${TOKEN}`,
            method: 'GET',
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve(data);
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });
        req.end();
    });
}

async function run() {
    console.log('--- Checking Me ---');
    const me = await makeRequest('/me?fields=id,name');
    console.log('Me:', me);

    console.log('\n--- Checking Ad Accounts ---');
    // Get ad accounts connected to this user
    const accounts = await makeRequest('/me/adaccounts?fields=id,name,account_id,account_status,currency');
    console.log('Ad Accounts:', JSON.stringify(accounts, null, 2));

    if (accounts.data) {
        accounts.data.forEach(acc => {
            console.log(`Found Account: ${acc.name} (ID: ${acc.id}) - Status: ${acc.account_status}`);
        });
    }
}

run();
