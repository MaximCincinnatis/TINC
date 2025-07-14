let burnChart = null;
let cachedData = null;

async function fetchBurnData(mode = 'cached') {
    try {
        let url;
        switch(mode) {
            case 'full':
                url = '/api/burns?refresh=true';
                break;
            case 'incremental':
                url = '/api/burns/incremental';
                break;
            default:
                url = '/api/burns';
        }
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.status === 'success') {
            cachedData = result.data;
            return result.data;
        } else {
            throw new Error(result.message || 'Failed to fetch burn data');
        }
    } catch (error) {
        console.error('Error fetching burn data:', error);
        throw error;
    }
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
}

function updateStats(data) {
    // Calculate statistics
    const totalBurned = data.total_burned;
    const dailyBurns = data.daily_burns.map(d => d.amount_tinc);
    const avgDailyBurn = dailyBurns.length > 0 ? totalBurned / dailyBurns.length : 0;
    const maxDailyBurn = Math.max(...dailyBurns, 0);
    const totalTransactions = data.daily_burns.reduce((sum, d) => sum + d.transaction_count, 0);
    
    // Update DOM
    document.getElementById('totalBurned').textContent = formatNumber(totalBurned);
    document.getElementById('avgDailyBurn').textContent = formatNumber(avgDailyBurn);
    document.getElementById('maxDailyBurn').textContent = formatNumber(maxDailyBurn);
    document.getElementById('totalTransactions').textContent = totalTransactions.toLocaleString();
}

function createChart(data) {
    const ctx = document.getElementById('burnChart').getContext('2d');
    
    // Prepare data
    const labels = data.daily_burns.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    const burnAmounts = data.daily_burns.map(d => d.amount_tinc);
    
    // Destroy existing chart if any
    if (burnChart) {
        burnChart.destroy();
    }
    
    // Create new chart
    burnChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'TINC Burned',
                data: burnAmounts,
                backgroundColor: 'rgba(255, 107, 107, 0.8)',
                borderColor: 'rgba(255, 107, 107, 1)',
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Daily TINC Burns (Last 15 Days)',
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed.y;
                            const dayData = data.daily_burns[context.dataIndex];
                            return [
                                `Burned: ${formatNumber(value)} TINC`,
                                `Transactions: ${dayData.transaction_count}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'TINC Burned'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatNumber(value);
                        }
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });
}

async function updateDashboard(mode = 'cached') {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const contentEl = document.getElementById('content');
    const quickBtn = document.getElementById('quickRefreshBtn');
    const fullBtn = document.getElementById('fullRefreshBtn');
    
    try {
        // Disable buttons during refresh
        quickBtn.disabled = true;
        fullBtn.disabled = true;
        
        // Show loading only if no content visible
        if (contentEl.style.display === 'none') {
            loadingEl.style.display = 'block';
        }
        errorEl.style.display = 'none';
        
        // Fetch data
        const data = await fetchBurnData(mode);
        
        // Update stats
        updateStats(data);
        
        // Create chart
        createChart(data);
        
        // Update last updated time
        const lastUpdated = new Date(data.fetched_at);
        document.getElementById('lastUpdated').textContent = lastUpdated.toLocaleString();
        
        // Show content
        loadingEl.style.display = 'none';
        contentEl.style.display = 'block';
        
    } catch (error) {
        // Show error
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
        errorEl.textContent = `Error: ${error.message}`;
    } finally {
        // Re-enable buttons
        quickBtn.disabled = false;
        fullBtn.disabled = false;
    }
}

// Manual refresh functions
async function quickRefresh() {
    // Quick refresh - get incremental updates only
    await updateDashboard('incremental');
}

async function fullRefresh() {
    // Full refresh - force complete data reload
    await updateDashboard('full');
}

// Initialize dashboard
updateDashboard();