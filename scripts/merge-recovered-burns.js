#!/usr/bin/env node
/**
 * Merge recovered burns into existing data without losing history
 */

const fs = require('fs');
const path = require('path');

// Load existing data
const dataPath = path.join(__dirname, '../public/data/burn-data.json');
const existingData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('📊 Existing data:');
console.log(`  • Days: ${existingData.dailyBurns.length}`);
console.log(`  • Total burns: ${existingData.dailyBurns.reduce((sum, d) => sum + d.transactionCount, 0)}`);
console.log(`  • Total TINC: ${existingData.totalBurned?.toFixed(2) || 'N/A'}`);

// The recovered burns from our verification scan
const recoveredBurns = {
  '2025-08-25': {
    burns: [
      { hash: '0xda29ae6de507f68e27bd5c0bf22a244acb7ff78220ed07e595f9d32393f29689', amount: 751.61, blockNumber: 23214832, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' },
      { hash: '0x3add80f47e8d02edf3a5200cfab3e01cc06ca037cab145ed9717e95b7a4df7e6', amount: 3166.55, blockNumber: 23215473, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' },
      { hash: '0x76a43841742fb55782e890a552054023600b4b389853b328d940e6c48b9303e2', amount: 256.40, blockNumber: 23215524, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' }
    ]
  },
  '2025-08-26': {
    burns: [
      { hash: '0x2381977973e21457ab1106dfb0436a74dd29e5977a65adc7c977c73cbf0d6358', amount: 11264.38, blockNumber: 23225291, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' },
      { hash: '0x336fc0d424ad02426d5c713322460eccc7976f1b37531f5244d7d427acb5f5d6', amount: 16040.39, blockNumber: 23225292, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' },
      { hash: '0x3efa03778d82021db7f8ee0221c40d1670c889e2c14f2aa314caebbd09ca21b0', amount: 3220.12, blockNumber: 23227717, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' },
      { hash: '0x9035d9aae659b9b75f32321eb941260cd759fc9a4e52b21855142ddd37cc8de5', amount: 391.05, blockNumber: 23227837, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' },
      { hash: '0x1270a9c3345e7c29c7587fb58193e5c760f6ceea5598010a1a9362710711f336', amount: 1759.72, blockNumber: 23227897, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' },
      { hash: '0x4da7bb656ff042ff4899bf4784c0e026487a3e0462b0a0fc74059da3aa325d71', amount: 3749.44, blockNumber: 23228092, from: '0x9fabf48ebe587ee4f8b3172012c3060cc40fea6c' },
      { hash: '0xb7eb697f295416a936db0772ddfc1fc8f289872ace1d11d57a9969af390efced', amount: 11315.46, blockNumber: 23221719, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' },
      { hash: '0xa382c10cb9f614f1ad44cedf88b67e912c529cbbadc8e80b5cf214fea4f46f61', amount: 1533.85, blockNumber: 23221721, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' },
      { hash: '0x8dc67f2b6f96e15c2551f17ad81e1f3e0e60c3ad21b87797f90709f2b2e08afe', amount: 11360.50, blockNumber: 23221725, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' }
    ]
  },
  '2025-08-27': {
    burns: [
      { hash: '0xa160d7cf50b6250be15089bfa456b2c75de0449a7e9c91d01b4fb82781236df8', amount: 1879.31, blockNumber: 23230522, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' },
      { hash: '0x1aa7dbf3d402aff6cf00e6d6717e447bb8364916106e98046e409aaf3987c365', amount: 1967.53, blockNumber: 23230582, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' },
      { hash: '0x6a1df1350ee71b3b0ccfdd46f1f2c5fe6a123cd2b63669b2964c09093e2ed894', amount: 2355.58, blockNumber: 23232314, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' },
      { hash: '0x1419c848324eecc4ff0d935619bde85a40fd60d20d623c17d01441e33428cbda', amount: 3402.86, blockNumber: 23235785, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' },
      { hash: '0xc5abc824056a98dc37a5b865262d6ecf455f0fced6c6be8ef03d05ea3f82b34a', amount: 2164.01, blockNumber: 23236679, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' },
      { hash: '0x6cf6f45ce70e46ff682b4848318d11b55c1e2dd23002c05a5cae8f8229c0b096', amount: 323.74, blockNumber: 23236972, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' }
    ]
  },
  '2025-08-28': {
    burns: [
      { hash: '0x45ae0ea64279094a67fd4c1e0e74ea1605f56faef76686feb8be67a790b089c1', amount: 9156.73, blockNumber: 23239256, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' },
      { hash: '0xb30e5200588ad1e1f4b5c7985027461bdd9a0058a5392cec25d6e7e5afefecb3', amount: 10592.60, blockNumber: 23239258, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' },
      { hash: '0x3a49c41285e558543469a63cb76b51b6443e6458dd1a3380c69d05115f743889', amount: 2579.10, blockNumber: 23239553, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' },
      { hash: '0x3cf63e3d4c9e0efeccd297f6d7901a621008543dcfbe0ad8b1be3cbc26767d9e', amount: 3727.32, blockNumber: 23241404, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' },
      { hash: '0xc4547376dfb564a53c97795b4c46348821c9a9ac2fe75cc09e2b0dbad380897d', amount: 735.94, blockNumber: 23241991, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' },
      { hash: '0x9dcc3c6e6925fdeb8d067ad6dbcbed5114df20d82806969166546ab9a10e7271', amount: 2584.93, blockNumber: 23242059, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' },
      { hash: '0xcf02bcf824244ae096fec88722d7e95992b5e19e6299d48c913ee1a977da386b', amount: 12670.65, blockNumber: 23243198, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' },
      { hash: '0x005902cdabe7d236d76470b1c518d6e5aedbcbeb4945612d6f73e9e3cbd1bb16', amount: 239.45, blockNumber: 23243421, from: '0x060e990a7e760f211447e76a53ff6e1be2f3bdd3' }
    ]
  }
};

// Merge the recovered burns into existing data
Object.entries(recoveredBurns).forEach(([date, data]) => {
  const existingDay = existingData.dailyBurns.find(d => d.date === date);
  
  if (existingDay) {
    console.log(`\n📅 Updating ${date}:`);
    console.log(`  • Was: ${existingDay.transactionCount} burns, ${existingDay.amountTinc.toFixed(2)} TINC`);
    
    // Replace with complete data
    existingDay.transactions = data.burns.map(b => ({
      hash: b.hash,
      amount: b.amount,
      from: b.from,
      blockNumber: b.blockNumber
    }));
    existingDay.transactionCount = data.burns.length;
    existingDay.amountTinc = data.burns.reduce((sum, b) => sum + b.amount, 0);
    
    console.log(`  • Now: ${existingDay.transactionCount} burns, ${existingDay.amountTinc.toFixed(2)} TINC`);
  } else {
    console.log(`\n📅 Adding new day ${date}`);
    // Add new day
    const newDay = {
      date,
      amountTinc: data.burns.reduce((sum, b) => sum + b.amount, 0),
      transactionCount: data.burns.length,
      transactions: data.burns.map(b => ({
        hash: b.hash,
        amount: b.amount,
        from: b.from,
        blockNumber: b.blockNumber
      }))
    };
    existingData.dailyBurns.push(newDay);
    console.log(`  • Added: ${newDay.transactionCount} burns, ${newDay.amountTinc.toFixed(2)} TINC`);
  }
});

// Sort by date
existingData.dailyBurns.sort((a, b) => a.date.localeCompare(b.date));

// Recalculate totals
existingData.totalBurned = existingData.dailyBurns.reduce((sum, day) => sum + day.amountTinc, 0);
existingData.endDate = existingData.dailyBurns[existingData.dailyBurns.length - 1].date;

// Update timestamp
existingData.lastUpdated = new Date().toISOString();

console.log('\n📊 Final data:');
console.log(`  • Days: ${existingData.dailyBurns.length}`);
console.log(`  • Total burns: ${existingData.dailyBurns.reduce((sum, d) => sum + d.transactionCount, 0)}`);
console.log(`  • Total TINC: ${existingData.totalBurned.toFixed(2)}`);

// Save
fs.writeFileSync(dataPath, JSON.stringify(existingData, null, 2));
console.log(`\n💾 Saved to ${dataPath}`);

// Also save to data folder
const dataFolderPath = path.join(__dirname, '../data/burn-data.json');
fs.writeFileSync(dataFolderPath, JSON.stringify(existingData, null, 2));
console.log(`💾 Saved to ${dataFolderPath}`);

console.log('\n✅ Merge complete!');