# Security Audit Report - TINC Burn Tracker

## Critical Findings

### 🔴 EXPOSED SENSITIVE DATA IN GITHUB

The following sensitive credentials are currently exposed in your public GitHub repository:

1. **Vercel Token**: `LtOG0Iq5saMLlDJQWhrw1eHH`
   - Found in 25+ JavaScript files
   - Hardcoded in deployment scripts
   - First committed: When maintenance mode was added

2. **Etherscan API Key**: `Z1M3GU25SBHSCM7C2FC19FBXII1SNZVAHB`
   - Found in multiple script files
   - Used for fetching burn data
   - Exposed since initial project setup

3. **GitHub Personal Access Token**: `[REDACTED]`
   - Was in .git/config (now removed)
   - Could have allowed unauthorized repository access

4. **Moralis API Key**: (JWT token)
   - Currently in local .env (safe)
   - Not in git history (good)

## Current State

- ✅ Local .env file exists with all keys
- ✅ .env is properly gitignored
- ✅ GitHub token removed from git config
- ⚠️ Sensitive data still in git history
- ⚠️ Hardcoded values still in current files
- ❌ Vercel doesn't have environment variables set

## Immediate Actions Required

### 1. **Revoke and Regenerate All Exposed Tokens**
   - Go to Vercel.com and revoke token `LtOG0Iq5saMLlDJQWhrw1eHH`
   - Generate new Etherscan API key
   - Revoke GitHub token (already redacted)

### 2. **Add Environment Variables to Vercel**
   Manual steps (since API token lacks scope):
   1. Go to: https://vercel.com/dashboard/project/tinc-burn-tracker/settings/environment-variables
   2. Add these variables:
      - `MORALIS_API_KEY` = (copy from your .env)
      - `ETHERSCAN_API_KEY` = (copy from your .env)
      - `VERCEL_TOKEN` = (your new token after regeneration)
      - `GITHUB_TOKEN` = (optional, for auto-deploy)

### 3. **Clean Git History**
   We need to remove all traces of sensitive data from git history.

## Cleanup Process

### Step 1: Replace Hardcoded Values
```bash
# This will replace all hardcoded tokens with environment variables
chmod +x cleanup-sensitive-data.sh
./cleanup-sensitive-data.sh
```

### Step 2: Clean Git History
```bash
# Remove sensitive data from ALL git history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push to GitHub (this will rewrite history)
git push --force --all
git push --force --tags
```

### Step 3: Verify Deployment
After cleanup, Vercel will auto-deploy. Check:
- https://tincburn.fyi should still work
- Auto-updates should continue functioning

## Prevention Measures

1. **Never hardcode secrets** - Always use environment variables
2. **Use .env.example** - Template without real values
3. **Regular audits** - Check for exposed secrets periodically
4. **Token rotation** - Change tokens every 90 days
5. **Minimal permissions** - Use tokens with least required access

## Files Affected

Total files with hardcoded secrets: **31 files**

Primary locations:
- All deployment scripts (deploy-*.js)
- All setup scripts (setup-*.js)
- Scripts in /scripts directory
- Connection and configuration files

## Risk Assessment

- **Severity**: HIGH
- **Exposure Duration**: Several weeks/months
- **Potential Impact**: 
  - Unauthorized Vercel deployments
  - API rate limit abuse
  - Repository access (if GitHub token was used)

## Recommended Timeline

1. **NOW**: Add env vars to Vercel manually
2. **TODAY**: Revoke and regenerate all tokens
3. **TODAY**: Run cleanup scripts
4. **THIS WEEK**: Monitor for any deployment issues
5. **ONGOING**: Implement prevention measures

## Verification Steps

After cleanup, verify:
```bash
# Check no secrets in current files
grep -r "LtOG0Iq5saMLlDJQWhrw1eHH" . --exclude-dir=node_modules
grep -r "Z1M3GU25SBHSCM7C2FC19FBXII1SNZVAHB" . --exclude-dir=node_modules

# Verify site still works
curl https://tincburn.fyi

# Check auto-updates continue
tail -f logs/auto-update.log
```

## Support

If deployment breaks after cleanup:
1. Ensure all env vars are set in Vercel dashboard
2. Trigger manual deployment from Vercel
3. Check deployment logs for missing variables

Your code will continue working perfectly - this only removes the security risk!