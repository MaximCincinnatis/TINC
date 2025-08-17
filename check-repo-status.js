require('dotenv').config();
#!/usr/bin/env node

const https = require('https');

const GITHUB_REPO = 'MaximCincinnatis/TINC';

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

async function checkRepoStatus() {
  console.log('🔍 Checking GitHub repository status...');
  
  try {
    // Check if repo is public by trying to access it without auth
    const repoOptions = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_REPO}`,
      method: 'GET',
      headers: {
        'User-Agent': 'TINC-Deploy-Check',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    
    const repoResponse = await makeRequest(repoOptions);
    console.log('GitHub API response:', repoResponse.status);
    
    if (repoResponse.status === 200) {
      console.log('✅ Repository is PUBLIC');
      console.log('- Full name:', repoResponse.data.full_name);
      console.log('- Default branch:', repoResponse.data.default_branch);
      console.log('- Private:', repoResponse.data.private);
      console.log('- Clone URL:', repoResponse.data.clone_url);
      
      // Check latest commit
      const commitsOptions = {
        hostname: 'api.github.com',
        path: `/repos/${GITHUB_REPO}/commits/master`,
        method: 'GET',
        headers: {
          'User-Agent': 'TINC-Deploy-Check',
          'Accept': 'application/vnd.github.v3+json'
        }
      };
      
      const commitsResponse = await makeRequest(commitsOptions);
      if (commitsResponse.status === 200) {
        console.log('- Latest commit:', commitsResponse.data.sha.substring(0, 7));
        console.log('- Commit message:', commitsResponse.data.commit.message);
        console.log('- Commit date:', commitsResponse.data.commit.committer.date);
      }
      
    } else if (repoResponse.status === 404) {
      console.log('❌ Repository is PRIVATE or does not exist');
      console.log('This is likely why Vercel auto-deployment is not working!');
      console.log('\n🔧 Solutions:');
      console.log('1. Make the repository public on GitHub');
      console.log('2. Or ensure Vercel has proper GitHub App permissions for private repos');
      console.log('3. Or use Vercel CLI for manual deployments');
      
    } else {
      console.log('❓ Unexpected response:', repoResponse.status);
      console.log('Response:', repoResponse.data);
    }
    
  } catch (error) {
    console.error('Error checking repository status:', error);
  }
}

checkRepoStatus();