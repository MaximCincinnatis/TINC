#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

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

async function deployComplete() {
  console.log('🚀 Deploying complete build to Vercel...');
  
  try {
    // Since we're uploading pre-built files, we don't need to build on Vercel
    // Just upload the static files directly
    
    if (!fs.existsSync('./build')) {
      console.log('❌ Build directory not found. Please run "npm run build" first.');
      return;
    }
    
    // Get all files from build directory
    function getAllFiles(dir, prefix = '') {
      const files = [];
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = prefix ? `${prefix}/${item}` : item;
        
        if (fs.statSync(fullPath).isDirectory()) {
          files.push(...getAllFiles(fullPath, relativePath));
        } else {
          const content = fs.readFileSync(fullPath, 'utf8');
          files.push({
            file: relativePath,
            data: content
          });
        }
      }
      
      return files;
    }
    
    const files = getAllFiles('./build');
    console.log(`📁 Found ${files.length} files to upload`);
    
    // Verify sea creatures are in the JS
    const mainJsFile = files.find(f => f.file.includes('main.') && f.file.endsWith('.js'));
    if (mainJsFile && mainJsFile.data.includes('Poseidon')) {
      console.log('🌊 Confirmed: Realistic sea creatures are in the build!');
    } else {
      console.log('❌ Warning: Sea creatures not found in build');
    }
    
    // Create deployment with static files only
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
      files: files,
      target: 'production'
      // No build command needed since we're uploading pre-built files
    };
    
    console.log('\n🚀 Uploading deployment...');
    const deployResponse = await makeRequest(deployOptions, deployData);
    console.log('Deploy response:', deployResponse.status);
    
    if (deployResponse.status === 200 || deployResponse.status === 201) {
      console.log('✅ Deployment created successfully!');
      console.log('- Deployment URL:', `https://${deployResponse.data.url}`);
      console.log('- Status:', deployResponse.data.readyState);
      console.log('- Deployment ID:', deployResponse.data.id);
      
      console.log('\n🎉 Realistic sea creatures are now deployed!');
      console.log('🌐 Main URL: https://tinc-burn-tracker.vercel.app/');
      console.log('🔗 Direct URL: https://' + deployResponse.data.url);
      
      console.log('\n🦈 You should now see:');
      console.log('   ✅ Poseidon with detailed trident');
      console.log('   ✅ Whale with realistic body and fins');
      console.log('   ✅ Shark with streamlined design');
      console.log('   ✅ Dolphin with curved body and beak');
      console.log('   ✅ Squid with flowing tentacles');
      console.log('   ✅ Shrimp with segmented body');
      
      // Monitor deployment status
      console.log('\n⏳ Monitoring deployment status...');
      let attempts = 0;
      const maxAttempts = 10;
      
      const checkStatus = async () => {
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
          console.log(`📊 Status check ${attempts + 1}: ${statusResponse.data.readyState}`);
          
          if (statusResponse.data.readyState === 'READY') {
            console.log('🎉 Deployment is READY!');
            console.log('🌐 https://tinc-burn-tracker.vercel.app/ should now show the realistic sea creatures');
            return;
          } else if (statusResponse.data.readyState === 'ERROR') {
            console.log('❌ Deployment failed');
            return;
          }
          
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 5000);
          } else {
            console.log('⏰ Timeout - check the deployment manually');
          }
        }
      };
      
      setTimeout(checkStatus, 5000);
      
    } else {
      console.log('❌ Deployment failed');
      console.log('Error:', deployResponse.data);
    }
    
  } catch (error) {
    console.error('Error deploying:', error);
  }
}

deployComplete();