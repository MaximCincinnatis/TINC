#!/usr/bin/env node

const https = require('https');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || require('dotenv').config().parsed?.VERCEL_TOKEN;
const GITHUB_REPO = 'MaximCincinnatis/TINC';
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

async function connectGitToVercel() {
  console.log('Connecting GitHub repository to Vercel project...');
  
  try {
    // Step 1: Link the repository using the correct API endpoint
    const linkOptions = {
      hostname: 'api.vercel.com',
      path: `/v1/projects/${PROJECT_NAME}/link`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    
    const linkData = {
      type: 'github',
      repo: GITHUB_REPO,
      productionBranch: 'master'
    };
    
    console.log('Linking repository...');
    const linkResponse = await makeRequest(linkOptions, linkData);
    console.log('Link response:', linkResponse.status);
    
    if (linkResponse.status === 200 || linkResponse.status === 201) {
      console.log('✅ Successfully linked GitHub repository!');
      console.log('Response:', linkResponse.data);
      
      // Step 2: Update project settings
      const updateOptions = {
        hostname: 'api.vercel.com',
        path: `/v9/projects/${PROJECT_NAME}`,
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        }
      };
      
      const updateData = {
        buildCommand: 'npm run build',
        devCommand: 'npm start',
        framework: 'create-react-app',
        outputDirectory: 'build',
        installCommand: 'npm install'
      };
      
      const updateResponse = await makeRequest(updateOptions, updateData);
      console.log('Update settings response:', updateResponse.status);
      
      if (updateResponse.status === 200) {
        console.log('✅ Project settings updated');
      }
      
    } else {
      console.log('❌ Failed to link repository');
      console.log('Error:', linkResponse.data);
      
      // Try alternative approach - create a new deployment
      console.log('\nTrying alternative deployment approach...');
      
      const deployOptions = {
        hostname: 'api.vercel.com',
        path: `/v13/deployments`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        }
      };
      
      const deployData = {
        name: PROJECT_NAME,
        gitSource: {
          type: 'github',
          repo: GITHUB_REPO,
          ref: 'master'
        },
        target: 'production'
      };
      
      const deployResponse = await makeRequest(deployOptions, deployData);
      console.log('Deploy response:', deployResponse.status);
      console.log('Deploy data:', deployResponse.data);
    }
    
    // Step 3: Check final project state
    const projectOptions = {
      hostname: 'api.vercel.com',
      path: `/v9/projects/${PROJECT_NAME}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    
    const projectResponse = await makeRequest(projectOptions);
    if (projectResponse.status === 200) {
      console.log('\nFinal project state:');
      console.log('- Repository:', projectResponse.data.link?.repo || 'Not connected');
      console.log('- Production branch:', projectResponse.data.link?.productionBranch || 'Not set');
      console.log('- Framework:', projectResponse.data.framework || 'Not set');
      console.log('- Build command:', projectResponse.data.buildCommand || 'Not set');
    }
    
  } catch (error) {
    console.error('Error connecting Git to Vercel:', error);
  }
}

connectGitToVercel();