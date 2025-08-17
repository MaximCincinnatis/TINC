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

async function setupWebhook() {
  console.log('Setting up deployment webhook...');
  
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
    console.log('Project found:', projectResponse.status === 200);
    
    if (projectResponse.status === 200) {
      console.log('Project ID:', projectResponse.data.id);
      
      // Create a webhook for GitHub pushes
      const webhookOptions = {
        hostname: 'api.vercel.com',
        path: `/v1/projects/${PROJECT_NAME}/webhooks`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json'
        }
      };
      
      const webhookData = {
        url: `https://api.vercel.com/v1/integrations/deploy/${PROJECT_NAME}/${VERCEL_TOKEN}`,
        events: ['deployment.created', 'deployment.ready']
      };
      
      const webhookResponse = await makeRequest(webhookOptions, webhookData);
      console.log('Webhook response:', webhookResponse.status);
      
      if (webhookResponse.status === 200 || webhookResponse.status === 201) {
        console.log('✅ Webhook created successfully');
        console.log('Webhook ID:', webhookResponse.data.id);
      } else {
        console.log('Webhook error:', webhookResponse.data);
      }
    }
    
    // Alternative: Create a deploy hook URL
    const deployHookOptions = {
      hostname: 'api.vercel.com',
      path: `/v1/projects/${PROJECT_NAME}/deploy-hooks`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };
    
    const deployHookData = {
      name: 'GitHub Push Hook',
      ref: 'master'
    };
    
    const deployHookResponse = await makeRequest(deployHookOptions, deployHookData);
    console.log('Deploy hook response:', deployHookResponse.status);
    
    if (deployHookResponse.status === 200 || deployHookResponse.status === 201) {
      console.log('✅ Deploy hook created successfully');
      console.log('Deploy hook URL:', deployHookResponse.data.url);
      console.log('\nTo enable auto-deployment:');
      console.log('1. Go to your GitHub repository settings');
      console.log('2. Navigate to Webhooks');
      console.log('3. Add a new webhook with this URL:', deployHookResponse.data.url);
      console.log('4. Set content type to application/json');
      console.log('5. Select "Just the push event"');
      console.log('6. Save the webhook');
    } else {
      console.log('Deploy hook error:', deployHookResponse.data);
    }
    
  } catch (error) {
    console.error('Error setting up webhook:', error);
  }
}

setupWebhook();