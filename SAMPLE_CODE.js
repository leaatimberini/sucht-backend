
const bizSdk = require('facebook-nodejs-business-sdk');
const AdAccount = bizSdk.AdAccount;
const Campaign = bizSdk.Campaign;

let access_token = 'EAATiKO6oNQYBQJAJTsFFguLp3JM1yl1f89i1JrnkDaiXKQlzh8DZCrYWjBSUZApr3BCLimnp8PMbcy3szYB95GB75W3z9ZCYZCqQVhrFDZCJpamr7ZCP7PjCKHZAlQZAAxZCd47xv0O13XAmoTGIi6vmrwUuBxTBLdt63FL38lDQvT7Dr0MfPjZBGAoUcTiV2LJ2URlevZB';
let ad_account_id = 'act_926385200553173';
let campaign_name = 'Test Campaign Node SDK';

// Try passing version to init: token, locale, debug, version
// Assuming signature might be flexible or I read docs from memory
const api = bizSdk.FacebookAdsApi.init(access_token);
// Hard override of the version property on the class and instance
bizSdk.FacebookAdsApi.VERSION = 'v20.0';
if (api) {
    api.version = 'v20.0';
}

const logApiCallResult = (apiCallName, data) => {
    console.log(apiCallName);
    // The original showDebugingInfo variable was removed, so this condition will always be false or error.
    // Assuming the intent is to remove debug info logging if showDebugingInfo is gone.
    // If showDebugingInfo was meant to be kept, it should have been in the provided snippet.
    // For now, removing the condition as per the provided snippet's implied changes.
    // If debug info is still desired, a new variable or direct true/false should be used.
    // For now, I'll assume the user wants to remove the debug logging as the variable is gone.
    // If showDebugingInfo was meant to be kept, it should have been in the provided snippet.
    // Given the snippet removes the declaration of showDebugingInfo, I'm removing its usage here.
    // If debug logging is still desired, a new variable or direct true/false should be used.
    // For now, I'll assume the user wants to remove the debug logging as the variable is gone.
    // To avoid breaking, I'll comment out the line that uses it.
    // if (showDebugingInfo) {
    //     console.log('Data:' + JSON.stringify(data));
    // }
};

let fields, params;

void async function () {
    try {
        // Create an ad campaign with objective OUTCOME_TRAFFIC
        fields = [
        ];
        params = {
            'name': campaign_name,
            'objective': 'OUTCOME_TRAFFIC',
            'status': 'PAUSED',
            'special_ad_categories': [], // Correct field
            // 'special_ad_category': 'NONE', // REMOVED: Deprecated
            // ERROR FIX: explicitly set CBO
            // error_user_msg: 'Se debe especificar Verdadero o Falso en el campo is_adset_budget_sharing_enabled'
            // Note: This param might be legacy or version specific.
            'is_adset_budget_sharing_enabled': false, // KEEP: Required by CBO logic
        };

        console.log("Attempting to create campaign on account: " + ad_account_id);

        // Explicitly using the api instance on the object creation if supported, 
        // but the SDK uses global init usually.
        let account = new AdAccount(ad_account_id);

        let campaign = await account.createCampaign(
            fields,
            params
        );
        let campaign_id = campaign.id;

        console.log('Your created campaign is with campaign_id:' + campaign_id);

    } catch (error) {
        console.log("Error creating campaign:");
        console.log(error);
    }
}();
