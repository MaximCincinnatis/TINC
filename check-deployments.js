#!/usr/bin/env node

const https = require('https');

const VERCEL_TOKEN = 'LtOG0Iq5saMLlDJQWhrw1eHH';
const PROJECT_NAME = 'tinc-burn-tracker';

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function checkDeployments() {
  console.log('Checking recent deployments...');
  
  try {
    // Get project deployments
    const deployOptions = {
      hostname: 'api.vercel.com',
      path: `/v6/deployments?projectId=${PROJECT_NAME}&limit=5`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    
    const deployResponse = await makeRequest(deployOptions);
    console.log('Deployments response:', deployResponse.status);
    
    if (deployResponse.status === 200) {
      const deployments = deployResponse.data.deployments || [];
      console.log(`Found ${deployments.length} recent deployments:\n`);
      
      deployments.forEach((deployment, index) => {
        const date = new Date(deployment.createdAt).toLocaleString();
        console.log(`${index + 1}. ${deployment.readyState} - ${date}`);
        console.log(`   URL: https://${deployment.url}`);
        console.log(`   Source: ${deployment.source || 'Unknown'}`);
        console.log(`   Target: ${deployment.target || 'Unknown'}`);
        if (deployment.gitSource) {
          console.log(`   Git: ${deployment.gitSource.repo}@${deployment.gitSource.ref}`);
        }
        console.log('');
      });
      
      // Check if the production deployment is recent
      const productionDeployment = deployments.find(d => d.target === 'production');
      if (productionDeployment) {
        console.log('🎯 Production deployment status:', productionDeployment.readyState);
        console.log('📅 Last production deploy:', new Date(productionDeployment.createdAt).toLocaleString());
        
        if (productionDeployment.readyState === 'READY') {
          console.log('✅ Production deployment is ready!');
          console.log('🔗 Live URL: https://tinc-burn-tracker.vercel.app/');
        } else {
          console.log('⏳ Production deployment is still processing...');
        }
      }
    }
    
    // Also check if auto-deployment is working by looking at the latest commit
    console.log('\n--- Git Status Check ---');
    const { execSync } = require('child_process');
    
    try {
      const latestCommit = execSync('git log -1 --format="%H %s %ai"', { encoding: 'utf8' }).trim();
      console.log('Latest commit:', latestCommit);
      
      const commitDate = new Date(latestCommit.split(' ').slice(2).join(' '));
      const timeSinceCommit = (new Date() - commitDate) / (1000 * 60); // minutes
      
      console.log(`Time since last commit: ${Math.round(timeSinceCommit)} minutes ago`);
      
      if (timeSinceCommit < 30) {
        console.log('⚡ Recent commit detected - auto-deployment should trigger soon');
      }
    } catch (error) {
      console.log('Could not check git status:', error.message);
    }
    
  } catch (error) {
    console.error('Error checking deployments:', error);
  }
}

checkDeployments();