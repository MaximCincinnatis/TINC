#!/usr/bin/env node

const https = require('https');

const VERCEL_TOKEN = 'LtOG0Iq5saMLlDJQWhrw1eHH';

function getProjectInfo() {
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
            
            res.on('data', (chunk) => {
                body += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    const data = JSON.parse(body);
                    const tincProject = data.projects.find(p => 
                        p.name === 'tinc-burn-tracker' || 
                        p.name === 'TINC'
                    );
                    
                    if (tincProject) {
                        console.log('Project found:', JSON.stringify(tincProject, null, 2));
                        resolve(tincProject);
                    } else {
                        console.log('All projects:', JSON.stringify(data.projects.map(p => p.name), null, 2));
                        reject(new Error('TINC project not found'));
                    }
                } else {
                    console.error('Failed to get projects:', res.statusCode);
                    console.error('Response:', body);
                    reject(new Error(`Failed with status: ${res.statusCode}`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

getProjectInfo()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });