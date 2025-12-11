
const bizSdk = require('facebook-nodejs-business-sdk');

console.log('Original Version:', bizSdk.FacebookAdsApi.VERSION);

try {
    Object.defineProperty(bizSdk.FacebookAdsApi, 'VERSION', {
        value: 'v20.0',
        writable: true,
    });
    console.log('Patched Version:', bizSdk.FacebookAdsApi.VERSION);
} catch (error) {
    console.error('Patch Failed:', error);
}
