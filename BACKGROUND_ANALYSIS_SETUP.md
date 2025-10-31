# Supabase Edge Function: AI Analysis Background Job

This edge function runs periodic AI analysis to refresh work patterns and generate insights.

## Setup Instructions

### 1. Install Supabase CLI

```powershell
# Using npm
npm install -g supabase

# Or using scoop
scoop install supabase
```

### 2. Initialize Supabase Functions

```powershell
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Create the function
supabase functions new ai-analysis-job
```

### 3. Deploy the Function

```powershell
# Deploy
supabase functions deploy ai-analysis-job --no-verify-jwt

# Set environment variables
supabase secrets set SUPABASE_URL=your-supabase-url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Function Code

Create file: `supabase/functions/ai-analysis-job/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("AI Analysis Job function started")

serve(async (req) => {
  try {
    // Create Supabase client with service role (bypass RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Log job start
    const { data: job, error: jobError } = await supabase
      .from('ai_analysis_jobs')
      .insert({
        job_type: 'scheduled',
        status: 'running',
      })
      .select()
      .single()

    if (jobError) {
      throw new Error(`Failed to log job: ${jobError.message}`)
    }

    console.log(`Job ${job.id} started`)

    // Get users active in last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: activeUsers, error: usersError } = await supabase
      .from('project_activity_log')
      .select('user_id')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    if (usersError) {
      throw new Error(`Failed to get active users: ${usersError.message}`)
    }

    // Get unique user IDs
    const uniqueUsers = [...new Set(activeUsers?.map(u => u.user_id) || [])]
    console.log(`Found ${uniqueUsers.length} active users`)

    let patternsUpdated = 0
    let insightsGenerated = 0

    // Process each user
    for (const userId of uniqueUsers) {
      try {
        // Check if work pattern needs refresh
        const { data: pattern } = await supabase
          .from('user_work_patterns')
          .select('last_analyzed_at')
          .eq('user_id', userId)
          .single()

        const needsRefresh = !pattern || 
          new Date(pattern.last_analyzed_at).getTime() < Date.now() - 3600000 // 1 hour

        if (needsRefresh) {
          // Analyze work pattern (simplified - real implementation would use proactiveAI service)
          const { data: activities } = await supabase
            .from('project_activity_log')
            .select('project_id, activity_type, created_at')
            .eq('user_id', userId)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

          // Extract basic patterns
          const projectIds = [...new Set(activities?.map(a => a.project_id) || [])]
          const activityTypes = activities?.map(a => a.activity_type) || []

          // Upsert work pattern
          await supabase
            .from('user_work_patterns')
            .upsert({
              user_id: userId,
              active_projects: projectIds.map(id => ({ project_id: id, engagement_score: 50 })),
              collaboration_frequency: activityTypes.filter(t => t === 'collaborate').length,
              last_analyzed_at: new Date().toISOString(),
            }, { onConflict: 'user_id' })

          patternsUpdated++
        }

        // Generate insights for user's top project
        const { data: userProjects } = await supabase
          .from('project_activity_log')
          .select('project_id')
          .eq('user_id', userId)
          .limit(1)

        if (userProjects && userProjects.length > 0) {
          const projectId = userProjects[0].project_id

          // Check for shared team members
          const { data: teamMembers } = await supabase
            .rpc('analyze_shared_team_members', {
              p_project_id_1: projectId,
              p_project_id_2: projectId,
              p_days_back: 30,
            })

          if (teamMembers && teamMembers.length > 0) {
            // Cache insight
            const expiresAt = new Date()
            expiresAt.setHours(expiresAt.getHours() + 1)

            await supabase
              .from('ai_insights_cache')
              .upsert({
                user_id: userId,
                project_id: projectId,
                insight_type: 'shared_team',
                title: 'Shared Team Members Detected',
                description: `${teamMembers.length} team members working across multiple projects`,
                action_label: 'Coordinate Sprints',
                action_data: { memberIds: teamMembers.map(m => m.user_id) },
                priority_score: 80 + teamMembers.length * 2,
                expires_at: expiresAt.toISOString(),
              }, {
                onConflict: 'user_id,project_id,insight_type,title'
              })

            insightsGenerated++
          }
        }

      } catch (userError) {
        console.error(`Error analyzing user ${userId}:`, userError)
        // Continue with next user
      }
    }

    // Update job status
    await supabase
      .from('ai_analysis_jobs')
      .update({
        status: 'completed',
        users_analyzed: uniqueUsers.length,
        patterns_updated: patternsUpdated,
        insights_generated: insightsGenerated,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    console.log(`Job ${job.id} completed: ${uniqueUsers.length} users, ${patternsUpdated} patterns, ${insightsGenerated} insights`)

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        usersAnalyzed: uniqueUsers.length,
        patternsUpdated,
        insightsGenerated,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Job failed:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
```

### 5. Schedule with Supabase Cron

In Supabase Dashboard → Database → Extensions → Enable `pg_cron`

Then run this SQL:

```sql
-- Schedule to run every 6 hours
SELECT cron.schedule(
  'ai-analysis-job',
  '0 */6 * * *', -- Every 6 hours
  $$
  SELECT 
    net.http_post(
      url := 'https://your-project-ref.supabase.co/functions/v1/ai-analysis-job',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
    ) AS request_id;
  $$
);

-- Check scheduled jobs
SELECT * FROM cron.job;
```

### 6. Manual Trigger (for testing)

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/ai-analysis-job \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### 7. Monitor Job Execution

```sql
-- View recent jobs
SELECT * FROM ai_analysis_jobs ORDER BY started_at DESC LIMIT 10;

-- View job statistics
SELECT 
  job_type,
  COUNT(*) as total_runs,
  AVG(users_analyzed) as avg_users,
  AVG(execution_time_ms) as avg_time_ms,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count
FROM ai_analysis_jobs
GROUP BY job_type;
```

## Alternative: Simple Scheduler (No Edge Functions)

If you don't want to use Edge Functions, you can run analysis from your application:

```typescript
// In your app, create a simple scheduler
import { getProactiveAI } from './utils/proactiveAI';

// Run every 6 hours
setInterval(async () => {
  console.log('[Scheduler] Running AI analysis...');
  const proactiveAI = getProactiveAI();
  await proactiveAI.runBackgroundAnalysis();
  console.log('[Scheduler] AI analysis complete');
}, 6 * 60 * 60 * 1000); // 6 hours
```

Or use a cron service like:
- **Vercel Cron** (if hosting on Vercel)
- **GitHub Actions** (scheduled workflows)
- **AWS Lambda** with EventBridge
- **Render Cron Jobs**

## Cost Considerations

- Edge Functions: **2 million invocations/month free**
- Running every 6 hours = 120 invocations/month (well within free tier)
- pg_cron: **Free** on Supabase Pro plan

## Recommendation

For production: Use Supabase Edge Function with pg_cron
For development: Use application-level setInterval
