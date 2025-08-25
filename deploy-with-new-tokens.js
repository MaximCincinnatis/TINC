require('dotenv').config();
const https = require('https');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || 'YOUR_VERCEL_TOKEN_HERE'; // Your new Vercel token
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'YOUR_GITHUB_TOKEN_HERE'; // Your new GitHub token

async function findProject() {
    console.log('Finding TINC project with new token...');
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.vercel.com',
            port: 443,
            path: '/v9/projects',
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
                    const data = JSON.parse(body);
                    const project = data.projects?.find(p => 
                        p.name?.toLowerCase().includes('tinc') || 
                        p.name === 'tinc-burn-tracker'
                    );
                    if (project) {
                        console.log(`✓ Found project: ${project.name} (ID: ${project.id})`);
                        resolve(project);
                    } else {
                        console.log('Available projects:', data.projects?.map(p => p.name).join(', '));
                        reject(new Error('TINC project not found'));
                    }
                } else {
                    console.log(`Error: ${res.statusCode} - ${body}`);
                    reject(new Error(body));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function triggerDeployment(projectId) {
    console.log(`\nTriggering deployment for project ${projectId}...`);
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            name: 'tinc-burn-tracker',
            projectId: projectId,
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
                    console.log('✅ Deployment triggered successfully!');
                    console.log(`Deployment URL: https://${deployment.url}`);
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

async function main() {
    console.log('=== Deploying with new tokens ===\n');
    
    try {
        const project = await findProject();
        await triggerDeployment(project.id);
        console.log('\n✅ Success! The maintenance page will be removed in 1-2 minutes.');
        console.log('Check: https://tincburn.fyi');
    } catch (error) {
        console.error('\nError:', error.message);
        
        // Try with GitHub API
        console.log('\nTrying GitHub API to trigger deployment...');
        const { exec } = require('child_process');
        exec(`curl -X POST -H "Authorization: token ${GITHUB_TOKEN}" -H "Accept: application/vnd.github.v3+json" https://api.github.com/repos/MaximCincinnatis/TINC/pages/builds`, (error, stdout, stderr) => {
            if (error) {
                console.error('GitHub API also failed:', error);
            } else {
                console.log('GitHub API response:', stdout);
            }
        });
    }
}

main().catch(console.error);