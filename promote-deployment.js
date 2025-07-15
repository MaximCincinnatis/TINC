#!/usr/bin/env node

const https = require('https');

const VERCEL_TOKEN = 'LtOG0Iq5saMLlDJQWhrw1eHH';
const PROJECT_NAME = 'tinc-burn-tracker';
const LATEST_DEPLOYMENT_ID = 'dpl_F9YqmXoKSFqNHJJkHkMTzqBEEfgR'; // From the latest deployment

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

async function promoteDeployment() {
  console.log('🚀 Promoting latest deployment to production...');
  
  try {
    // Get the latest deployment ID
    const deployOptions = {
      hostname: 'api.vercel.com',
      path: `/v6/deployments?projectId=${PROJECT_NAME}&limit=1`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    
    const deployResponse = await makeRequest(deployOptions);
    
    if (deployResponse.status === 200) {
      const latestDeployment = deployResponse.data.deployments[0];
      console.log('📋 Latest deployment:');
      console.log('- ID:', latestDeployment.id);
      console.log('- URL:', latestDeployment.url);
      console.log('- Status:', latestDeployment.readyState);
      console.log('- Target:', latestDeployment.target);
      
      if (latestDeployment.readyState === 'READY') {
        // Try to create an alias for the main domain
        const aliasOptions = {
          hostname: 'api.vercel.com',
          path: `/v2/domains/tinc-burn-tracker.vercel.app/records`,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json'
          }
        };
        
        const aliasData = {
          name: '',
          type: 'ALIAS',
          value: latestDeployment.url
        };
        
        const aliasResponse = await makeRequest(aliasOptions, aliasData);
        console.log('\n🔗 Alias creation response:', aliasResponse.status);
        
        if (aliasResponse.status === 200 || aliasResponse.status === 201) {
          console.log('✅ Successfully created alias');
        } else {
          console.log('❌ Failed to create alias');
          console.log('Response:', aliasResponse.data);
          
          // Try a different approach - set the deployment as the default
          console.log('\n🔄 Trying to set as default deployment...');
          
          const setDefaultOptions = {
            hostname: 'api.vercel.com',
            path: `/v9/projects/${PROJECT_NAME}`,
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${VERCEL_TOKEN}`,
              'Content-Type': 'application/json'
            }
          };
          
          const setDefaultData = {
            alias: [`tinc-burn-tracker.vercel.app`]
          };
          
          const setDefaultResponse = await makeRequest(setDefaultOptions, setDefaultData);
          console.log('Set default response:', setDefaultResponse.status);
        }
      }
      
      // Check current status
      console.log('\n📊 Checking current live site...');
      const testOptions = {
        hostname: 'tinc-burn-tracker.vercel.app',
        path: '/',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      };
      
      const testResponse = await makeRequest(testOptions);
      console.log('Live site response:', testResponse.status);
      
      if (testResponse.status === 200) {
        const htmlContent = testResponse.data;
        if (typeof htmlContent === 'string') {
          const jsMatch = htmlContent.match(/main\.([a-f0-9]+)\.js/);
          if (jsMatch) {
            console.log('✅ Live site JS file:', jsMatch[0]);
            
            if (jsMatch[1] === 'f06e69d5') {
              console.log('🎉 Latest deployment is live!');
            } else {
              console.log('❌ Old deployment still live');
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error promoting deployment:', error);
  }
}

promoteDeployment();