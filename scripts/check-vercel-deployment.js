#!/usr/bin/env node

const https = require('https');
require('dotenv').config();

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

function getLatestDeployment() {
    return new Promise((resolve, reject) => {
        // First get the project to find its ID
        const projectOptions = {
            hostname: 'api.vercel.com',
            port: 443,
            path: '/v9/projects',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${VERCEL_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        https.request(projectOptions, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(new Error(`Failed to get projects: ${res.statusCode}`));
                    return;
                }
                
                const data = JSON.parse(body);
                const tincProject = data.projects.find(p => 
                    p.name === 'tinc-burn-tracker' || 
                    p.name === 'TINC' ||
                    p.name.toLowerCase().includes('tinc')
                );
                
                if (!tincProject) {
                    console.log('Available projects:', data.projects.map(p => p.name));
                    reject(new Error('TINC project not found'));
                    return;
                }

                console.log(`Found project: ${tincProject.name}`);
                
                // Now get deployments for this project
                const deployOptions = {
                    hostname: 'api.vercel.com',
                    port: 443,
                    path: `/v6/deployments?projectId=${tincProject.id}&limit=5`,
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${VERCEL_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                };

                https.request(deployOptions, (res2) => {
                    let deployBody = '';
                    res2.on('data', (chunk) => deployBody += chunk);
                    res2.on('end', () => {
                        if (res2.statusCode !== 200) {
                            reject(new Error(`Failed to get deployments: ${res2.statusCode}`));
                            return;
                        }
                        
                        const deployData = JSON.parse(deployBody);
                        if (deployData.deployments && deployData.deployments.length > 0) {
                            const latest = deployData.deployments[0];
                            console.log('\n=== Latest Deployment ===');
                            console.log(`URL: https://${latest.url}`);
                            console.log(`Status: ${latest.state}`);
                            console.log(`Created: ${new Date(latest.created).toLocaleString()}`);
                            console.log(`Git commit: ${latest.meta?.githubCommitSha?.substring(0, 7) || 'N/A'}`);
                            
                            // Check the deployed data
                            if (latest.state === 'READY') {
                                checkDeployedData(`https://${latest.url}`);
                            }
                            
                            resolve(latest);
                        } else {
                            reject(new Error('No deployments found'));
                        }
                    });
                }).on('error', reject).end();
            });
        }).on('error', reject).end();
    });
}

function checkDeployedData(url) {
    const dataUrl = new URL('/data/burn-data.json', url);
    
    https.get(dataUrl.href, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                const data = JSON.parse(body);
                console.log('\n=== Deployed Data ===');
                console.log(`Last update: ${data.fetchedAt}`);
                console.log(`Total burned: ${data.totalBurned.toFixed(2)} TINC`);
                console.log(`Burn percentage: ${data.burnPercentage.toFixed(2)}%`);
                console.log(`Latest burn date: ${data.dailyBurns[data.dailyBurns.length - 1]?.date}`);
                console.log(`Today's burns: ${data.dailyBurns[data.dailyBurns.length - 1]?.transactionCount || 0} transactions`);
            } else {
                console.error('Failed to fetch burn data:', res.statusCode);
            }
        });
    }).on('error', (err) => {
        console.error('Error fetching burn data:', err);
    });
}

getLatestDeployment()
    .then(() => setTimeout(() => process.exit(0), 2000)) // Wait for data check
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });