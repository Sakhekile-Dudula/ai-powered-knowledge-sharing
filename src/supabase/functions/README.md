# MRI Synapse - Supabase Edge Functions Deployment Guide

## Overview

The MRI Synapse application uses Supabase Edge Functions for backend API services. The Edge Function `make-server-d5b5d02c` provides endpoints for authentication, knowledge management, expert finding, projects, insights, and messaging.

## Current Setup

### Mock API (Development Mode)

The application is currently configured to use a **mock API** for development and testing. This allows you to test all features without deploying to Supabase.

**Files:**
- `/utils/mockApi.ts` - Mock API implementation
- Mock mode is controlled by the `USE_MOCK_API` constant in:
  - `/components/Messages.tsx`
  - `/components/MessagingDialog.tsx`

**To switch between mock and real API:**
```typescript
const USE_MOCK_API = true;  // Set to false when deploying to Supabase
```

### Mock API Features

The mock API provides:
- ✅ In-memory message storage
- ✅ Sample conversations with experts
- ✅ Full messaging functionality (send/receive)
- ✅ Network delay simulation
- ✅ No Supabase deployment required

## Deploying to Supabase

When you're ready to deploy the real backend, follow these steps:

### Prerequisites

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref <your-project-ref>
   ```

### File Structure for Deployment

The Edge Function files need to be organized correctly:

```
supabase/
  functions/
    make-server-d5b5d02c/
      index.tsx          (main server file)
      kv_store.tsx       (KV store implementation)
```

**Important:** The directory name `make-server-d5b5d02c` must match the function name being called in the frontend.

### Deployment Steps

1. **Ensure files are in correct location:**
   
   Move files from `supabase/functions/server/` to `supabase/functions/make-server-d5b5d02c/`:
   ```bash
   # From your project root
   mkdir -p supabase/functions/make-server-d5b5d02c
   mv supabase/functions/server/index.tsx supabase/functions/make-server-d5b5d02c/
   mv supabase/functions/server/kv_store.tsx supabase/functions/make-server-d5b5d02c/
   ```

2. **Deploy the Edge Function:**
   ```bash
   supabase functions deploy make-server-d5b5d02c
   ```

3. **Set environment variables** (if needed):
   ```bash
   supabase secrets set MY_SECRET=value
   ```

4. **Verify deployment:**
   ```bash
   supabase functions list
   ```

5. **Test the health endpoint:**
   ```bash
   curl https://<your-project-id>.supabase.co/functions/v1/make-server-d5b5d02c/health \
     -H "Authorization: Bearer <your-anon-key>"
   ```

### Update Frontend to Use Real API

Once deployed, update the mock API flags:

In `/components/Messages.tsx`:
```typescript
const USE_MOCK_API = false; // Switch to real Supabase
```

In `/components/MessagingDialog.tsx`:
```typescript
const USE_MOCK_API = false; // Switch to real Supabase
```

## API Endpoints

### Authentication
- `POST /make-server-d5b5d02c/auth/signup` - Create new user
- `POST /make-server-d5b5d02c/auth/signin` - Sign in user
- `GET /make-server-d5b5d02c/auth/profile` - Get user profile

### Dashboard
- `GET /make-server-d5b5d02c/dashboard/stats` - Get dashboard statistics
- `GET /make-server-d5b5d02c/dashboard/activity` - Get recent activity

### Knowledge Search
- `GET /make-server-d5b5d02c/knowledge/search?q=query&type=all` - Search knowledge base
- `POST /make-server-d5b5d02c/knowledge` - Add knowledge item

### Expert Finder
- `GET /make-server-d5b5d02c/experts` - Get all experts
- `PUT /make-server-d5b5d02c/experts/:id` - Update user profile

### Projects
- `GET /make-server-d5b5d02c/projects` - Get all projects
- `POST /make-server-d5b5d02c/projects` - Create project

### Insights Hub
- `GET /make-server-d5b5d02c/insights` - Get all insights
- `POST /make-server-d5b5d02c/insights` - Create insight
- `POST /make-server-d5b5d02c/insights/:id/like` - Like insight

### Messaging
- `GET /make-server-d5b5d02c/conversations` - Get user's conversations
- `GET /make-server-d5b5d02c/messages?recipient=name` - Get conversation messages
- `POST /make-server-d5b5d02c/messages` - Send a message

### Utilities
- `GET /make-server-d5b5d02c/health` - Health check
- `POST /make-server-d5b5d02c/init-sample-data` - Initialize sample data

## Troubleshooting

### 404 Errors

If you get 404 errors when calling the API:
1. Verify the Edge Function is deployed: `supabase functions list`
2. Check the function name matches: `make-server-d5b5d02c`
3. Ensure your project ID is correct in `/utils/supabase/info.tsx`

### CORS Errors

The Edge Function includes CORS configuration. If you experience CORS issues:
1. Check the origin is set to `"*"` in the CORS middleware
2. Verify `Authorization` header is in `allowHeaders`

### Authentication Errors

If auth fails:
1. Verify your access token is valid
2. Check the `Authorization: Bearer <token>` header format
3. Ensure the token hasn't expired

## Development Workflow

**Recommended approach:**

1. **Start with Mock API** (`USE_MOCK_API = true`)
   - Develop and test UI
   - No backend deployment needed
   - Fast iteration

2. **Deploy to Supabase** when ready for production
   - Follow deployment steps above
   - Switch `USE_MOCK_API = false`
   - Test with real backend

3. **Monitor and Debug**
   - Use Supabase Dashboard → Edge Functions → Logs
   - Check function invocations and errors

## Support

For Supabase documentation:
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [CLI Reference](https://supabase.com/docs/reference/cli/introduction)
- [Edge Runtime](https://supabase.com/docs/guides/functions/runtime)
