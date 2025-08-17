#!/usr/bin/env node

const https = require('https');
require('dotenv').config();

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
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
    // First, check if project exists
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
      console.log('Project exists:', projectResponse.data.name);
      
      // Link the GitHub repository to the project
      const linkOptions = {
        hostname: 'api.vercel.com',
        path: `/v9/projects/${PROJECT_NAME}`,
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        }
      };
      
      const linkData = {
        link: {
          type: 'github',
          repo: GITHUB_REPO,
          productionBranch: 'master'
        }
      };
      
      const linkResponse = await makeRequest(linkOptions, linkData);
      console.log('Link response:', linkResponse.status);
      
      if (linkResponse.status === 200) {
        console.log('✅ Successfully linked GitHub repository to Vercel project');
        console.log('Auto-deployment is now enabled for pushes to master branch');
      } else {
        console.log('Link response data:', linkResponse.data);
      }
    } else {
      console.log('Project not found. Creating new project...');
      
      // Create new project with GitHub integration
      const createOptions = {
        hostname: 'api.vercel.com',
        path: '/v9/projects',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        }
      };
      
      const createData = {
        name: PROJECT_NAME,
        gitRepository: {
          type: 'github',
          repo: GITHUB_REPO,
          productionBranch: 'master'
        },
        buildCommand: 'npm run build',
        devCommand: 'npm start',
        framework: 'create-react-app',
        publicSource: false
      };
      
      const createResponse = await makeRequest(createOptions, createData);
      console.log('Create response:', createResponse.status);
      
      if (createResponse.status === 200 || createResponse.status === 201) {
        console.log('✅ Successfully created project with GitHub integration');
        console.log('Auto-deployment is now enabled');
      } else {
        console.log('Create response data:', createResponse.data);
      }
    }
    
    // Trigger a new deployment
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
      }
    };
    
    const deployResponse = await makeRequest(deployOptions, deployData);
    console.log('Deploy response:', deployResponse.status);
    
    if (deployResponse.status === 200 || deployResponse.status === 201) {
      console.log('✅ Successfully triggered new deployment');
      console.log('Deployment URL:', deployResponse.data.url);
    } else {
      console.log('Deploy response data:', deployResponse.data);
    }
    
  } catch (error) {
    console.error('Error setting up auto-deployment:', error);
  }
}

setupAutoDeployment();