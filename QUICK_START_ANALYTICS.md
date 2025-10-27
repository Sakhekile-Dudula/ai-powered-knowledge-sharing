# 🚀 Quick Start Guide - Enhanced Analytics

## 📋 Checklist

Follow these steps in order:

### ✅ Step 1: Run the SQL Migration

**Where to go:**
1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **+ New Query**

**What to do:**
1. Open this file in VS Code: `supabase/migrations/18_enhanced_analytics.sql`
2. Press `Ctrl+A` (Windows) or `Cmd+A` (Mac) to select all
3. Press `Ctrl+C` (Windows) or `Cmd+C` (Mac) to copy
4. Go back to Supabase SQL Editor
5. Paste the SQL code
6. Click **RUN** button (or press `Ctrl+Enter`)

**Expected result:**
```
Success. No rows returned
```

**If you see errors:** Check that you've run migrations 00-17 first.

---

### ✅ Step 2: View the Analytics Dashboard

**In your application:**
1. Make sure your dev server is running:
   ```bash
   npm run dev
   ```
2. Open your browser to `http://localhost:3000`
3. Log in to your account
4. Click the **Insights** tab (💡 icon)
5. Click the **Analytics** sub-tab

**What you'll see:**
- 📊 KPI cards at the top
- 📈 Charts organized in tabs:
  - **Overview**: Activity timeline + user engagement
  - **Contributors**: Top 10 leaderboard
  - **Skills**: Distribution charts
  - **Trends**: Trending topics

---

### ✅ Step 3: Add Test Data (If Empty)

If all your charts show zero, you need to add some data:

1. **Ask Questions** (Q&A tab):
   - Click "Ask Question"
   - Add a title and description
   - Add tags like "React", "TypeScript", "Database"
   - Submit

2. **Post Answers**:
   - Click on a question
   - Write an answer
   - Submit

3. **Upvote Content**:
   - Click the ⬆️ upvote button on good answers
   - Gives users reputation points

4. **Create Connections** (Experts tab):
   - Search for users
   - Click "Connect" on their profile

5. **Add Expertise** (Profile):
   - Sign out and sign in
   - During registration, add skills separated by commas
   - Example: "React, TypeScript, Node.js, PostgreSQL"

6. **Refresh Analytics**:
   - Go back to Insights → Analytics
   - Refresh the page
   - Charts should now show data!

---

## 🎯 What Each Metric Means

### **KPI Cards (Top Row)**

1. **Total Users** 
   - Count of all registered users
   - Badge shows % active in last 7 days

2. **Questions Asked**
   - Total questions posted
   - Badge shows answer rate %

3. **Knowledge Items**
   - Number of shared resources/documents
   - Badge shows "Growing" status

4. **Active Connections**
   - Accepted user connections
   - Badge shows avg response time

### **Charts Explained**

**📈 Activity Timeline** (Line Chart)
- Shows daily trend over 30 days
- 3 lines: Questions (blue), Answers (green), Knowledge (purple)
- Hover to see exact counts per day

**🥧 User Engagement** (Doughnut Chart)
- Green: Active last 7 days
- Blue: Active last 30 days (but not last 7)
- Gray: Inactive (no activity in 30 days)

**🏆 Top Contributors** (Leaderboard)
- Ranked by reputation score
- Shows answers, accepted answers, knowledge items
- Top 3 get special badges and award icons

**📊 Skills Distribution** (Bar Chart)
- Top 10 most common skills
- Sorted by number of users who have that skill
- Colorful gradient bars

**🔥 Trending Topics** (Grid)
- Tags mentioned most in last 7 days
- Icons show trend:
  - 🔺 Rising (green) - 20%+ increase
  - 🔻 Falling (red) - 20%+ decrease
  - ➡️ Stable (blue) - within ±20%
- Ranked by mention count

---

## 🏆 Reputation System

Users earn points for contributions:

| Action | Points Earned |
|--------|---------------|
| Post an answer | +5 |
| Answer gets accepted | +15 bonus |
| Create knowledge item | +10 |
| Receive an upvote | +2 |

**Example:**
- User posts 10 answers = 50 points
- 3 get accepted = +45 points
- Gets 20 upvotes = +40 points
- Total: **135 reputation**

---

## ❓ Troubleshooting

### **Problem: Charts not showing**

**Solution:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for red errors
4. If you see "chart.js not found":
   ```bash
   npm install chart.js react-chartjs-2 --legacy-peer-deps
   ```

### **Problem: "Function does not exist" error**

**Solution:**
- You haven't run the SQL migration yet
- Go back to Step 1 and run `18_enhanced_analytics.sql`

### **Problem: All zeros/empty charts**

**Solution:**
- Your database is empty (normal for new projects)
- Follow Step 3 to add test data
- OR import sample data if available

### **Problem: Analytics tab not appearing**

**Solution:**
1. Make sure you're on the Insights tab
2. Look for two sub-tabs: "Insights" and "Analytics"
3. If not there, check browser console for React errors
4. Try refreshing the page (F5)

---

## 📱 Mobile View

The analytics dashboard is fully responsive:
- KPI cards stack vertically on small screens
- Charts resize to fit screen width
- Tabs work on mobile
- Leaderboard items stack nicely

Test it by resizing your browser window!

---

## 🎉 You're Done!

Once you see the charts with data, you have successfully implemented:

✅ Advanced Analytics Dashboard
✅ Real-time metrics tracking
✅ Reputation-based leaderboards
✅ Trending topics analysis
✅ Interactive visualizations
✅ Responsive design

**Next steps:**
- Share with your team
- Monitor engagement trends
- Reward top contributors
- Identify knowledge gaps
- Plan team activities

Enjoy your new analytics dashboard! 🚀📊
