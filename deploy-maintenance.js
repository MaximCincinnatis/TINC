const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || 'LtOG0Iq5saMLlDJQWhrw1eHH';
const PROJECT_ID = 'prj_qajgf3itc7GoISB5YFHlkYbsxziN';
const TEAM_ID = 'team_8s5uh0XU1acFCMqmtUsJipe3';

async function createDeployment() {
    console.log('Creating Vercel deployment for maintenance page...');
    
    const files = [
        {
            file: 'maintenance.html',
            sha: crypto.createHash('sha1').update(fs.readFileSync('maintenance.html')).digest('hex'),
            size: fs.statSync('maintenance.html').size
        },
        {
            file: 'vercel.json',
            sha: crypto.createHash('sha1').update(fs.readFileSync('vercel.json')).digest('hex'),
            size: fs.statSync('vercel.json').size
        }
    ];

    const deploymentData = {
        name: 'tinc-burn-tracker',
        files: files,
        target: 'production',
        source: 'cli',
        meta: {
            description: 'Maintenance page deployment'
        }
    };

    return new Promise((resolve, reject) => {
        const data = JSON.stringify(deploymentData);
        
        const options = {
            hostname: 'api.vercel.com',
            port: 443,
            path: `/v13/deployments?teamId=${TEAM_ID}`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${VERCEL_TOKEN}`,
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                const response = JSON.parse(responseData);
                if (res.statusCode === 200 || res.statusCode === 201) {
                    console.log('Deployment created successfully!');
                    resolve(response);
                } else {
                    console.error('Deployment failed:', response);
                    reject(response);
                }
            });
        });

        req.on('error', (error) => {
            console.error('Request error:', error);
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

async function uploadFiles(deploymentUrl, deploymentId) {
    console.log('Uploading files to deployment...');
    
    const filesToUpload = [
        { path: 'maintenance.html', name: 'maintenance.html' },
        { path: 'vercel.json', name: 'vercel.json' }
    ];

    for (const file of filesToUpload) {
        const content = fs.readFileSync(file.path);
        
        await new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.vercel.com',
                port: 443,
                path: `/v2/deployments/${deploymentId}/files`,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${VERCEL_TOKEN}`,
                    'Content-Type': 'application/octet-stream',
                    'Content-Length': content.length,
                    'x-vercel-digest': crypto.createHash('sha1').update(content).digest('hex'),
                    'x-vercel-file': file.name
                }
            };

            const req = https.request(options, (res) => {
                let responseData = '';
                
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode === 200 || res.statusCode === 201) {
                        console.log(`Uploaded ${file.name}`);
                        resolve();
                    } else {
                        console.error(`Failed to upload ${file.name}:`, responseData);
                        reject(responseData);
                    }
                });
            });

            req.on('error', (error) => {
                console.error('Upload error:', error);
                reject(error);
            });

            req.write(content);
            req.end();
        });
    }
}

async function main() {
    try {
        const deployment = await createDeployment();
        await uploadFiles(deployment.url, deployment.id);
        
        console.log('\n✅ Maintenance page deployed successfully!');
        console.log(`🌐 Deployment URL: https://${deployment.url}`);
        console.log(`📝 Deployment ID: ${deployment.id}`);
        
        if (deployment.alias && deployment.alias.length > 0) {
            console.log(`🔗 Production URL: https://${deployment.alias[0]}`);
        }
    } catch (error) {
        console.error('Deployment failed:', error);
        process.exit(1);
    }
}

main();