const fs = require('fs');
const path = require('path');

class HolderCacheManager {
  constructor() {
    this.cacheDir = path.join(__dirname, '../data/cache');
    this.cacheFile = path.join(this.cacheDir, 'holder-data.json');
    this.ensureCacheDir();
  }

  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  loadCache() {
    if (fs.existsSync(this.cacheFile)) {
      try {
        const data = fs.readFileSync(this.cacheFile, 'utf8');
        return JSON.parse(data);
      } catch (error) {
        console.warn('Failed to load cache:', error.message);
        return null;
      }
    }
    return null;
  }

  saveCache(data) {
    try {
      const cacheData = {
        ...data,
        cachedAt: new Date().toISOString()
      };
      fs.writeFileSync(this.cacheFile, JSON.stringify(cacheData, null, 2));
      console.log('✅ Holder cache saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to save cache:', error.message);
      return false;
    }
  }

  isCacheValid(maxAgeHours = 24) {
    const cache = this.loadCache();
    if (!cache || !cache.cachedAt) return false;
    
    const cacheAge = Date.now() - new Date(cache.cachedAt).getTime();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    
    return cacheAge < maxAge;
  }

  getCacheAge() {
    const cache = this.loadCache();
    if (!cache || !cache.cachedAt) return null;
    
    const ageMs = Date.now() - new Date(cache.cachedAt).getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    return ageHours;
  }

  clearCache() {
    if (fs.existsSync(this.cacheFile)) {
      fs.unlinkSync(this.cacheFile);
      console.log('🗑️ Cache cleared');
    }
  }

  updateHolderCategories(holders, totalSupply) {
    let poseidon = 0, whale = 0, shark = 0, dolphin = 0, squid = 0, shrimp = 0;
    
    holders.forEach(holder => {
      const balance = parseFloat(holder.balance);
      const percentage = (balance / totalSupply) * 100;
      
      if (percentage >= 10) poseidon++;
      else if (percentage >= 1) whale++;
      else if (percentage >= 0.1) shark++;
      else if (percentage >= 0.01) dolphin++;
      else if (percentage >= 0.001) squid++;
      else shrimp++;
    });

    return { poseidon, whale, shark, dolphin, squid, shrimp };
  }
}

module.exports = HolderCacheManager;