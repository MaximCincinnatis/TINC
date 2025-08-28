import { BurnData } from '../types/BurnData';

// Progress callback
let progressCallback: ((message: string, progress?: number) => void) | null = null;

export function setProgressCallback(callback: (message: string, progress?: number) => void) {
  progressCallback = callback;
}

export async function fetchBurnData(forceRefresh = false): Promise<BurnData> {
  try {
    progressCallback?.('Loading cached data...', 20);
    
    // Try to get versioned data first
    let dataUrl = '/data/burn-data.json'; // fallback
    
    try {
      // Check for data manifest to get latest version
      const manifestResponse = await fetch('/data/data-manifest.json', {
        cache: forceRefresh ? 'no-cache' : 'default',
      });
      
      if (manifestResponse.ok) {
        const manifest = await manifestResponse.json();
        dataUrl = `/data/${manifest.latest}`;
        progressCallback?.('Using versioned data...', 30);
      }
    } catch (manifestError) {
      // No manifest found, using legacy file
    }
    
    // Fetch from the determined URL
    const response = await fetch(dataUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Add cache busting for forced refresh
      cache: forceRefresh ? 'no-cache' : 'default',
    });

    progressCallback?.('Processing data...', 60);

    if (!response.ok) {
      throw new Error(`Failed to load data: ${response.status} ${response.statusText}`);
    }

    const burnData = await response.json();
    
    progressCallback?.('Data loaded successfully!', 100);
    
    // Ensure the data has the fromCache flag
    return {
      ...burnData,
      fromCache: true,
    };

  } catch (error) {
    console.error('Error fetching cached burn data:', error);
    
    // Fallback to original service if file loading fails
    try {
      progressCallback?.('File cache failed, falling back to blockchain fetch...', 30);
      
      // Import the original service dynamically as fallback
      const originalService = await import('./burnService');
      return await originalService.fetchBurnData(forceRefresh);
      
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      throw new Error(
        error instanceof Error 
          ? `File cache failed: ${error.message}` 
          : 'Failed to fetch burn data from cache and fallback'
      );
    }
  }
}

// Function to get the last update time from cached data
export async function getLastUpdateTime(): Promise<Date | null> {
  try {
    // Try manifest first for more accurate timestamp
    try {
      const manifestResponse = await fetch('/data/data-manifest.json');
      if (manifestResponse.ok) {
        const manifest = await manifestResponse.json();
        return new Date(manifest.timestamp);
      }
    } catch {
      // Fall back to data file
    }
    
    const response = await fetch('/data/burn-data.json');
    if (!response.ok) return null;
    
    const data = await response.json();
    return new Date(data.fetchedAt);
  } catch {
    return null;
  }
}

// Function to check if data is stale (older than specified hours)
export async function isDataStale(maxHours = 6): Promise<boolean> {
  const lastUpdate = await getLastUpdateTime();
  if (!lastUpdate) return true;
  
  const hoursAgo = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60);
  return hoursAgo > maxHours;
}