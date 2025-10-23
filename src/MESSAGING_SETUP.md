# MRI Synapse - Messaging System Setup

## Current Status

✅ **The messaging system is fully functional using the Mock API!**

The application currently uses an in-memory mock API for messaging, which allows you to test all messaging features without deploying to Supabase.

## Quick Start (Mock API - Already Active)

The messaging system is ready to use right now:

1. Navigate to the **Messages** tab
2. You'll see sample conversations with experts:
   - Alex Chen (Senior Solutions Architect)
   - Sarah Martinez (Lead Backend Engineer)  
   - Dr. Lisa Thompson (Chief Data Scientist)
3. Click a conversation to view messages
4. Send messages - they'll be stored in memory during your session

### Features Available in Mock Mode

✅ Send and receive messages  
✅ Multiple conversations  
✅ Message history  
✅ Timestamps  
✅ Quick messaging from Expert Finder  
✅ Full Messages page with conversation list

## How It Works

### Mock API Configuration

The mock API is controlled in two files:

**`/components/Messages.tsx`**
```typescript
const USE_MOCK_API = true; // Currently using mock API
```

**`/components/MessagingDialog.tsx`**
```typescript
const USE_MOCK_API = true; // Currently using mock API
```

### Mock API Implementation

Located in `/utils/mockApi.ts`, the mock API provides:

- **In-memory storage** - Messages persist during your session
- **Sample data** - Pre-populated conversations with experts
- **Full messaging logic** - Send, receive, and view messages
- **Network simulation** - Realistic delays for API calls
- **No backend required** - Works immediately without Supabase deployment

## Deploying to Supabase (Optional)

When you're ready to deploy the real backend with persistent data storage:

### Step 1: Prerequisites

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref <your-project-id>
```

### Step 2: Deploy the Edge Function

Use the deployment script:

```bash
cd supabase/functions
chmod +x deploy.sh
./deploy.sh
```

Or manually:

```bash
# Create correct directory structure
mkdir -p supabase/functions/make-server-d5b5d02c
cp supabase/functions/server/index.tsx supabase/functions/make-server-d5b5d02c/
cp supabase/functions/server/kv_store.tsx supabase/functions/make-server-d5b5d02c/

# Deploy
supabase functions deploy make-server-d5b5d02c
```

### Step 3: Switch to Real API

Update both files to use the deployed backend:

**`/components/Messages.tsx`**
```typescript
const USE_MOCK_API = false; // Now using real Supabase
```

**`/components/MessagingDialog.tsx`**
```typescript
const USE_MOCK_API = false; // Now using real Supabase
```

### Step 4: Test

1. Navigate to Messages tab
2. Send a test message
3. Check for success toast notification
4. Messages should now persist in Supabase KV store

## Troubleshooting

### Dialog Warning

**Issue:** Warning about missing `Description` or `aria-describedby`

**Status:** ✅ Fixed - All Dialog components now include proper accessibility attributes

### 404 Error (Only with Real Supabase)

**Issue:** 404 error when sending messages

**Cause:** Edge Function not deployed to Supabase

**Solution:**
1. If using Mock API (default): No action needed - this is expected and the mock API handles everything
2. If using Real API: Follow deployment steps above

### Messages Not Persisting

**With Mock API (current):**
- Messages persist during your browser session
- Refreshing the page will clear messages
- This is expected behavior for the mock API

**With Real Supabase:**
- Messages persist permanently in the KV store
- Available across all sessions and devices

## Architecture

### Mock API (Current Setup)

```
Frontend Components
    ↓
mockApi.ts (In-memory storage)
    ↓
Local JavaScript objects
```

### Real Supabase API

```
Frontend Components
    ↓
Supabase Edge Function (make-server-d5b5d02c)
    ↓
KV Store (Persistent storage)
```

## API Endpoints

### Messaging Endpoints (Backend)

When using real Supabase:

- `GET /make-server-d5b5d02c/conversations` - Get user's conversations
- `GET /make-server-d5b5d02c/messages?recipient=name` - Get messages
- `POST /make-server-d5b5d02c/messages` - Send a message
- `GET /make-server-d5b5d02c/health` - Health check

### Mock API Methods

When using mock API:

- `mockApi.getConversations(currentUserName)` - Get conversations
- `mockApi.getMessages(currentUserName, recipientName)` - Get messages
- `mockApi.sendMessage(userId, userName, recipient, content)` - Send message
- `mockApi.initializeSampleMessages(userName)` - Initialize sample data

## Recommendations

### For Development and Testing
✅ **Use Mock API** (current setup)
- Instant setup
- No deployment needed
- Fast iteration
- Perfect for UI/UX testing

### For Production
✅ **Use Real Supabase**
- Persistent storage
- Multi-user support
- Real-time capabilities
- Scalable

## Next Steps

1. **Continue development** with Mock API (current setup works great!)
2. **Test the UI** - All messaging features are functional
3. **Deploy to Supabase** when ready for production
4. **Switch API mode** by changing `USE_MOCK_API` flag

## Support

- Mock API: `/utils/mockApi.ts`
- Messages Component: `/components/Messages.tsx`
- Messaging Dialog: `/components/MessagingDialog.tsx`
- Supabase Guide: `/supabase/functions/README.md`
- Deployment Script: `/supabase/functions/deploy.sh`

---

**Note:** The messaging system is currently working perfectly with the Mock API. You can use all features immediately without any additional setup!
