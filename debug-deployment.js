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

async function debugDeployment() {
  console.log('🔍 Debugging deployment issue...');
  
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
    
    if (projectResponse.status === 200) {
      console.log('📊 Project Status:');
      console.log('- Name:', projectResponse.data.name);
      console.log('- Production domain:', projectResponse.data.alias?.[0] || 'tinc-burn-tracker.vercel.app');
      console.log('- Git repo:', projectResponse.data.link?.repo);
      console.log('- Production branch:', projectResponse.data.link?.productionBranch);
      
      // Get latest deployments
      const deployOptions = {
        hostname: 'api.vercel.com',
        path: `/v6/deployments?projectId=${PROJECT_NAME}&limit=3`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        }
      };
      
      const deployResponse = await makeRequest(deployOptions);
      
      if (deployResponse.status === 200) {
        console.log('\n📋 Latest Deployments:');
        deployResponse.data.deployments.forEach((deploy, i) => {
          console.log(`${i + 1}. ${deploy.readyState} - ${new Date(deploy.createdAt).toLocaleString()}`);
          console.log(`   URL: https://${deploy.url}`);
          console.log(`   Source: ${deploy.source || 'Unknown'}`);
          console.log(`   Target: ${deploy.target}`);
          if (deploy.alias) {
            console.log(`   Aliases: ${deploy.alias.join(', ')}`);
          }
          console.log('');
        });
        
        // Check if the production domain is pointing to the latest deployment
        const latestDeploy = deployResponse.data.deployments[0];
        console.log('🎯 Latest deployment details:');
        console.log('- Status:', latestDeploy.readyState);
        console.log('- URL:', latestDeploy.url);
        console.log('- Created:', new Date(latestDeploy.createdAt).toLocaleString());
        console.log('- Is Production:', latestDeploy.target === 'production');
        
        // Check if this deployment is aliased to the main domain
        const aliasOptions = {
          hostname: 'api.vercel.com',
          path: `/v4/domains/tinc-burn-tracker.vercel.app`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json'
          }
        };
        
        const aliasResponse = await makeRequest(aliasOptions);
        console.log('\n🔗 Domain alias status:', aliasResponse.status);
        if (aliasResponse.status === 200) {
          console.log('Domain info:', aliasResponse.data);
        }
      }
    }
    
  } catch (error) {
    console.error('Error debugging deployment:', error);
  }
}

debugDeployment();