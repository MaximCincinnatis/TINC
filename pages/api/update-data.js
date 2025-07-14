const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

export default async function handler(req, res) {
  // Only allow POST requests for security
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify the request is from Vercel cron (optional security check)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting scheduled burn data update...');
    
    // Get the project root directory
    const projectRoot = process.cwd();
    const scriptPath = path.join(projectRoot, 'scripts', 'fetch-burn-data.js');
    const dataPath = path.join(projectRoot, 'data', 'burn-data.json');
    const publicDataPath = path.join(projectRoot, 'public', 'data', 'burn-data.json');
    
    // Run the fetch script
    console.log('Executing fetch-burn-data.js...');
    execSync(`node ${scriptPath}`, { 
      stdio: 'pipe',
      timeout: 300000 // 5 minute timeout
    });
    
    // Copy data to public directory
    if (fs.existsSync(dataPath)) {
      console.log('Copying data to public directory...');
      fs.copyFileSync(dataPath, publicDataPath);
      
      // Read the updated data to verify
      const updatedData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      
      console.log('Data update completed successfully');
      return res.status(200).json({
        success: true,
        message: 'Burn data updated successfully',
        timestamp: new Date().toISOString(),
        totalBurned: updatedData.totalBurned,
        fetchedAt: updatedData.fetchedAt
      });
    } else {
      throw new Error('Data file not found after script execution');
    }
    
  } catch (error) {
    console.error('Error updating burn data:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}