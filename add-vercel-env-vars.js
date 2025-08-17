require('dotenv').config();
const https = require('https');

// Use the working Vercel token
const VERCEL_TOKEN = process.env.VERCEL_TOKEN || require('dotenv').config().parsed?.VERCEL_TOKEN;
const PROJECT_NAME = 'tinc-burn-tracker';

async function getProjectId() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.vercel.com',
            port: 443,
            path: `/v9/projects/${PROJECT_NAME}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${VERCEL_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const project = JSON.parse(body);
                    console.log(`✓ Found project: ${project.name} (${project.id})`);
                    resolve(project.id);
                } else {
                    console.error(`Failed to get project: ${res.statusCode} - ${body}`);
                    reject(new Error(body));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function addEnvironmentVariable(projectId, key, value, target = ['production', 'preview', 'development']) {
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
            path: `/v10/projects/${projectId}/env`,
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
                    console.log(`✓ Added ${key} to Vercel (all environments)`);
                    resolve(JSON.parse(body));
                } else if (res.statusCode === 400 && body.includes('already exists')) {
                    console.log(`⚠ ${key} already exists in Vercel - updating...`);
                    updateEnvironmentVariable(projectId, key, value, target).then(resolve).catch(reject);
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

async function updateEnvironmentVariable(projectId, key, value, target) {
    // First, get existing env var ID
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.vercel.com',
            port: 443,
            path: `/v9/projects/${projectId}/env`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${VERCEL_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const envVars = JSON.parse(body);
                    const existing = envVars.envs?.find(e => e.key === key);
                    if (existing) {
                        // Update the existing variable
                        const updateData = JSON.stringify({ value, target });
                        const updateOptions = {
                            hostname: 'api.vercel.com',
                            port: 443,
                            path: `/v9/projects/${projectId}/env/${existing.id}`,
                            method: 'PATCH',
                            headers: {
                                'Authorization': `Bearer ${VERCEL_TOKEN}`,
                                'Content-Type': 'application/json',
                                'Content-Length': updateData.length
                            }
                        };

                        const updateReq = https.request(updateOptions, (updateRes) => {
                            let updateBody = '';
                            updateRes.on('data', (chunk) => updateBody += chunk);
                            updateRes.on('end', () => {
                                if (updateRes.statusCode === 200) {
                                    console.log(`✓ Updated ${key} in Vercel`);
                                    resolve(JSON.parse(updateBody));
                                } else {
                                    console.error(`✗ Failed to update ${key}: ${updateRes.statusCode} - ${updateBody}`);
                                    reject(new Error(updateBody));
                                }
                            });
                        });

                        updateReq.on('error', reject);
                        updateReq.write(updateData);
                        updateReq.end();
                    } else {
                        reject(new Error(`${key} not found`));
                    }
                } else {
                    reject(new Error(body));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function setupVercelEnvironment() {
    console.log('Setting up Vercel environment variables...\n');

    try {
        const projectId = await getProjectId();
        console.log(`\nAdding environment variables to project: ${projectId}\n`);

        const envVars = {
            'MORALIS_API_KEY': process.env.MORALIS_API_KEY,
            'ETHERSCAN_API_KEY': process.env.ETHERSCAN_API_KEY,
            'GITHUB_TOKEN': process.env.GITHUB_TOKEN,
            'VERCEL_TOKEN': process.env.VERCEL_TOKEN || VERCEL_TOKEN,
        };

        console.log('Environment variables to add:');
        for (const [key, value] of Object.entries(envVars)) {
            if (value) {
                console.log(`  - ${key}: ${value.substring(0, 10)}...`);
            }
        }
        console.log('');

        for (const [key, value] of Object.entries(envVars)) {
            if (value) {
                try {
                    await addEnvironmentVariable(projectId, key, value);
                } catch (error) {
                    console.error(`Error adding ${key}:`, error.message);
                }
            } else {
                console.log(`⚠ Skipping ${key} - not found in .env`);
            }
        }

        console.log('\n✅ Vercel environment setup complete!');
        console.log('\nYour deployment will now use these environment variables.');
        console.log('The site will continue working without any interruption.');
        console.log('\nNext steps:');
        console.log('1. Run the cleanup script to remove hardcoded values');
        console.log('2. Commit and push the changes');
        console.log('3. Vercel will auto-deploy with the new environment variables');
        
    } catch (error) {
        console.error('Failed to setup environment:', error);
    }
}

setupVercelEnvironment().catch(console.error);