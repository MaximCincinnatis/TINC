#!/usr/bin/env node

const https = require('https');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || require('dotenv').config().parsed?.VERCEL_TOKEN;
const DEPLOYMENT_ID = 'dpl_6CZBf9YEwmX1uoQRkK1rKHM2Vruv';

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

async function checkDeploymentLogs() {
  console.log('🔍 Checking deployment logs...');
  
  try {
    // Get deployment status
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
      console.log('📊 Deployment details:');
      console.log('- Status:', deployResponse.data.readyState);
      console.log('- URL:', deployResponse.data.url);
      console.log('- Created:', new Date(deployResponse.data.createdAt).toLocaleString());
      console.log('- Ready:', deployResponse.data.ready);
      
      if (deployResponse.data.readyState === 'ERROR') {
        console.log('- Error code:', deployResponse.data.error?.code);
        console.log('- Error message:', deployResponse.data.error?.message);
      }
      
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
      console.log('\n📋 Build logs:');
      
      if (logsResponse.status === 200 && logsResponse.data) {
        logsResponse.data.forEach((event, index) => {
          console.log(`${index + 1}. [${event.type}] ${event.payload?.text || event.payload?.info || JSON.stringify(event.payload)}`);
        });
      } else {
        console.log('Could not retrieve logs');
      }
    }
    
    // Try to access one of the working deployments to see what's different
    console.log('\n🔄 Checking a working deployment...');
    const workingDeployment = 'https://tinc-burn-tracker-qg618584a-maxims-projects-598f131a.vercel.app';
    
    const testOptions = {
      hostname: 'tinc-burn-tracker-qg618584a-maxims-projects-598f131a.vercel.app',
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'TINC-Deploy-Check'
      }
    };
    
    const testResponse = await makeRequest(testOptions);
    console.log('Working deployment response:', testResponse.status);
    
    if (testResponse.status === 200) {
      console.log('✅ Working deployment is accessible');
      
      // Check if it has the sea creatures
      const htmlContent = testResponse.data;
      if (typeof htmlContent === 'string' && htmlContent.includes('main.17143a24.js')) {
        console.log('🎉 Working deployment has the correct JS file!');
        console.log('This means the realistic sea creatures should be there.');
      }
    }
    
  } catch (error) {
    console.error('Error checking deployment logs:', error);
  }
}

checkDeploymentLogs();