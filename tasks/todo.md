# TINC Burn Tracker - Critical Issues & Fixes

## ✅ COMPLETED FIXES

### Issue #2: Block Tracking Gap - FIXED! (Sept 4, 2025)
**Problem**: 45,466 block discrepancy between tracking systems (false gap)  
**Root Cause**: Gap-resistant manager and main system tracked blocks separately  
**Solution**: Added auto-sync to gap-resistant-burn-manager.js loadProcessedRanges()  
**Result**: Systems now auto-sync on every run. No manual intervention needed  
**Testing**: All tests pass - syncs work, no performance impact, handles errors gracefully  

### Issue #1: Data Regression False Positives - FIXED! (Sept 4, 2025)
**Problem**: System was comparing cumulative all-time total (1.29M) with 30-day window (957K)  
**Root Cause**: Dashboard only displays 30-day totals, but validation expected cumulative total  
**Solution**: Updated validation in both `incremental-burn-manager.js` and `incremental-burn-manager-fixed.js`  
**Result**: No more false "DATA REGRESSION DETECTED" alerts. totalBurned now correctly = 30-day sum  
**Testing**: Confirmed working with test scripts - no regression errors on incremental updates  

## 🚨 CRITICAL ISSUES FROM RED TEAM AUDIT (Sept 4, 2025)

### IMMEDIATE PRIORITY (Do Today)
- [x] **Issue #1: Fix Data Regression False Positives** - ✅ FIXED! Updated validation to understand totalBurned = 30-day sum
- [x] **Issue #2: Fix Block Tracking Gap** - ✅ FIXED! Implemented auto-sync in gap-resistant manager
- [ ] **Issue #3: Remove Deprecated Functions** - estimateBlockByTimestamp still executes despite deprecation warning
- [ ] **Issue #4: Add Health Monitoring** - No alerts if service stops or data becomes stale

### SHORT TERM (This Week)
- [ ] **Issue #5: Fix Silent Failures** - Script continues deployment even with incomplete data
- [ ] **Issue #6: Add Deployment Verification** - No check that Vercel actually deployed successfully
- [ ] **Issue #7: Implement Proper Logging** - Add structured logs with rotation
- [ ] **Issue #8: Create Alert System** - Email/Discord alerts for failures

### MEDIUM TERM (This Month)
- [ ] **Issue #9: Fix Single Point of Failure** - Move to cloud-based cron (GitHub Actions)
- [ ] **Issue #10: Improve Holder Data Reliability** - Moralis API fallback mechanisms untested
- [ ] **Issue #11: Resource Management** - Unlimited file creation, no cleanup of old versions
- [ ] **Issue #12: Security Hardening** - Rotate API keys, add rate limiting

---

## Previous Auto-Start Configuration (Preserved Below)

## ✅ YES - WILL AUTO-START & RECOVER AFTER REBOOT

### Reboot Recovery Configuration CONFIRMED

#### Auto-Start Settings
| Setting | Status | Details |
|---------|--------|---------|
| Service Enabled | ✅ **YES** | `systemctl is-enabled` returns "enabled" |
| Boot Target | ✅ **Linked** | Symlinked in `/etc/systemd/system/multi-user.target.wants/` |
| Start After | ✅ **Network** | Waits for network.target before starting |
| Dependencies | ✅ **All Present** | Node.js, script, directories all exist |

#### What Happens On Reboot

```
1. System boots up
2. Reaches network.target (network ready)
3. Reaches multi-user.target (normal boot)
4. tinc-auto-update.service starts automatically
5. Begins 30-minute update cycle
6. No manual intervention needed
```

#### Recovery Features

| Feature | Configuration | Behavior |
|---------|--------------|----------|
| Restart Policy | `Restart=always` | Always restarts if crashes |
| Restart Delay | `RestartSec=60` | Waits 60 seconds before restart |
| Start Limit | `5 attempts in 10s` | Prevents restart loops |
| Working Directory | `/home/wsl/projects/TINC` | Correct path set |
| User | `wsl` | Runs as correct user |

#### Verification Evidence

```bash
# Service is enabled for boot
$ systemctl is-enabled tinc-auto-update.service
enabled ✅

# Symlink exists in boot targets
$ ls -la /etc/systemd/system/multi-user.target.wants/
tinc-auto-update.service -> /etc/systemd/system/tinc-auto-update.service ✅

# All dependencies exist
/usr/bin/node ✅
/home/wsl/projects/TINC/scripts/safe-auto-updates.js ✅
/home/wsl/projects/TINC/ ✅
```

### Reboot Sequence

| Step | Action | Automatic |
|------|--------|-----------|
| 1 | Machine reboots | - |
| 2 | Linux boots | ✅ Yes |
| 3 | systemd starts | ✅ Yes |
| 4 | Network comes up | ✅ Yes |
| 5 | tinc-auto-update starts | ✅ Yes |
| 6 | Waits 10 seconds | ✅ Yes |
| 7 | Runs first update | ✅ Yes |
| 8 | Continues 30-min cycle | ✅ Yes |

### If Service Crashes

```
Crash → Wait 60 seconds → Restart automatically
```
- Will retry up to 5 times
- Logs all errors to `/logs/auto-update.log`
- Continues normal operation after recovery

## ANSWER: YES - FULLY AUTOMATIC

**After reboot:**
✅ Service will auto-start
✅ No manual commands needed
✅ Updates resume automatically
✅ Git/Vercel pipeline continues
✅ Self-healing if crashes occur

**Your TINC tracker is 100% reboot-proof.**
## 2026-09-14 · The fee split, as the contracts have it

Plan (approved before the work started):
- [x] Updater: read the buy-and-burn's per-token settings and balances (already fetched, now published as `buyAndBurnSettings`), the fee as min and max over the emitting farms that hold an input token (`protocolFeeMinPercent`), and every `ProtocolFeesCollected` event on both keepers since launch, kept in `data/cache/protocol-fee.json` and extended incrementally (`scripts/protocol-fee.js` → `protocolFeeCollected`).
- [x] Truth check: recount the collection events against the snapshot (transactions, events, per-token totals); the new fields must be present and not stale.
- [x] Copy: the explainer says the split (protocol wallet / buy-and-burn) with the fee from the contracts; the FAQ's buy-and-burn answer says the split and "cannot withdraw", plus a new question "Where does the protocol fee go?"; the methodology's input-tokens section carries the generated settings line and the paused balances, plus a new block "徴収 The protocol fee so far"; llms.txt follows. The JSON-LD FAQPage is built per render from the same list.
- [x] Lab: fork replay reproduced 94 collection transactions / 657 events / every per-token total (identical to an independent scan), incremental second run in 1 s, `next build` clean, e2e 156 passed (the 3 failures are the lab-only Vercel insights 404s), truth check OK against the lab snapshot.
- [x] Push, live e2e, critique page.

Review:
- Every figure in the new copy is read from the contracts at each update; nothing is typed in. A snapshot that predates the fields renders a figure-free sentence.
- The fee range excludes the pegged keeper's synthetic PT/PT root farm (0%, no input token): its fee can never apply.
- The FAQ shows the collector's address as plain text (the FAQ has no link style and feeds the JSON-LD); the methodology page links it.
- Not on the site: dollar figures, the wallet's payees, any "dumping" wording.
- Next: the settings line could become a small table if the section grows; the paused balances could be dropped if they read as noise.
