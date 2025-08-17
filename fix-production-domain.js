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

async function fixProductionDomain() {
  console.log('🔧 Fixing production domain auto-update...');
  
  try {
    // Get project details
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
      console.log('📊 Current project settings:');
      console.log('- Auto-assign custom domains:', projectResponse.data.autoAssignCustomDomains);
      console.log('- Production branch:', projectResponse.data.link?.productionBranch);
      console.log('- Git repo:', projectResponse.data.link?.repo);
      
      // Update project settings to ensure auto-deployment works
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
        autoAssignCustomDomains: true,
        gitForkProtection: false,
        autoExposeSystemEnvs: true,
        buildCommand: 'npm run build',
        devCommand: 'npm start',
        installCommand: 'npm install',
        outputDirectory: 'build',
        framework: 'create-react-app'
      };
      
      console.log('\n🔄 Updating project settings...');
      const updateResponse = await makeRequest(updateOptions, updateData);
      console.log('Update response:', updateResponse.status);
      
      if (updateResponse.status === 200) {
        console.log('✅ Project settings updated');
      } else {
        console.log('❌ Failed to update project settings');
        console.log('Error:', updateResponse.data);
      }
      
      // Now trigger a new deployment that should automatically update the main domain
      console.log('\n🚀 Triggering new deployment...');
      
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
          repo: projectResponse.data.link?.repo || 'TINC',
          ref: 'master'
        },
        target: 'production',
        projectSettings: {
          buildCommand: 'npm run build',
          outputDirectory: 'build',
          installCommand: 'npm install',
          framework: 'create-react-app'
        }
      };
      
      const deployResponse = await makeRequest(deployOptions, deployData);
      console.log('Deploy response:', deployResponse.status);
      
      if (deployResponse.status === 200 || deployResponse.status === 201) {
        console.log('✅ New deployment triggered');
        console.log('- Deployment URL:', `https://${deployResponse.data.url}`);
        console.log('- Status:', deployResponse.data.readyState);
        console.log('- This should auto-update the main domain');
        
        // Monitor the deployment
        console.log('\n⏳ Monitoring deployment...');
        let attempts = 0;
        
        const checkDeployment = async () => {
          const statusOptions = {
            hostname: 'api.vercel.com',
            path: `/v13/deployments/${deployResponse.data.id}`,
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${VERCEL_TOKEN}`,
              'Content-Type': 'application/json'
            }
          };
          
          const statusResponse = await makeRequest(statusOptions);
          if (statusResponse.status === 200) {
            console.log(`📊 Deployment status: ${statusResponse.data.readyState}`);
            
            if (statusResponse.data.readyState === 'READY') {
              console.log('🎉 Deployment is READY!');
              console.log('🌐 Check https://tinc-burn-tracker.vercel.app/ now');
              console.log('🦈 The realistic sea creatures should be live!');
              return;
            } else if (statusResponse.data.readyState === 'ERROR') {
              console.log('❌ Deployment failed');
              console.log('Error:', statusResponse.data.error);
              return;
            }
            
            attempts++;
            if (attempts < 20) {
              setTimeout(checkDeployment, 5000);
            } else {
              console.log('⏰ Timeout - check manually');
            }
          }
        };
        
        setTimeout(checkDeployment, 5000);
        
      } else {
        console.log('❌ Failed to trigger deployment');
        console.log('Error:', deployResponse.data);
      }
    }
    
  } catch (error) {
    console.error('Error fixing production domain:', error);
  }
}

fixProductionDomain();