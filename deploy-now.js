#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

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

function readFileAsBase64(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    return content.toString('base64');
  } catch (error) {
    console.log(`Could not read file: ${filePath}`);
    return null;
  }
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  
  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });
  
  return arrayOfFiles;
}

async function deployNow() {
  console.log('Creating manual deployment...');
  
  try {
    // Make sure build exists
    if (!fs.existsSync('./build')) {
      console.log('Build directory not found. Please run "npm run build" first.');
      return;
    }
    
    // Get all files from build directory
    const buildFiles = getAllFiles('./build');
    const files = [];
    
    console.log(`Found ${buildFiles.length} files in build directory`);
    
    // Add key files for deployment
    const keyFiles = [
      'build/index.html',
      'build/static/js/main.17143a24.js',
      'build/static/css/main.858b97aa.css',
      'build/manifest.json'
    ];
    
    keyFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        const relativePath = filePath.replace('build/', '');
        const content = fs.readFileSync(filePath, 'utf8');
        files.push({
          file: relativePath,
          data: content
        });
        console.log(`Added: ${relativePath}`);
      }
    });
    
    // Create deployment
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
      projectSettings: {
        framework: 'create-react-app',
        buildCommand: 'npm run build',
        outputDirectory: 'build'
      },
      target: 'production'
    };
    
    console.log('Uploading deployment...');
    const deployResponse = await makeRequest(deployOptions, deployData);
    console.log('Deploy response:', deployResponse.status);
    
    if (deployResponse.status === 200 || deployResponse.status === 201) {
      console.log('✅ Successfully created deployment!');
      console.log('- Deployment URL:', `https://${deployResponse.data.url}`);
      console.log('- Status:', deployResponse.data.readyState);
      console.log('- Deployment ID:', deployResponse.data.id);
      
      // Check deployment status
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
          console.log('- Updated status:', statusResponse.data.readyState);
        }
      }, 5000);
      
    } else {
      console.log('❌ Deploy failed');
      console.log('Error:', deployResponse.data);
    }
    
  } catch (error) {
    console.error('Error creating deployment:', error);
  }
}

deployNow();