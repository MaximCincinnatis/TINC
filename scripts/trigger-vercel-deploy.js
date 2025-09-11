#!/usr/bin/env node
require('dotenv').config();

const https = require('https');

// Deploy hook URL from your Vercel project
const DEPLOY_HOOK_URL = 'https://api.vercel.com/v1/integrations/deploy/prj_qajgf3itc7GoISB5YFHlkYbsxziN/GmVhRw38sJ';

async function triggerDeploy() {
    return new Promise((resolve, reject) => {
        const url = new URL(DEPLOY_HOOK_URL);
        
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            
            res.on('data', (chunk) => {
                body += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log('✅ Deployment triggered successfully');
                    console.log('Response:', body);
                    resolve(body);
                } else {
                    console.error('❌ Deployment failed:', res.statusCode);
                    console.error('Response:', body);
                    reject(new Error(`Deployment failed with status: ${res.statusCode}`));
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Request error:', error);
            reject(error);
        });

        req.end();
    });
}

// Run if called directly
if (require.main === module) {
    triggerDeploy()
        .then(() => {
            console.log('🚀 Deployment request sent to Vercel');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Failed to trigger deployment:', error);
            process.exit(1);
        });
}

module.exports = { triggerDeploy };