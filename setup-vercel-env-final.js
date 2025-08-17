require('dotenv').config();
const https = require('https');

// Use the updated Vercel token from .env
const VERCEL_TOKEN = process.env.VERCEL_TOKEN || 'ALRc2T7tvlvNzOPCyxJNIIhd';

async function makeVercelRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.vercel.com',
            port: 443,
            path: path,
            method: method,
            headers: {
                'Authorization': `Bearer ${VERCEL_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            const jsonData = JSON.stringify(data);
            options.headers['Content-Length'] = jsonData.length;
        }

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(response);
                    } else {
                        reject({ statusCode: res.statusCode, error: response });
                    }
                } catch (e) {
                    reject({ statusCode: res.statusCode, error: body });
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

async function findProject() {
    console.log('Finding TINC project on Vercel...');
    try {
        const projects = await makeVercelRequest('/v9/projects');
        const tincProject = projects.projects?.find(p => 
            p.name === 'tinc-burn-tracker' || 
            p.name === 'TINC' ||
            p.name.toLowerCase().includes('tinc')
        );
        
        if (tincProject) {
            console.log(`✓ Found project: ${tincProject.name} (ID: ${tincProject.id})`);
            return tincProject;
        } else {
            console.log('Available projects:', projects.projects?.map(p => p.name).join(', '));
            throw new Error('TINC project not found');
        }
    } catch (error) {
        console.error('Error finding project:', error);
        throw error;
    }
}

async function addOrUpdateEnvVar(projectId, key, value) {
    try {
        // Try to add the variable
        const result = await makeVercelRequest(
            `/v10/projects/${projectId}/env`,
            'POST',
            {
                key,
                value,
                target: ['production', 'preview', 'development'],
                type: 'encrypted'
            }
        );
        console.log(`✅ Added ${key} to Vercel`);
        return result;
    } catch (error) {
        if (error.error?.error?.code === 'ENV_ALREADY_EXISTS') {
            console.log(`⚠️  ${key} already exists, attempting to update...`);
            
            // Get existing env vars
            const envVars = await makeVercelRequest(`/v9/projects/${projectId}/env`);
            const existing = envVars.envs?.find(e => e.key === key);
            
            if (existing) {
                // Delete the old one
                await makeVercelRequest(`/v9/projects/${projectId}/env/${existing.id}`, 'DELETE');
                console.log(`  Removed old ${key}`);
                
                // Add the new one
                const result = await makeVercelRequest(
                    `/v10/projects/${projectId}/env`,
                    'POST',
                    {
                        key,
                        value,
                        target: ['production', 'preview', 'development'],
                        type: 'encrypted'
                    }
                );
                console.log(`✅ Updated ${key} in Vercel`);
                return result;
            }
        } else {
            throw error;
        }
    }
}

async function main() {
    console.log('=== Vercel Environment Variables Setup ===\n');
    console.log(`Using Vercel Token: ${VERCEL_TOKEN.substring(0, 10)}...`);
    
    try {
        const project = await findProject();
        console.log('\nAdding environment variables...\n');
        
        const envVars = [
            { key: 'MORALIS_API_KEY', value: process.env.MORALIS_API_KEY },
            { key: 'ETHERSCAN_API_KEY', value: process.env.ETHERSCAN_API_KEY },
            { key: 'GITHUB_TOKEN', value: process.env.GITHUB_TOKEN },
            { key: 'VERCEL_TOKEN', value: VERCEL_TOKEN }
        ];
        
        for (const { key, value } of envVars) {
            if (value) {
                try {
                    await addOrUpdateEnvVar(project.id, key, value);
                } catch (error) {
                    console.error(`❌ Failed to add ${key}:`, error.error || error);
                }
            } else {
                console.log(`⚠️  Skipping ${key} - not found`);
            }
        }
        
        console.log('\n✅ Environment variables setup complete!');
        console.log('\n📝 Next steps:');
        console.log('1. Run cleanup script to remove hardcoded values from code');
        console.log('2. Commit and push changes');
        console.log('3. Vercel will auto-deploy with environment variables');
        console.log('\nYour site will continue working without interruption!');
        
    } catch (error) {
        console.error('\n❌ Setup failed:', error.error || error);
        console.log('\n📝 Manual setup required:');
        console.log('1. Go to: https://vercel.com/dashboard');
        console.log('2. Select your TINC project');
        console.log('3. Go to Settings → Environment Variables');
        console.log('4. Add the variables from your .env file');
    }
}

main().catch(console.error);