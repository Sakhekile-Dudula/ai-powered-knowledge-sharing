# Real-time Activity Tracking Setup

## What This Does

This migration enables **automatic activity tracking** throughout your application. Now the "Recent Activity" section will show:

- ✅ **Knowledge shared** - When users create knowledge items
- ✅ **Questions asked** - When users post questions
- ✅ **Answers provided** - When users answer questions
- ✅ **Connections made** - When users connect with each other
- ✅ **Messages sent** - When users send messages
- ✅ **Content updated** - When users edit knowledge items

---

## How to Apply This Migration

### Option 1: Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - https://app.supabase.com

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar

3. **Copy and paste this migration**
   - Open file: `supabase/migrations/38_realtime_activity_tracking.sql`
   - Copy all the SQL code
   - Paste into SQL Editor

4. **Click "Run"**
   - Migration will create triggers and functions
   - Activities will start being tracked automatically!

5. **Verify it worked**
   - Perform some actions in your app (create knowledge, ask questions, etc.)
   - Check `activity_log` table: Database → Tables → activity_log
   - You should see new rows appearing

---

### Option 2: Supabase CLI (Advanced)

```bash
# Make sure Supabase CLI is running
npx supabase db push

# Or deploy specific migration
npx supabase migration up
```

---

## What Gets Tracked Automatically

### Knowledge Items
- **Event:** User creates or updates knowledge item
- **Shows as:** "John Doe shared React Best Practices"

### Questions
- **Event:** User asks a question
- **Shows as:** "Jane Smith asked How to optimize queries?"

### Answers
- **Event:** User answers a question
- **Shows as:** "Mike Johnson answered Database Performance Tips"

### Connections
- **Event:** User connects with someone
- **Shows as:** "Sarah Lee connected with Alex Chen"

### Messages
- **Event:** User sends a message
- **Shows as:** "David Brown messaged Sarah Martinez"

---

## Manual Activity Logging

You can also manually log custom activities using the utility functions:

```typescript
import { 
  logActivity,
  logKnowledgeShared,
  logQuestionAsked,
  logSearch,
  logBookmark 
} from '@/utils/activityLogger';

// Log custom activity
await logActivity({
  action: 'completed',
  topic: 'TypeScript Training Course',
  entityType: 'course',
  entityId: 123
});

// Log knowledge sharing
await logKnowledgeShared('React Hooks Guide', knowledgeItemId);

// Log search
await logSearch('machine learning algorithms');

// Log bookmark
await logBookmark('API Documentation', itemId);
```

---

## Testing the Activity Feed

After applying the migration:

1. **Create a Knowledge Item**
   - Go to Knowledge Search
   - Click "Share Knowledge"
   - Fill out form and submit
   - ✅ Should appear in Recent Activity

2. **Ask a Question**
   - Go to Q&A tab
   - Click "Ask Question"
   - Submit question
   - ✅ Should appear in Recent Activity

3. **Connect with Someone**
   - Go to Experts tab
   - Click "Connect" on an expert
   - ✅ Should appear in Recent Activity

4. **Send a Message**
   - Go to Messages tab
   - Message someone
   - ✅ Should appear in Recent Activity

---

## Viewing Activity in Dashboard

The Recent Activity section will now show:

```
[Avatar] John Doe shared React Best Practices
         2 minutes ago

[Avatar] Jane Smith asked How to optimize database queries?
         5 minutes ago

[Avatar] Mike Johnson connected with Sarah Lee
         10 minutes ago
```

Each activity is clickable and shows:
- User avatar (with initials)
- User name
- Action performed
- Topic/target of action
- Time ago

---

## Database Structure

### Activity Log Table
```sql
activity_log (
  id: serial PRIMARY KEY,
  user_id: uuid REFERENCES profiles(id),
  action: text,           -- 'shared', 'asked', 'answered', etc.
  topic: text,            -- Title of the item/question/etc.
  entity_type: text,      -- 'knowledge_item', 'question', etc.
  entity_id: integer,     -- ID of the related entity
  type: text,             -- 'activity' (for filtering)
  created_at: timestamp
)
```

### Triggers Created
- `trigger_track_knowledge_items` - Auto-log knowledge creation/updates
- `trigger_track_questions` - Auto-log question asks
- `trigger_track_answers` - Auto-log answer submissions
- `trigger_track_connections` - Auto-log user connections
- `trigger_track_messages` - Auto-log message sending

---

## Benefits

✅ **Real-time Updates** - See what's happening across your organization  
✅ **Engagement Tracking** - Know who's active and what they're doing  
✅ **Automatic** - No manual logging needed for most actions  
✅ **Extensible** - Easy to add custom activity types  
✅ **Privacy-Aware** - Only shows activities users choose to perform  

---

## Troubleshooting

### No activities showing up?

**Check 1:** Make sure migration was applied
```sql
-- Run in Supabase SQL Editor
SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'track_knowledge_item_activity'
);
-- Should return true
```

**Check 2:** Check if activities are being logged
```sql
-- Run in Supabase SQL Editor
SELECT * FROM activity_log 
ORDER BY created_at DESC 
LIMIT 10;
-- Should show recent activities
```

**Check 3:** Verify triggers exist
```sql
-- Run in Supabase SQL Editor
SELECT tgname FROM pg_trigger 
WHERE tgname LIKE 'trigger_track%';
-- Should show 5 triggers
```

### Activities not appearing in Dashboard?

**Check:** Dashboard is calling `get_recent_activity()` function
```typescript
// In Dashboard.tsx, should see:
const { data, error } = await supabase.rpc('get_recent_activity');
```

### Want to clear old activities?

```sql
-- Delete activities older than 30 days
DELETE FROM activity_log 
WHERE created_at < NOW() - INTERVAL '30 days';
```

---

## Next Steps

1. ✅ Apply the migration
2. ✅ Test by performing various actions
3. ✅ Watch the Recent Activity feed populate
4. ✅ Enjoy real-time visibility into your team's activities!

---

**Questions?** Check the Supabase dashboard logs for any errors.
