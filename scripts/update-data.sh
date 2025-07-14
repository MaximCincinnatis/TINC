#!/bin/bash

echo "🚀 Updating TINC burn data..."

# Generate fresh data
node scripts/fetch-burn-data.js

if [ $? -eq 0 ]; then
    echo "📄 Copying data to public directory..."
    cp data/burn-data.json public/data/
    
    echo "✅ Data update complete!"
    echo "📊 Data is now ready for deployment"
    echo "🔄 Run 'npm run build && npx vercel --prod' to deploy"
else
    echo "❌ Failed to update data"
    exit 1
fi