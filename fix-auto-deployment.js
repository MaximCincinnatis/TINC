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

async function fixAutoDeployment() {
  console.log('🔧 Fixing auto-deployment to main domain...');
  
  try {
    // Get current project settings
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
      console.log('📊 Current project settings:');
      console.log('- Git repo:', project.link?.repo);
      console.log('- Production branch:', project.link?.productionBranch);
      console.log('- Auto-assign domains:', project.autoAssignCustomDomains);
      console.log('- Build command:', project.buildCommand);
      console.log('- Framework:', project.framework);
      
      // Get the project ID
      const projectId = project.id;
      console.log('- Project ID:', projectId);
      
      // Update project settings to ensure proper auto-deployment
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
        installCommand: 'npm install',
        outputDirectory: 'build',
        autoAssignCustomDomains: true,
        productionBranch: 'master'
      };
      
      console.log('\n🔄 Updating project settings for proper auto-deployment...');
      const updateResponse = await makeRequest(updateOptions, updateData);
      
      if (updateResponse.status === 200) {
        console.log('✅ Project settings updated successfully');
        
        // Get latest deployment and check if it's properly set as production
        const deploymentsOptions = {
          hostname: 'api.vercel.com',
          path: `/v6/deployments?projectId=${projectId}&limit=1`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json'
          }
        };
        
        const deploymentsResponse = await makeRequest(deploymentsOptions);
        
        if (deploymentsResponse.status === 200) {
          const latestDeployment = deploymentsResponse.data.deployments[0];
          console.log('\n📋 Latest deployment:');
          console.log('- ID:', latestDeployment.id);
          console.log('- URL:', latestDeployment.url);
          console.log('- Status:', latestDeployment.readyState);
          console.log('- Target:', latestDeployment.target);
          console.log('- Source:', latestDeployment.source);
          
          // Check if this deployment is properly aliased
          if (latestDeployment.readyState === 'READY' && latestDeployment.target === 'production') {
            console.log('✅ Latest deployment is production-ready');
            
            // Force an alias update by creating a new deployment
            console.log('\n🚀 Creating fresh deployment to ensure main domain updates...');
            
            // We'll create a simple file-based deployment to force domain update
            const deployOptions = {
              hostname: 'api.vercel.com',
              path: '/v13/deployments',
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${VERCEL_TOKEN}`,
                'Content-Type': 'application/json'
              }
            };
            
            // Create a minimal deployment that should trigger domain update
            const deployData = {
              name: PROJECT_NAME,
              target: 'production',
              projectSettings: {
                buildCommand: 'npm run build',
                framework: 'create-react-app',
                installCommand: 'npm install',
                outputDirectory: 'build'
              },
              meta: {
                githubCommitSha: 'HEAD',
                githubCommitMessage: 'Auto-deployment fix'
              }
            };
            
            const deployResponse = await makeRequest(deployOptions, deployData);
            console.log('Fresh deployment response:', deployResponse.status);
            
            if (deployResponse.status === 200 || deployResponse.status === 201) {
              console.log('✅ Fresh deployment created');
              console.log('- Deployment URL:', deployResponse.data.url);
              console.log('- This should update the main domain');
              
              // Monitor the deployment
              console.log('\n⏳ Monitoring deployment...');
              setTimeout(async () => {
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
                  console.log('📊 Deployment status:', statusResponse.data.readyState);
                  
                  if (statusResponse.data.readyState === 'READY') {
                    console.log('🎉 Deployment is READY!');
                    console.log('🌐 Main domain should now auto-update: https://tinc-burn-tracker.vercel.app/');
                    console.log('🦈 Realistic sea creatures should now be live!');
                  }
                }
              }, 10000);
            }
          }
        }
      } else {
        console.log('❌ Failed to update project settings');
        console.log('Response:', updateResponse.data);
      }
    } else {
      console.log('❌ Failed to get project info');
      console.log('Response:', projectResponse.data);
    }
    
  } catch (error) {
    console.error('Error fixing auto-deployment:', error);
  }
}

fixAutoDeployment();