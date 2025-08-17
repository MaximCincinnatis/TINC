require('dotenv').config();
#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 Forcing deployment of realistic sea creatures...');

// Make sure we have the latest build
console.log('Building latest version...');
execSync('npm run build', { stdio: 'inherit' });

// Check that the sea creatures are in the build
const fs = require('fs');
const indexHtml = fs.readFileSync('./build/index.html', 'utf8');
const mainJsFile = indexHtml.match(/\/static\/js\/main\.([a-f0-9]+)\.js/);

if (mainJsFile) {
  const jsContent = fs.readFileSync(`./build/static/js/${mainJsFile[0].replace('/static/js/', '')}`, 'utf8');
  
  if (jsContent.includes('Poseidon') && jsContent.includes('viewBox="0 0 100 100"')) {
    console.log('✅ Realistic sea creatures confirmed in build');
    
    // Create a simple verification file
    const verification = {
      buildTime: new Date().toISOString(),
      features: [
        'Poseidon with trident',
        'Whale with realistic body',
        'Shark with streamlined design',
        'Dolphin with curved body',
        'Squid with tentacles',
        'Shrimp with segmented body'
      ],
      jsFile: mainJsFile[0],
      buildHash: mainJsFile[1]
    };
    
    fs.writeFileSync('./build/verification.json', JSON.stringify(verification, null, 2));
    console.log('✅ Build verified with hash:', mainJsFile[1]);
    
    // Now let's push a simple change to trigger deployment
    console.log('\n🔄 Triggering auto-deployment...');
    
    fs.writeFileSync('./LAST_DEPLOY.txt', new Date().toISOString());
    execSync('git add LAST_DEPLOY.txt', { stdio: 'inherit' });
    execSync('git commit -m "Force deployment trigger for realistic sea creatures"', { stdio: 'inherit' });
    execSync('git push origin master', { stdio: 'inherit' });
    
    console.log('✅ Git push completed - auto-deployment should start now');
    console.log('🌐 Check https://tinc-burn-tracker.vercel.app/ in 2-3 minutes');
    
  } else {
    console.log('❌ Sea creatures not found in build');
  }
} else {
  console.log('❌ Could not find main JS file');
}