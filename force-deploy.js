const https = require('https');
require('dotenv').config();

const VERCEL_TOKEN = 'LtOG0Iq5saMLlDJQWhrw1eHH'; // Using working token
const PROJECT_ID = 'prj_qajgf3itc7GoISB5YFHlkYbsxziN';

async function triggerNewBuild() {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            name: 'tinc-burn-tracker',
            projectId: PROJECT_ID,
            target: 'production',
            gitSource: {
                type: 'github',
                ref: 'master',
                repo: 'MaximCincinnatis/TINC'
            }
        });

        const options = {
            hostname: 'api.vercel.com',
            port: 443,
            path: '/v13/deployments',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${VERCEL_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    const deployment = JSON.parse(body);
                    console.log('✅ New deployment triggered!');
                    console.log(`Deployment URL: https://${deployment.url}`);
                    console.log('\nBuilding... This will take 1-2 minutes.');
                    resolve(deployment);
                } else {
                    console.log(`Failed: ${res.statusCode} - ${body}`);
                    reject(new Error(body));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

triggerNewBuild().catch(console.error);
