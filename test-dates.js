require('dotenv').config();
const fetch = require('node-fetch');

async function testDates() {
  try {
    const response = await fetch('https://tinc-burn-tracker.vercel.app/data/burn-data.json');
    const data = await response.json();
    
    console.log('Total days:', data.dailyBurns.length);
    console.log('Start date:', data.startDate);
    console.log('End date:', data.endDate);
    console.log('\nLast 5 dates:');
    
    const last5 = data.dailyBurns.slice(-5);
    last5.forEach(day => {
      const date = new Date(day.date);
      console.log(`${day.date} -> ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${day.amountTinc.toFixed(2)} TINC)`);
    });
    
    // Check for timezone issues
    console.log('\nTimezone test:');
    const testDate = new Date('2025-07-15');
    console.log('Direct parse:', testDate.toString());
    console.log('UTC:', testDate.toUTCString());
    console.log('Local:', testDate.toLocaleDateString());
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testDates();