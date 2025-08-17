require('dotenv').config();
const fetch = require('node-fetch');

async function debugChart() {
  try {
    const response = await fetch('https://tinc-burn-tracker.vercel.app/data/burn-data.json');
    const data = await response.json();
    
    console.log('=== DATA AUDIT ===');
    console.log('Total entries:', data.dailyBurns.length);
    
    // Check last 5 entries
    console.log('\nLast 5 entries:');
    data.dailyBurns.slice(-5).forEach((d, i) => {
      console.log(`[${data.dailyBurns.length - 5 + i}] ${d.date} - ${d.amountTinc.toFixed(2)} TINC`);
    });
    
    // Simulate what the chart component does
    console.log('\n=== CHART LABEL GENERATION ===');
    const labels = data.dailyBurns.map(d => {
      const [year, month, day] = d.date.split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    });
    
    console.log('Last 5 labels:', labels.slice(-5));
    
    // Check data array length vs labels
    console.log('\n=== ARRAY LENGTHS ===');
    console.log('Data points:', data.dailyBurns.length);
    console.log('Labels generated:', labels.length);
    console.log('Data values:', data.dailyBurns.map(d => d.amountTinc).length);
    
    // Check if there's any filtering happening
    console.log('\n=== DATE RANGE ===');
    console.log('First date:', data.dailyBurns[0].date);
    console.log('Last date:', data.dailyBurns[data.dailyBurns.length - 1].date);
    console.log('Declared end date:', data.endDate);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugChart();