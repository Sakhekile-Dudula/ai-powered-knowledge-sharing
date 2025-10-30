# ✅ Implementation Checklist - Advanced AI Features

Use this checklist to implement the new features step by step.

## 📦 Phase 1: Installation & Setup (30 minutes)

### Dependencies
- [ ] Run `npm install @microsoft/microsoft-graph-client date-fns`
- [ ] Verify package.json includes `@microsoft/microsoft-graph-client`
- [ ] Run `npm install` to install all dependencies

### Database Migration
- [ ] Navigate to Supabase dashboard
- [ ] Go to SQL Editor
- [ ] Copy contents of `supabase/migrations/20251029_advanced_ai_features.sql`
- [ ] Execute migration
- [ ] Verify 6 new tables created:
  - [ ] `smart_notifications`
  - [ ] `ai_connection_suggestions`
  - [ ] `notification_preferences`
  - [ ] `work_pattern_analysis`
  - [ ] `activity_log`
  - [ ] `project_members`

### Enable Real-time
- [ ] Go to Database → Replication
- [ ] Enable real-time for `smart_notifications`
- [ ] Enable real-time for `ai_connection_suggestions`

---

## 🔐 Phase 2: Microsoft Graph API Setup (45 minutes)

### Azure AD App Registration
- [ ] Go to [Azure Portal](https://portal.azure.com)
- [ ] Navigate to Azure Active Directory → App registrations
- [ ] Click "New registration"
- [ ] Name: `MRI Synapse Knowledge Sharing`
- [ ] Supported account types: `Single tenant`
- [ ] Redirect URI: `https://your-app-url.com/auth/callback`
- [ ] Click "Register"
- [ ] **Copy Application (client) ID**: `_________________`
- [ ] **Copy Directory (tenant) ID**: `_________________`

### API Permissions
- [ ] Go to API permissions
- [ ] Click "Add a permission" → Microsoft Graph → Delegated permissions
- [ ] Add these permissions:
  - [ ] `User.Read`
  - [ ] `Calendars.ReadWrite`
  - [ ] `OnlineMeetings.ReadWrite`
  - [ ] `Presence.Read`
  - [ ] `Presence.Read.All`
  - [ ] `Chat.ReadWrite`
- [ ] Click "Grant admin consent for [Your Org]"
- [ ] Verify all permissions show green checkmarks

### Client Secret
- [ ] Go to Certificates & secrets
- [ ] Click "New client secret"
- [ ] Description: `MRI Synapse API Key`
- [ ] Expires: `24 months`
- [ ] Click "Add"
- [ ] **Copy secret VALUE immediately**: `_________________`

### Environment Variables
- [ ] Create/update `.env.local` file
- [ ] Add these variables:
```env
VITE_GRAPH_CLIENT_ID=your-client-id-here
VITE_GRAPH_TENANT_ID=your-tenant-id-here
VITE_GRAPH_CLIENT_SECRET=your-secret-here
VITE_GRAPH_REDIRECT_URI=https://your-app.com/auth/callback
```
- [ ] Save file
- [ ] Restart development server: `npm run dev`

---

## 🧩 Phase 3: Component Integration (1 hour)

### Dashboard - Smart Connections
- [ ] Open `src/components/Dashboard.tsx`
- [ ] Add import: `import { SmartConnectionsWidget } from './SmartConnectionsWidget';`
- [ ] Add widget to dashboard (see ADVANCED_AI_SETUP_GUIDE.md for exact code)
- [ ] Test: Should see "AI Connection Suggestions" widget

### Expert Finder - Presence Indicators
- [ ] Open `src/components/ExpertFinder.tsx`
- [ ] Add import: `import { PresenceIndicator } from './PresenceIndicator';`
- [ ] Add presence dots next to expert names (see setup guide)
- [ ] Test: Should see colored dots (green/red/yellow/gray)

### Messages - Meeting Scheduler
- [ ] Open `src/components/Messages.tsx`
- [ ] Add import: `import { MeetingScheduler } from './MeetingScheduler';`
- [ ] Add "Schedule Meeting" button
- [ ] Add MeetingScheduler component
- [ ] Test: Click button → dialog opens → can create meeting

### App - Notifications Tab
- [ ] Open `src/App.tsx`
- [ ] Add import: `import { SmartNotificationsPanel } from './components/SmartNotificationsPanel';`
- [ ] Add 'notifications' tab to tabs array
- [ ] Add tab content rendering
- [ ] Test: New "Notifications" tab appears in navigation

---

## 🧪 Phase 4: Testing (30 minutes)

### Test 1: Presence Detection
- [ ] Open app in browser
- [ ] Navigate to Expert Finder
- [ ] Expected: Colored dots next to user names
- [ ] If Graph API not configured: All show gray (Offline) - OK
- [ ] If Graph API configured: Shows real presence

### Test 2: Meeting Scheduler
- [ ] Go to Messages
- [ ] Start conversation with someone
- [ ] Click "Schedule Meeting" (if added)
- [ ] Fill in meeting details
- [ ] Click "Create Meeting"
- [ ] Expected: Success message + Teams meeting link
- [ ] Alternative: Click link → Teams opens

### Test 3: Smart Connection Suggestions
- [ ] Go to Dashboard
- [ ] Look for "Smart Connections" widget
- [ ] Expected: Shows "No suggestions" initially (normal)
- [ ] Create some projects with tags
- [ ] Add expertise to profiles
- [ ] Wait 1-2 minutes
- [ ] Refresh page
- [ ] Expected: Suggestions appear (if enough data)

### Test 4: Smart Notifications
- [ ] Click "Notifications" tab
- [ ] Expected: Empty state message
- [ ] Create a project with tags: `react, dashboard, ui`
- [ ] Have another user create similar project
- [ ] Expected: Notification appears automatically

### Test 5: Similar Work Detection
- [ ] User A creates knowledge item: "React Hooks Best Practices"
- [ ] User B creates knowledge item: "React Hooks Guide"
- [ ] Expected: User B gets notification about User A's similar content

---

## 🔄 Phase 5: Background Jobs (Optional - 15 minutes)

### Setup Cron Job
- [ ] If using Vercel:
  - [ ] Create `api/cron/analyzePatterns.ts`
  - [ ] Add cron config to `vercel.json`
- [ ] If using Azure Functions:
  - [ ] Create timer-triggered function
  - [ ] Schedule: Every hour
- [ ] Test: Run manually first
- [ ] Verify: Check `ai_connection_suggestions` table for new rows

---

## 📊 Phase 6: Monitoring (15 minutes)

### Database Checks
- [ ] Run in Supabase SQL Editor:
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%smart%' OR table_name LIKE '%ai_%';

-- Check notification count
SELECT COUNT(*) FROM smart_notifications;

-- Check suggestion count
SELECT COUNT(*) FROM ai_connection_suggestions;

-- Check activity log
SELECT COUNT(*) FROM activity_log;
```

### Console Checks
- [ ] Open browser console (F12)
- [ ] Look for errors
- [ ] Should see: "Graph API initialized successfully" OR "Graph API not configured" (both OK)
- [ ] No red errors should appear

### Feature Flags
- [ ] Test app WITHOUT Graph API configured
  - [ ] Features should gracefully degrade
  - [ ] Presence shows "Offline"
  - [ ] Meeting scheduler shows error message
- [ ] Test app WITH Graph API configured
  - [ ] All features work fully

---

## 📚 Phase 7: Documentation (10 minutes)

### User Documentation
- [ ] Read `ADVANCED_AI_SETUP_GUIDE.md`
- [ ] Read `ADVANCED_AI_FEATURES_SUMMARY.md`
- [ ] Create quick-start guide for end users
- [ ] Share with team

### Admin Documentation
- [ ] Document your Azure AD app credentials (securely!)
- [ ] Save environment variables in password manager
- [ ] Document cron job setup
- [ ] Create runbook for troubleshooting

---

## 🎯 Success Criteria

After completing all phases, you should have:

✅ **Working Features:**
- [ ] Presence indicators show user availability
- [ ] Meeting scheduler creates Teams meetings
- [ ] Smart suggestions appear in dashboard
- [ ] Notifications alert about similar work

✅ **Database:**
- [ ] All 6 new tables created
- [ ] Real-time enabled
- [ ] RLS policies active

✅ **Integration:**
- [ ] Graph API connected (or gracefully degraded)
- [ ] No console errors
- [ ] All components load correctly

✅ **Documentation:**
- [ ] Setup guide complete
- [ ] Team trained
- [ ] Credentials secured

---

## 🚨 Troubleshooting Quick Reference

### Issue: "Cannot find module @microsoft/microsoft-graph-client"
**Fix:** Run `npm install @microsoft/microsoft-graph-client`

### Issue: "Graph API not initialized"
**Fix:** Check `.env.local` has all 4 Graph variables, restart dev server

### Issue: Presence shows "Offline" for everyone
**Fix:** Normal if Graph API not configured. Check Azure AD permissions if configured.

### Issue: No smart suggestions appearing
**Fix:** Normal initially. Need users to:
1. Fill in profile expertise
2. Create projects with tags
3. Share knowledge items
4. Wait for background analysis (or run manually)

### Issue: Database migration fails
**Fix:** Check if tables already exist. Drop and recreate if needed.

### Issue: Real-time not working
**Fix:** 
1. Enable in Supabase dashboard
2. Check browser console for WebSocket errors
3. Verify RLS policies allow reads

---

## 📞 Support Resources

- **Setup Guide:** `ADVANCED_AI_SETUP_GUIDE.md`
- **Feature Summary:** `ADVANCED_AI_FEATURES_SUMMARY.md`
- **Graph API Docs:** https://docs.microsoft.com/en-us/graph/
- **Supabase Docs:** https://supabase.com/docs
- **MSAL Docs:** https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-overview

---

## ✅ Final Check

Before going to production:

- [ ] All tests passing
- [ ] No console errors
- [ ] Graph API working OR gracefully degraded
- [ ] Database migration applied
- [ ] Real-time enabled
- [ ] Environment variables set
- [ ] Background jobs scheduled
- [ ] Team trained
- [ ] Documentation complete
- [ ] Monitoring set up

---

**Ready to deploy? You're all set!** 🚀

**Estimated Total Time:** 3-4 hours
**Difficulty:** Medium
**Impact:** High - transforms app to match MRI Synapse proposal
