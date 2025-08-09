#!/usr/bin/env python3

import json
from datetime import datetime, timedelta

# Load the burn summary we created
with open('/tmp/burn-summary.json', 'r') as f:
    summary = json.load(f)

# Load existing burn data to preserve holder stats
with open('/home/wsl/projects/TINC/data/burn-data.json', 'r') as f:
    existing = json.load(f)

# Create daily burns array for last 30 days
daily_burns = []
for i in range(30):
    date = (datetime.now() - timedelta(days=29-i)).strftime('%Y-%m-%d')
    if date in summary['daily_burns']:
        day_data = summary['daily_burns'][date]
        daily_burns.append({
            'date': date,
            'amountTinc': day_data['total'],
            'transactionCount': day_data['count'],
            'transactions': []  # We'll keep this empty for now to save space
        })
    else:
        daily_burns.append({
            'date': date,
            'amountTinc': 0,
            'transactionCount': 0,
            'transactions': []
        })

# Calculate totals
total_30d = sum(d['amountTinc'] for d in daily_burns)

# Update the data structure
updated = {
    'startDate': daily_burns[0]['date'],
    'endDate': daily_burns[-1]['date'],
    'totalBurned': total_30d,
    'totalSupply': existing['totalSupply'],
    'burnPercentage': (total_30d / existing['totalSupply']) * 100,
    'emissionPerSecond': 1.0,
    'emissionSamplePeriod': 86400,
    'isDeflationary': total_30d > (1.0 * 86400 * 30),
    'dailyBurns': daily_burns,
    'allTimeBurnCount': summary['total_burns'],
    'fetchedAt': datetime.now().isoformat(),
    'fromCache': False,
    'dataSource': 'etherscan_verified',
    'holderStats': existing.get('holderStats', {})
}

# Save the updated data
with open('/home/wsl/projects/TINC/data/burn-data.json', 'w') as f:
    json.dump(updated, f, indent=2)

# Also update public data if it exists
import os
public_path = '/home/wsl/projects/TINC/public/data/burn-data.json'
if os.path.exists(os.path.dirname(public_path)):
    with open(public_path, 'w') as f:
        json.dump(updated, f, indent=2)

print(f"✅ Successfully updated burn data!")
print(f"📊 30-day total: {total_30d:,.2f} TINC")
print(f"🔥 Burn rate: {updated['burnPercentage']:.2f}% of supply")
print(f"📈 Deflationary: {'Yes' if updated['isDeflationary'] else 'No'}")
print(f"\n📅 Last 7 days:")
for day in daily_burns[-7:]:
    status = '🔥' if day['amountTinc'] > 0 else '  '
    print(f"  {status} {day['date']}: {day['amountTinc']:,.2f} TINC ({day['transactionCount']} txs)")