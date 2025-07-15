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

async function fixVercelGitIntegration() {
  console.log('🔍 Checking Vercel Git integration...');
  
  try {
    // First, get the current project info
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
      console.log('📊 Current project status:');
      console.log('- Repository:', projectResponse.data.link?.repo || 'Not connected');
      console.log('- Production branch:', projectResponse.data.link?.productionBranch || 'Not set');
      console.log('- Auto-assign custom domains:', projectResponse.data.autoAssignCustomDomains);
      console.log('- Source files outside root:', projectResponse.data.sourceFilesOutsideRootDirectory);
      
      if (projectResponse.data.link?.repo) {
        console.log('✅ Git repository is connected');
        
        // Try to trigger a manual deployment from the latest Git commit
        console.log('\n🚀 Triggering manual deployment from Git...');
        
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
        console.log('Deploy response status:', deployResponse.status);
        
        if (deployResponse.status === 200 || deployResponse.status === 201) {
          console.log('✅ Manual deployment triggered successfully!');
          console.log('- Deployment URL:', `https://${deployResponse.data.url}`);
          console.log('- Status:', deployResponse.data.readyState);
          console.log('- Deployment ID:', deployResponse.data.id);
          
          // Wait and check deployment status
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
              console.log('\n📈 Deployment status update:');
              console.log('- Status:', statusResponse.data.readyState);
              console.log('- URL:', statusResponse.data.url);
              
              if (statusResponse.data.readyState === 'READY') {
                console.log('🎉 Deployment is ready!');
                console.log('🌐 Check https://tinc-burn-tracker.vercel.app/ now');
              }
            }
          }, 10000);
          
        } else {
          console.log('❌ Manual deployment failed');
          console.log('Error:', deployResponse.data);
          
          // Try alternative approach - create deployment hook
          console.log('\n🔄 Trying alternative approach...');
          
          const hookOptions = {
            hostname: 'api.vercel.com',
            path: `/v1/projects/${PROJECT_NAME}/deploy-hooks`,
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${VERCEL_TOKEN}`,
              'Content-Type': 'application/json'
            }
          };
          
          const hookData = {
            name: 'Manual Deploy Hook',
            ref: 'master'
          };
          
          const hookResponse = await makeRequest(hookOptions, hookData);
          if (hookResponse.status === 200 || hookResponse.status === 201) {
            console.log('✅ Deploy hook created');
            console.log('Hook URL:', hookResponse.data.url);
            
            // Trigger the hook
            const triggerOptions = {
              hostname: hookResponse.data.url.replace('https://', '').split('/')[0],
              path: '/' + hookResponse.data.url.split('/').slice(3).join('/'),
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              }
            };
            
            const triggerResponse = await makeRequest(triggerOptions);
            console.log('Hook trigger response:', triggerResponse.status);
          }
        }
      } else {
        console.log('❌ Git repository not connected');
        console.log('Please connect your GitHub repository manually in Vercel dashboard');
      }
    } else {
      console.log('❌ Could not get project info');
      console.log('Error:', projectResponse.data);
    }
    
  } catch (error) {
    console.error('Error fixing Vercel Git integration:', error);
  }
}

fixVercelGitIntegration();