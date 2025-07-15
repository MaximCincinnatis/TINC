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

async function deployFilesDirect() {
  console.log('📁 Deploying files directly to Vercel...');
  
  try {
    // Make sure build exists
    if (!fs.existsSync('./build')) {
      console.log('❌ Build directory not found. Please run "npm run build" first.');
      return;
    }
    
    // Read key files
    const indexHtml = fs.readFileSync('./build/index.html', 'utf8');
    const manifestJson = fs.readFileSync('./build/manifest.json', 'utf8');
    
    // Find the main JS and CSS files
    const staticDir = './build/static';
    const jsFiles = fs.readdirSync(path.join(staticDir, 'js')).filter(f => f.startsWith('main.') && f.endsWith('.js'));
    const cssFiles = fs.readdirSync(path.join(staticDir, 'css')).filter(f => f.startsWith('main.') && f.endsWith('.css'));
    
    console.log(`📋 Found ${jsFiles.length} JS files and ${cssFiles.length} CSS files`);
    
    const files = [
      {
        file: 'index.html',
        data: indexHtml
      },
      {
        file: 'manifest.json', 
        data: manifestJson
      }
    ];
    
    // Add JS files
    jsFiles.forEach(file => {
      const content = fs.readFileSync(path.join(staticDir, 'js', file), 'utf8');
      files.push({
        file: `static/js/${file}`,
        data: content
      });
      console.log(`✅ Added: static/js/${file}`);
    });
    
    // Add CSS files
    cssFiles.forEach(file => {
      const content = fs.readFileSync(path.join(staticDir, 'css', file), 'utf8');
      files.push({
        file: `static/css/${file}`,
        data: content
      });
      console.log(`✅ Added: static/css/${file}`);
    });
    
    // Verify sea creatures are in the JS
    const mainJsContent = files.find(f => f.file.includes('main.') && f.file.endsWith('.js'));
    if (mainJsContent && mainJsContent.data.includes('Poseidon')) {
      console.log('🌊 Confirmed: Realistic sea creatures are in the build!');
    } else {
      console.log('❌ Warning: Sea creatures not found in build');
    }
    
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
      target: 'production',
      projectSettings: {
        framework: 'create-react-app',
        buildCommand: 'npm run build',
        outputDirectory: 'build'
      }
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
      console.log('🌐 Check https://tinc-burn-tracker.vercel.app/ in 2-3 minutes');
      console.log('🦈 You should now see:');
      console.log('   - Poseidon with detailed trident');
      console.log('   - Whale with realistic body and fins');
      console.log('   - Shark with streamlined design');
      console.log('   - Dolphin with curved body and beak');
      console.log('   - Squid with flowing tentacles');
      console.log('   - Shrimp with segmented body');
      
    } else {
      console.log('❌ Deployment failed');
      console.log('Error:', deployResponse.data);
    }
    
  } catch (error) {
    console.error('Error deploying files:', error);
  }
}

deployFilesDirect();