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

async function setupAutoDeployment() {
  console.log('Setting up auto-deployment from GitHub to Vercel...');
  
  try {
    // First, get the GitHub repository ID
    const repoOptions = {
      hostname: 'api.vercel.com',
      path: `/v6/integrations/github/repos/${GITHUB_REPO}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    
    const repoResponse = await makeRequest(repoOptions);
    console.log('Repo response:', repoResponse.status);
    
    if (repoResponse.status !== 200) {
      console.log('Could not get repo info. Trying alternative approach...');
      
      // Try to trigger deployment using the CLI token
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
          repo: GITHUB_REPO,
          ref: 'master'
        },
        target: 'production'
      };
      
      const deployResponse = await makeRequest(deployOptions, deployData);
      console.log('Deploy response:', deployResponse.status);
      console.log('Deploy response data:', deployResponse.data);
      
    } else {
      console.log('Repository ID:', repoResponse.data.id);
      
      // Now trigger deployment with proper repo ID
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
          repoId: repoResponse.data.id,
          ref: 'master'
        },
        target: 'production'
      };
      
      const deployResponse = await makeRequest(deployOptions, deployData);
      console.log('Deploy response:', deployResponse.status);
      
      if (deployResponse.status === 200 || deployResponse.status === 201) {
        console.log('✅ Successfully triggered new deployment');
        console.log('Deployment URL:', deployResponse.data.url);
      } else {
        console.log('Deploy response data:', deployResponse.data);
      }
    }
    
    // Let's also check project settings to see if Git integration is enabled
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
      console.log('\nProject Git Integration Status:');
      console.log('- Repository:', projectResponse.data.link?.repo || 'Not linked');
      console.log('- Production branch:', projectResponse.data.link?.productionBranch || 'Not set');
      console.log('- Auto-deploy enabled:', projectResponse.data.autoExposeSystemEnvs || 'Unknown');
    }
    
  } catch (error) {
    console.error('Error setting up auto-deployment:', error);
  }
}

setupAutoDeployment();