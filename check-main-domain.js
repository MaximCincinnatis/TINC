require('dotenv').config();
#!/usr/bin/env node

const https = require('https');

function makeRequest(hostname, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      path: path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };
    
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data: body });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function checkMainDomain() {
  console.log('🔍 Checking main domain status...');
  
  try {
    // Check main domain
    const mainResponse = await makeRequest('tinc-burn-tracker.vercel.app', '/');
    console.log('Main domain response:', mainResponse.status);
    
    if (mainResponse.status === 200) {
      const html = mainResponse.data;
      
      // Extract JS file
      const jsMatch = html.match(/main\.([a-f0-9]+)\.js/);
      if (jsMatch) {
        console.log('✅ Main domain JS file:', jsMatch[0]);
        console.log('- Hash:', jsMatch[1]);
        
        // Check if it's the latest version
        if (jsMatch[1] === 'f06e69d5') {
          console.log('🎉 Main domain has the latest deployment!');
          console.log('🦈 Realistic sea creatures should be visible');
        } else {
          console.log('❌ Main domain still has old deployment');
          console.log('Expected hash: f06e69d5');
          console.log('Current hash:', jsMatch[1]);
        }
      } else {
        console.log('❌ Could not find JS file in HTML');
      }
    } else {
      console.log('❌ Main domain not accessible');
    }
    
    // Check latest deployment directly
    console.log('\n🔍 Checking latest deployment...');
    const latestResponse = await makeRequest('tinc-burn-tracker-12jix27sn-maxims-projects-598f131a.vercel.app', '/');
    console.log('Latest deployment response:', latestResponse.status);
    
    if (latestResponse.status === 200) {
      const html = latestResponse.data;
      const jsMatch = html.match(/main\.([a-f0-9]+)\.js/);
      if (jsMatch) {
        console.log('✅ Latest deployment JS file:', jsMatch[0]);
        console.log('- Hash:', jsMatch[1]);
        
        if (jsMatch[1] === 'f06e69d5') {
          console.log('🎉 Latest deployment has realistic sea creatures!');
          console.log('🔗 Direct URL: https://tinc-burn-tracker-12jix27sn-maxims-projects-598f131a.vercel.app/');
        }
      }
    }
    
  } catch (error) {
    console.error('Error checking domains:', error);
  }
}

checkMainDomain();