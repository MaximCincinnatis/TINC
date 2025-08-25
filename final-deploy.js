const https = require('https');

const VERCEL_TOKEN = 'ALRc2T7tvlvNzOPCyxJNIIhd';
const PROJECT_ID = 'prj_qajgf3itc7GoISB5YFHlkYbsxziN';

async function deployNow() {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            name: 'tinc-burn-tracker',
            target: 'production',
            gitSource: {
                type: 'github',
                ref: 'master',
                repo: 'MaximCincinnatis/TINC',
                repoId: 1019788414
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

        console.log('🚀 Deploying to Vercel...');
        
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    const deployment = JSON.parse(body);
                    console.log('✅ DEPLOYMENT SUCCESSFUL!');
                    console.log(`\nDeployment URL: https://${deployment.url}`);
                    console.log(`Production URL: https://tincburn.fyi`);
                    console.log('\nThe maintenance page will be gone in 1-2 minutes!');
                    resolve(deployment);
                } else {
                    console.log(`Error: ${res.statusCode}`);
                    console.log(`Response: ${body}`);
                    reject(new Error(body));
                }
            });
        });

        req.on('error', (error) => {
            console.error('Request failed:', error);
            reject(error);
        });
        
        req.write(data);
        req.end();
    });
}

deployNow().catch(console.error);