require('dotenv').config();
const https = require('https');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || require('dotenv').config().parsed?.VERCEL_TOKEN;
const PROJECT_ID = 'prj_qajgf3itc7GoISB5YFHlkYbsxziN';
const TEAM_ID = 'team_8s5uh0XU1acFCMqmtUsJipe3';

async function addEnvironmentVariable(key, value, target = ['production', 'preview', 'development']) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            key,
            value,
            target,
            type: 'encrypted'
        });

        const options = {
            hostname: 'api.vercel.com',
            port: 443,
            path: `/v10/projects/${PROJECT_ID}/env?teamId=${TEAM_ID}`,
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
                if (res.statusCode === 201 || res.statusCode === 200) {
                    console.log(`✓ Added ${key} to Vercel`);
                    resolve(JSON.parse(body));
                } else if (res.statusCode === 400 && body.includes('already exists')) {
                    console.log(`⚠ ${key} already exists in Vercel`);
                    resolve({ exists: true });
                } else {
                    console.error(`✗ Failed to add ${key}: ${res.statusCode} - ${body}`);
                    reject(new Error(body));
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function setupVercelEnvironment() {
    console.log('Setting up Vercel environment variables...\n');

    const envVars = {
        'MORALIS_API_KEY': process.env.MORALIS_API_KEY,
        'ETHERSCAN_API_KEY': process.env.ETHERSCAN_API_KEY,
        'GITHUB_TOKEN': process.env.GITHUB_TOKEN,
        'VERCEL_TOKEN': VERCEL_TOKEN,
        'PROJECT_ID': PROJECT_ID,
        'TEAM_ID': TEAM_ID
    };

    for (const [key, value] of Object.entries(envVars)) {
        if (value) {
            try {
                await addEnvironmentVariable(key, value);
            } catch (error) {
                console.error(`Error adding ${key}:`, error.message);
            }
        } else {
            console.log(`⚠ Skipping ${key} - not found in .env`);
        }
    }

    console.log('\n✓ Vercel environment setup complete!');
    console.log('Your deployment will now use these environment variables.');
    console.log('\nIMPORTANT: After cleaning the git history, Vercel will automatically redeploy with the new code.');
}

setupVercelEnvironment().catch(console.error);