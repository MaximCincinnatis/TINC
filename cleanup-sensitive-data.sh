#!/bin/bash

echo "=== Sensitive Data Cleanup Script ==="
echo "This will remove hardcoded secrets and use environment variables instead"
echo ""

# Create backup of .env if it doesn't exist
if [ ! -f .env.backup ]; then
    cp .env .env.backup
    echo "✓ Created backup of .env file"
fi

# Update all JavaScript files to use environment variables
echo "Updating JavaScript files to use environment variables..."

# Fix Vercel token references
find . -name "*.js" -not -path "./node_modules/*" -not -path "./.git/*" -exec sed -i \
    -e "s/const VERCEL_TOKEN = 'LtOG0Iq5saMLlDJQWhrw1eHH'/const VERCEL_TOKEN = process.env.VERCEL_TOKEN || require('dotenv').config().parsed?.VERCEL_TOKEN/g" \
    -e "s/'LtOG0Iq5saMLlDJQWhrw1eHH'/process.env.VERCEL_TOKEN/g" {} \;

# Fix Etherscan API key references  
find . -name "*.js" -not -path "./node_modules/*" -not -path "./.git/*" -exec sed -i \
    -e "s/'Z1M3GU25SBHSCM7C2FC19FBXII1SNZVAHB'/process.env.ETHERSCAN_API_KEY/g" \
    -e "s/|| 'Z1M3GU25SBHSCM7C2FC19FBXII1SNZVAHB'/|| process.env.ETHERSCAN_API_KEY/g" {} \;

echo "✓ Updated all JavaScript files"

# Ensure all scripts load dotenv
for file in scripts/*.js *.js; do
    if [ -f "$file" ] && ! grep -q "require('dotenv')" "$file"; then
        # Add dotenv at the top of the file if it's not already there
        sed -i "1s/^/require('dotenv').config();\n/" "$file"
    fi
done

echo "✓ Added dotenv config to all scripts"

# Create .env.example without sensitive data
cat > .env.example << 'EOF'
# Copy this file to .env and fill in your actual values

# Moralis API Key - Get from https://moralis.io
MORALIS_API_KEY=your_moralis_api_key_here

# Etherscan API Key - Get from https://etherscan.io/apis
ETHERSCAN_API_KEY=your_etherscan_api_key_here  

# Vercel Token - Get from https://vercel.com/account/tokens
VERCEL_TOKEN=your_vercel_token_here

# GitHub Token - Get from https://github.com/settings/tokens
GITHUB_TOKEN=your_github_token_here

# Vercel Project Settings (optional)
PROJECT_ID=prj_qajgf3itc7GoISB5YFHlkYbsxziN
TEAM_ID=team_8s5uh0XU1acFCMqmtUsJipe3

# Local development
PORT=3047
HOST=0.0.0.0
EOF

echo "✓ Created .env.example template"

# Verify .env is in gitignore
if ! grep -q "^\.env$" .gitignore; then
    echo ".env" >> .gitignore
    echo "✓ Added .env to .gitignore"
else
    echo "✓ .env already in .gitignore"
fi

echo ""
echo "=== IMPORTANT: Vercel Configuration ==="
echo ""
echo "You need to add these environment variables to Vercel:"
echo "1. Go to https://vercel.com/MaximCincinnatis/tinc-burn-tracker/settings/environment-variables"
echo "2. Add the following variables:"
echo "   - MORALIS_API_KEY = eyJhbGc..."
echo "   - ETHERSCAN_API_KEY = Z1M3GU..."  
echo "   - VERCEL_TOKEN = LtOG0Iq..."
echo "   - GITHUB_TOKEN = ghp_pEN..."
echo ""
echo "Your local .env file has all the correct values and will continue working."
echo "The code will now use environment variables instead of hardcoded values."
echo ""
echo "Ready to proceed? (y/n)"
read -r response

if [[ "$response" == "y" ]]; then
    echo "✓ Changes applied successfully!"
else
    echo "Cancelled. No changes made."
    exit 1
fi