#!/usr/bin/env node

const https = require('https');

const VERCEL_TOKEN = 'LtOG0Iq5saMLlDJQWhrw1eHH';
const DEPLOYMENT_ID = 'dpl_Dk3Ejc8k7ww1hSKrmMnoowF2DTnr';

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

async function checkDeployment() {
  console.log('Checking deployment status...');
  
  try {
    // Get deployment details
    const deployOptions = {
      hostname: 'api.vercel.com',
      path: `/v13/deployments/${DEPLOYMENT_ID}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    
    const deployResponse = await makeRequest(deployOptions);
    console.log('Deployment status:', deployResponse.status);
    
    if (deployResponse.status === 200) {
      console.log('Status:', deployResponse.data.readyState);
      console.log('URL:', deployResponse.data.url);
      console.log('Error:', deployResponse.data.error || 'None');
      
      // Get build logs
      const logsOptions = {
        hostname: 'api.vercel.com',
        path: `/v2/deployments/${DEPLOYMENT_ID}/events`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        }
      };
      
      const logsResponse = await makeRequest(logsOptions);
      console.log('\nBuild logs:');
      if (logsResponse.status === 200 && logsResponse.data) {
        logsResponse.data.forEach(event => {
          console.log(`[${event.type}] ${event.payload?.text || event.payload?.info || JSON.stringify(event.payload)}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error checking deployment:', error);
  }
}

checkDeployment();