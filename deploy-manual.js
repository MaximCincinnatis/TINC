#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

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

async function deployToVercel() {
  console.log('Deploying to Vercel...');
  
  try {
    // Check if build directory exists
    if (!fs.existsSync('./build')) {
      console.log('Build directory not found. Running build...');
      const { execSync } = require('child_process');
      execSync('npm run build', { stdio: 'inherit' });
    }
    
    // Create deployment using files
    const deployOptions = {
      hostname: 'api.vercel.com',
      path: '/v13/deployments',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    
    const deployData = {
      name: PROJECT_NAME,
      files: [
        {
          file: 'build/index.html',
          data: fs.readFileSync('./build/index.html', 'utf8')
        }
      ],
      target: 'production'
    };
    
    const deployResponse = await makeRequest(deployOptions, deployData);
    console.log('Deploy response:', deployResponse.status);
    
    if (deployResponse.status === 200 || deployResponse.status === 201) {
      console.log('✅ Successfully deployed to Vercel');
      console.log('Deployment URL:', `https://${deployResponse.data.url}`);
    } else {
      console.log('Deploy response data:', deployResponse.data);
    }
    
  } catch (error) {
    console.error('Error deploying to Vercel:', error);
  }
}

deployToVercel();