# Messaging Connection Filter Update

## Overview
This update restricts messaging to only allow conversations between users who have accepted connections.

## Changes Made

### 1. Database Migration (32_filter_conversations_by_connections.sql)
Updated the `get_user_conversations` function to only return conversations with users who have an accepted connection (`status = 'connected'`).

**To apply this migration:**
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Open and run `supabase/migrations/32_filter_conversations_by_connections.sql`

### 2. Frontend Update (Messages.tsx)
Added connection validation to `startNewConversation` function:
- Checks if users are connected before allowing a new conversation
- Shows helpful error message: "You must connect with this user first. Visit the Experts tab to send a connection request."
- Prevents messaging users you haven't connected with

## How to Deploy

### Option 1: Manual SQL Update (Recommended)
1. Log into Supabase Dashboard
2. Go to SQL Editor
3. Copy contents of `supabase/migrations/32_filter_conversations_by_connections.sql`
4. Run the SQL query
5. Deploy frontend changes: `npm run deploy`

### Option 2: Link Supabase Project
If you want to use CLI:
```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
npm run deploy
```

## What Users Will Experience

### Before:
- Users could message anyone in the system
- Conversation list showed all conversations

### After:
- Users can only message people they're connected with
- Conversation list only shows conversations with connected users
- Attempting to message a non-connected user shows: "You must connect with this user first. Visit the Experts tab to send a connection request."

## Testing

1. **Test existing conversations:**
   - Conversations with connected users should still appear
   - Conversations should work normally

2. **Test new conversation:**
   - Try messaging a non-connected user → Should show error
   - Connect with a user first → Should allow messaging

3. **Test conversation list:**
   - Only conversations with connected users should appear
   - Non-connected conversation should be filtered out

## Connection Flow

1. User visits **Experts** tab
2. User finds someone to connect with
3. User sends connection request
4. Other user accepts connection
5. Both users can now message each other in **Messages** tab

## Database Schema Reference

**user_connections table:**
- `user_id`: UUID of user who initiated connection
- `connected_with`: UUID of user being connected with
- `status`: Connection status ('pending', 'connected', 'rejected')
- Created in migration `03_complete_setup.sql`

The connection check is bidirectional:
```sql
(user_id = A AND connected_with = B) OR (user_id = B AND connected_with = A)
```

## Rollback

If you need to revert this change:

1. **Database:** Run the original `get_user_conversations` from `05_messaging_system.sql` (lines 44-87)
2. **Frontend:** Remove the connection check from `startNewConversation` function
