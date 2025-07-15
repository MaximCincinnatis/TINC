#!/usr/bin/env node

const https = require('https');

const VERCEL_TOKEN = 'LtOG0Iq5saMLlDJQWhrw1eHH';
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
    // Step 1: Get project info to see current state
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
      console.log('Current project state:');
      console.log('- Name:', projectResponse.data.name);
      console.log('- Current repo:', projectResponse.data.link?.repo || 'Not connected');
      console.log('- Production branch:', projectResponse.data.link?.productionBranch || 'Not set');
      
      // Step 2: Update project to connect to GitHub
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
        gitRepository: {
          type: 'github',
          repo: GITHUB_REPO
        },
        productionBranch: 'master',
        buildCommand: 'npm run build',
        devCommand: 'npm start',
        framework: 'create-react-app',
        outputDirectory: 'build'
      };
      
      console.log('\nUpdating project with GitHub connection...');
      const updateResponse = await makeRequest(updateOptions, updateData);
      console.log('Update response:', updateResponse.status);
      
      if (updateResponse.status === 200) {
        console.log('✅ Successfully connected GitHub repository!');
        console.log('- Repository:', updateResponse.data.link?.repo || updateResponse.data.gitRepository?.repo);
        console.log('- Production branch:', updateResponse.data.link?.productionBranch || 'master');
        console.log('- Auto-deployment is now enabled');
        
        // Step 3: Trigger a deployment from the latest commit
        console.log('\nTriggering deployment from latest commit...');
        
        const deployOptions = {
          hostname: 'api.vercel.com',
          path: `/v6/deployments`,
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
        
        if (deployResponse.status === 200 || deployResponse.status === 201) {
          console.log('✅ Successfully triggered deployment!');
          console.log('- Deployment URL:', `https://${deployResponse.data.url}`);
          console.log('- Status:', deployResponse.data.readyState);
        } else {
          console.log('Deploy error:', deployResponse.data);
        }
        
      } else {
        console.log('❌ Failed to update project');
        console.log('Error:', updateResponse.data);
      }
    } else {
      console.log('❌ Project not found or access denied');
      console.log('Error:', projectResponse.data);
    }
    
  } catch (error) {
    console.error('Error connecting Git to Vercel:', error);
  }
}

connectGitToVercel();