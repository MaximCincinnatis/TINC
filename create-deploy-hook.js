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

async function createDeployHook() {
  console.log('🔗 Creating Vercel deployment hook...');
  
  try {
    // Get project ID first
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
      console.log('Project ID:', projectResponse.data.id);
      
      // Create a deploy hook
      const hookOptions = {
        hostname: 'api.vercel.com',
        path: `/v1/projects/${projectResponse.data.id}/deploy-hooks`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        }
      };
      
      const hookData = {
        name: 'GitHub Push Hook',
        ref: 'master'
      };
      
      const hookResponse = await makeRequest(hookOptions, hookData);
      console.log('Hook creation response:', hookResponse.status);
      
      if (hookResponse.status === 200 || hookResponse.status === 201) {
        console.log('✅ Deploy hook created successfully!');
        console.log('Hook URL:', hookResponse.data.url);
        
        // Now trigger the hook to deploy the latest code
        console.log('\n🚀 Triggering deployment...');
        
        const url = new URL(hookResponse.data.url);
        const triggerOptions = {
          hostname: url.hostname,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        };
        
        const triggerResponse = await makeRequest(triggerOptions, {});
        console.log('Trigger response:', triggerResponse.status);
        
        if (triggerResponse.status === 200 || triggerResponse.status === 201) {
          console.log('✅ Deployment triggered successfully!');
          console.log('🌐 Check https://tinc-burn-tracker.vercel.app/ in 2-3 minutes');
          console.log('📱 The realistic sea creature silhouettes should now be deployed!');
        } else {
          console.log('❌ Failed to trigger deployment');
          console.log('Response:', triggerResponse.data);
        }
      } else {
        console.log('❌ Failed to create deploy hook');
        console.log('Error:', hookResponse.data);
      }
    } else {
      console.log('❌ Could not get project info');
      console.log('Error:', projectResponse.data);
    }
    
  } catch (error) {
    console.error('Error creating deploy hook:', error);
  }
}

createDeployHook();