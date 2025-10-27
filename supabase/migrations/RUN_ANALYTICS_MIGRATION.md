# Run Enhanced Analytics Migration

To enable the Enhanced Analytics dashboard, you need to run the SQL migration in Supabase.

## Steps:

1. **Open Supabase Dashboard**:
   - Go to your Supabase project: https://supabase.com/dashboard
   - Navigate to your project

2. **Open SQL Editor**:
   - Click on "SQL Editor" in the left sidebar
   - Click "+ New Query"

3. **Copy and Run Migration**:
   - Open the file: `supabase/migrations/18_enhanced_analytics.sql`
   - Copy the ENTIRE contents
   - Paste into the Supabase SQL Editor
   - Click "RUN" button (or press Ctrl+Enter / Cmd+Enter)

4. **Verify Success**:
   - You should see "Success. No rows returned" (views and functions don't return rows)
   - Check for any error messages
   - If errors appear, check that previous migrations (01-17) have been run

5. **Test Analytics Dashboard**:
   - Go to your application
   - Navigate to Insights tab
   - Click on "Analytics" sub-tab
   - You should see charts and metrics

## What This Migration Creates:

### Views:
- `user_analytics` - Per-user metrics and reputation scores
- `department_analytics` - Department-level aggregations

### Functions:
- `get_engagement_metrics()` - Platform-wide KPIs
- `get_trending_topics(days)` - Trending topics with trend indicators
- `get_activity_timeline(days)` - Daily activity for charts
- `get_top_contributors(limit)` - Leaderboard data
- `get_skills_distribution()` - Skills by user count
- `get_department_collaboration()` - Cross-department connections

## Troubleshooting:

**If you get "relation does not exist" errors:**
- Make sure migrations 00-17 have been run first
- Check that tables exist: profiles, questions, answers, votes, user_connections, messages, knowledge_items

**If you get "function already exists" errors:**
- Run this first: `DROP FUNCTION IF EXISTS get_engagement_metrics();` (repeat for each function)
- Then run the full migration again

**If analytics show zero data:**
- This is normal if you have a new database
- Add some test data: Ask questions, post answers, create connections
- Data will populate as users interact with the platform
