# TINC Dashboard - Manual Update Guide

## Overview

The TINC dashboard now uses Vercel Edge Config for caching, providing instant loading for all users while you control when data updates occur.

## Setup Required

### 1. Vercel Edge Config Setup

1. Go to your Vercel dashboard
2. Navigate to your project → Settings → Edge Config
3. Create a new Edge Config store
4. Copy the Edge Config ID (looks like: `ecfg_abc123...`)

### 2. Environment Variables

Add these to your Vercel project settings:

```
EDGE_CONFIG_ID=ecfg_your_edge_config_id_here
VERCEL_TOKEN=your_vercel_api_token_here
UPDATE_SECRET=your_chosen_secret_password
EDGE_CONFIG=https://edge-config.vercel.app/ecfg_your_id_here?token=your_token
```

**How to get VERCEL_TOKEN:**
1. Go to Vercel Settings → Tokens
2. Create new token with appropriate permissions
3. Copy the token value

## Manual Update Methods

### Method 1: Admin Panel (Web UI)

1. Visit your dashboard
2. Click the ⚙️ gear icon in the top-right
3. Enter your `UPDATE_SECRET` password
4. Click "Update Data"

### Method 2: Direct API Call (cURL)

```bash
curl -X POST https://your-dashboard-url.vercel.app/api/update-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET_KEY"
```

### Method 3: Automated Script

Create `update-tinc.sh`:

```bash
#!/bin/bash
SECRET="your_secret_here"
URL="https://your-dashboard-url.vercel.app"

echo "Updating TINC data..."
response=$(curl -s -X POST "$URL/api/update-data" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SECRET")

echo "$response"
```

## Benefits of New System

✅ **Instant Loading**: All users get data in <100ms  
✅ **Cost Efficient**: Only 1 RPC call per update instead of 1000s  
✅ **Controlled Updates**: You decide when to refresh data  
✅ **Fallback Safety**: Falls back to direct RPC if cache fails  
✅ **Free Hosting**: Uses Vercel's free Edge Config tier  

## Troubleshooting

### "Unauthorized" Error
- Check your `UPDATE_SECRET` environment variable
- Ensure you're using the correct secret key

### "Edge Config Not Found"
- Verify `EDGE_CONFIG_ID` is correct
- Check `VERCEL_TOKEN` has proper permissions
- Ensure Edge Config is created in correct Vercel project

### Data Not Updating
- Check Vercel function logs for errors
- Verify RPC endpoints are responding
- Try manual API call to see error details

## Update Frequency Recommendations

- **Peak Usage**: Update every 2-4 hours
- **Normal Times**: Update 2-3 times per day
- **Low Activity**: Update once daily

## Security Notes

- Keep `UPDATE_SECRET` private and strong
- Rotate `VERCEL_TOKEN` periodically
- Monitor function usage in Vercel dashboard