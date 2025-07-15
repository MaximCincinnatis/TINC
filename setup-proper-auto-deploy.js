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

async function setupProperAutoDeploy() {
  console.log('🔧 Setting up proper auto-deployment...');
  
  try {
    // Get the latest deployment
    const deploymentsOptions = {
      hostname: 'api.vercel.com',
      path: `/v6/deployments?projectId=${PROJECT_NAME}&limit=1`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    
    const deploymentsResponse = await makeRequest(deploymentsOptions);
    
    if (deploymentsResponse.status === 200) {
      const latestDeployment = deploymentsResponse.data.deployments[0];
      console.log('📋 Latest deployment:');
      console.log('- ID:', latestDeployment.id);
      console.log('- URL:', latestDeployment.url);
      console.log('- Status:', latestDeployment.readyState);
      console.log('- Created:', new Date(latestDeployment.createdAt).toLocaleString());
      
      if (latestDeployment.readyState === 'READY') {
        console.log('✅ Latest deployment is ready');
        
        // Try to create an alias to force the main domain to update
        const aliasOptions = {
          hostname: 'api.vercel.com',
          path: `/v2/deployments/${latestDeployment.id}/aliases`,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json'
          }
        };
        
        const aliasData = {
          alias: 'tinc-burn-tracker.vercel.app'
        };
        
        console.log('\n🔗 Creating alias for main domain...');
        const aliasResponse = await makeRequest(aliasOptions, aliasData);
        console.log('Alias response:', aliasResponse.status);
        
        if (aliasResponse.status === 200 || aliasResponse.status === 201) {
          console.log('✅ Alias created successfully!');
          console.log('🌐 Main domain should now point to latest deployment');
          console.log('🦈 Check https://tinc-burn-tracker.vercel.app/ for realistic sea creatures');
        } else {
          console.log('❌ Failed to create alias');
          console.log('Response:', aliasResponse.data);
          
          // Alternative: Try to promote this deployment
          console.log('\n🚀 Trying to promote deployment...');
          
          const promoteOptions = {
            hostname: 'api.vercel.com',
            path: `/v13/deployments/${latestDeployment.id}/promote`,
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${VERCEL_TOKEN}`,
              'Content-Type': 'application/json'
            }
          };
          
          const promoteResponse = await makeRequest(promoteOptions);
          console.log('Promote response:', promoteResponse.status);
          
          if (promoteResponse.status === 200) {
            console.log('✅ Deployment promoted successfully!');
          } else {
            console.log('❌ Failed to promote deployment');
            console.log('Response:', promoteResponse.data);
          }
        }
      }
    }
    
    // As a final step, let's make sure the GitHub integration is working correctly
    console.log('\n🔍 Checking GitHub integration...');
    
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
      const project = projectResponse.data;
      console.log('📊 GitHub integration status:');
      console.log('- Connected repo:', project.link?.repo);
      console.log('- Production branch:', project.link?.productionBranch);
      console.log('- Auto-assign domains:', project.autoAssignCustomDomains);
      
      if (project.link?.repo && project.autoAssignCustomDomains) {
        console.log('✅ GitHub integration is properly configured');
        console.log('🔄 Future Git pushes should automatically update the main domain');
      } else {
        console.log('❌ GitHub integration needs configuration');
      }
    }
    
  } catch (error) {
    console.error('Error setting up auto-deployment:', error);
  }
}

setupProperAutoDeploy();