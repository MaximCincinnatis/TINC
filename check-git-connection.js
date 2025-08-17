#!/usr/bin/env node

const https = require('https');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || require('dotenv').config().parsed?.VERCEL_TOKEN;
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

async function checkGitConnection() {
  console.log('Checking Git connection status...');
  
  try {
    // Get project info
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
    console.log('Project status:', projectResponse.status);
    
    if (projectResponse.status === 200) {
      console.log('✅ Project found!');
      console.log('- Name:', projectResponse.data.name);
      console.log('- Repository:', projectResponse.data.link?.repo || 'Not connected');
      console.log('- Production branch:', projectResponse.data.link?.productionBranch || 'Not set');
      console.log('- Framework:', projectResponse.data.framework || 'Not set');
      console.log('- Build command:', projectResponse.data.buildCommand || 'Not set');
      console.log('- Output directory:', projectResponse.data.outputDirectory || 'Not set');
      
      if (projectResponse.data.link?.repo) {
        console.log('\n🎉 Git connection is active!');
        
        // Now trigger a deployment from the latest commit
        console.log('\nTriggering deployment from latest commit...');
        
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
          gitSource: {
            type: 'github',
            repo: projectResponse.data.link.repo,
            ref: projectResponse.data.link.productionBranch || 'master'
          },
          target: 'production'
        };
        
        const deployResponse = await makeRequest(deployOptions, deployData);
        console.log('Deploy response:', deployResponse.status);
        
        if (deployResponse.status === 200 || deployResponse.status === 201) {
          console.log('✅ Successfully triggered deployment!');
          console.log('- Deployment URL:', `https://${deployResponse.data.url}`);
          console.log('- Status:', deployResponse.data.readyState);
          console.log('- Deployment ID:', deployResponse.data.id);
          
          console.log('\n🚀 Your realistic sea creature silhouettes should be deploying now!');
          console.log('Check https://tinc-burn-tracker.vercel.app/ in a few minutes.');
          
        } else {
          console.log('❌ Deploy failed');
          console.log('Error:', deployResponse.data);
        }
      } else {
        console.log('\n❌ Git connection not found. Please connect your GitHub repo in Vercel dashboard.');
      }
    }
    
  } catch (error) {
    console.error('Error checking Git connection:', error);
  }
}

checkGitConnection();