/**
 * Proactive AI - Real AI-powered analysis of work patterns and project insights
 * Uses project_activity_log, user_work_patterns, and project_dependencies for deep analysis
 */

import { createClient } from './supabase/client';

export interface WorkPattern {
  userId: string;
  topics: string[];
  projects: string[];
  skills: string[];
  recentActivity: string[];
  collaborators: string[];
  activityScore: number;
  activeHours?: number[]; // Hours of day (0-23) when user is most active
  activeDays?: number[]; // Days of week (0-6) when user is most active
  avgResponseTime?: number; // Minutes
  knowledgeSharingScore?: number;
}

export interface ConnectionSuggestion {
  userId: string;
  targetUserId: string;
  targetName: string;
  targetEmail: string;
  targetAvatar?: string;
  targetDepartment?: string;
  reason: string;
  score: number;
  sharedInterests: string[];
  suggestedBy: 'ai_pattern_analysis' | 'project_overlap' | 'skill_match' | 'knowledge_similarity';
  confidence: number; // 0-100
}

export interface AIInsight {
  id?: string;
  type: 'shared_team' | 'common_dependencies' | 'knowledge_transfer' | 'timeline_risk';
  title: string;
  description: string;
  actionLabel: string;
  actionData: any;
  priorityScore: number;
  metadata?: any;
}

export interface SimilarWorkAlert {
  id: string;
  userId: string;
  relatedUserId: string;
  relatedUserName: string;
  relatedUserEmail: string;
  workType: 'project' | 'knowledge_item' | 'question' | 'issue';
  workId: string;
  workTitle: string;
  similarity: number; // 0-100
  reason: string;
  timestamp: Date;
  isRead: boolean;
}

/**
 * Proactive AI Service for real work pattern analysis
 */
export class ProactiveAIService {
  private supabase = createClient();

  /**
   * Log project activity (called when user views/edits projects)
   */
  async logProjectActivity(
    userId: string,
    projectId: number,
    activityType: 'view' | 'edit' | 'collaborate' | 'contribute' | 'comment',
    metadata: any = {},
    durationSeconds?: number
  ): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('log_project_activity', {
        p_user_id: userId,
        p_project_id: projectId,
        p_activity_type: activityType,
        p_metadata: metadata,
        p_duration_seconds: durationSeconds,
      });
      
      if (error) {
        console.error('[ProactiveAI] Error logging activity:', error);
      }
    } catch (error) {
      console.error('[ProactiveAI] Failed to log activity:', error);
    }
  }

  /**
   * Analyze a user's work patterns from project_activity_log
   */
  async analyzeUserWorkPattern(userId: string): Promise<WorkPattern> {
    console.log('[ProactiveAI] Analyzing work pattern for user:', userId);

    // Check if we have a cached work pattern
    const { data: cachedPattern } = await this.supabase
      .from('user_work_patterns')
      .select('*')
      .eq('user_id', userId)
      .single();

    // If cached and recent (< 1 hour old), return it
    if (cachedPattern && new Date(cachedPattern.last_analyzed_at).getTime() > Date.now() - 3600000) {
      console.log('[ProactiveAI] Using cached work pattern');
      return {
        userId,
        topics: cachedPattern.expertise_areas?.map((e: any) => e.topic) || [],
        projects: cachedPattern.active_projects?.map((p: any) => p.project_id?.toString()) || [],
        skills: cachedPattern.expertise_areas?.map((e: any) => e.topic) || [],
        recentActivity: [],
        collaborators: cachedPattern.frequent_collaborators?.map((c: any) => c.user_id) || [],
        activityScore: cachedPattern.knowledge_sharing_score || 0,
        activeHours: cachedPattern.active_hours || [],
        activeDays: cachedPattern.active_days || [],
        avgResponseTime: cachedPattern.avg_response_time,
        knowledgeSharingScore: cachedPattern.knowledge_sharing_score,
      };
    }

    // Analyze from scratch using project_activity_log
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: activities } = await this.supabase
      .from('project_activity_log')
      .select('project_id, activity_type, metadata, created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    // Get user's connections
    const { data: connections } = await this.supabase
      .from('user_connections')
      .select('connected_with')
      .eq('user_id', userId)
      .eq('status', 'connected');

    // Get user's profile for skills
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('expertise')
      .eq('id', userId)
      .single();

    // Analyze patterns
    const projectSet = new Set<number>();
    const activityTypeCount = new Map<string, number>();
    const hourlyActivity = new Array(24).fill(0);
    const dailyActivity = new Array(7).fill(0);

    activities?.forEach(activity => {
      if (activity.project_id) {
        projectSet.add(activity.project_id);
      }
      activityTypeCount.set(
        activity.activity_type,
        (activityTypeCount.get(activity.activity_type) || 0) + 1
      );

      // Track temporal patterns
      const activityDate = new Date(activity.created_at);
      hourlyActivity[activityDate.getHours()]++;
      dailyActivity[activityDate.getDay()]++;
    });

    // Find most active hours (top 5)
    const activeHours = hourlyActivity
      .map((count, hour) => ({ hour, count }))
      .filter(h => h.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(h => h.hour);

    // Find most active days (days with activity)
    const activeDays = dailyActivity
      .map((count, day) => ({ day, count }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count)
      .map(d => d.day);

    // Get project details for topics extraction
    const { data: projects } = await this.supabase
      .from('knowledge_items')
      .select('id, title, tags, category')
      .in('id', Array.from(projectSet));

    const topics = new Set<string>();
    const expertiseAreas: any[] = [];

    projects?.forEach(project => {
      if (Array.isArray(project.tags)) {
        project.tags.forEach((tag: string) => {
          topics.add(tag);
          // Count engagement per topic
          const existingExpertise = expertiseAreas.find(e => e.topic === tag);
          if (existingExpertise) {
            existingExpertise.project_count++;
          } else {
            expertiseAreas.push({ topic: tag, confidence_score: 10, project_count: 1 });
          }
        });
      }
      if (project.category) {
        topics.add(project.category);
      }
    });

    // Add profile expertise
    const skills = new Set<string>();
    if (Array.isArray(profile?.expertise)) {
      profile.expertise.forEach(skill => {
        skills.add(skill);
        topics.add(skill);
      });
    }

    // Calculate knowledge sharing score
    const contributionCount = activityTypeCount.get('contribute') || 0;
    const collaborationCount = activityTypeCount.get('collaborate') || 0;
    const knowledgeSharingScore = (contributionCount * 5) + (collaborationCount * 3);

    // Store/update work pattern in database
    const patternData = {
      user_id: userId,
      active_hours: activeHours,
      active_days: activeDays,
      frequent_collaborators: connections?.map(c => ({ user_id: c.connected_with, count: 1 })) || [],
      collaboration_frequency: collaborationCount,
      expertise_areas: expertiseAreas,
      active_projects: Array.from(projectSet).map(pid => ({
        project_id: pid,
        engagement_score: 50,
        last_active: new Date().toISOString(),
      })),
      knowledge_sharing_score: knowledgeSharingScore,
      last_analyzed_at: new Date().toISOString(),
      analysis_version: 1,
    };

    await this.supabase
      .from('user_work_patterns')
      .upsert(patternData, { onConflict: 'user_id' });

    console.log('[ProactiveAI] Work pattern analyzed and cached');

    return {
      userId,
      topics: Array.from(topics),
      projects: Array.from(projectSet).map(id => id.toString()),
      skills: Array.from(skills),
      recentActivity: Array.from(activityTypeCount.keys()),
      collaborators: connections?.map(c => c.connected_with) || [],
      activityScore: activities?.length || 0,
      activeHours,
      activeDays,
      knowledgeSharingScore,
    };
  }

  /**
   * Generate smart connection suggestions based on work patterns
   */
  async generateConnectionSuggestions(userId: string): Promise<ConnectionSuggestion[]> {
    const userPattern = await this.analyzeUserWorkPattern(userId);
    const suggestions: ConnectionSuggestion[] = [];

    // Get all other users
    const { data: allUsers } = await this.supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, department, expertise')
      .neq('id', userId);

    if (!allUsers) return [];

    // Get existing connections to exclude
    const existingConnections = new Set(userPattern.collaborators);
    
    // Also get pending connections
    const { data: pending } = await this.supabase
      .from('user_connections')
      .select('connected_with')
      .eq('user_id', userId)
      .eq('status', 'pending');
    
    pending?.forEach(p => existingConnections.add(p.connected_with));

    // Analyze each user for potential matches
    for (const otherUser of allUsers) {
      // Skip if already connected
      if (existingConnections.has(otherUser.id)) continue;

      const otherPattern = await this.analyzeUserWorkPattern(otherUser.id);
      
      // Calculate similarity score
      const sharedTopics = userPattern.topics.filter(t => 
        otherPattern.topics.includes(t)
      );
      
      const sharedSkills = userPattern.skills.filter(s => 
        otherPattern.skills.includes(s)
      );

      const complementarySkills = userPattern.skills.filter(s => 
        !otherPattern.skills.includes(s) && otherPattern.topics.includes(s)
      );

      // Score calculation
      let score = 0;
      let reason = '';
      let suggestedBy: ConnectionSuggestion['suggestedBy'] = 'ai_pattern_analysis';

      if (sharedTopics.length >= 3) {
        score += sharedTopics.length * 10;
        reason = `Working on similar topics: ${sharedTopics.slice(0, 3).join(', ')}`;
        suggestedBy = 'knowledge_similarity';
      }

      if (sharedSkills.length >= 2) {
        score += sharedSkills.length * 15;
        if (reason) reason += ' | ';
        reason += `Shared expertise: ${sharedSkills.slice(0, 2).join(', ')}`;
        suggestedBy = 'skill_match';
      }

      if (complementarySkills.length >= 2) {
        score += complementarySkills.length * 12;
        if (reason) reason += ' | ';
        reason += `Could help with: ${complementarySkills.slice(0, 2).join(', ')}`;
      }

      // Bonus for same department cross-team collaboration
      if (otherUser.department && userPattern.topics.some(t => 
        otherPattern.topics.includes(t)
      )) {
        score += 10;
      }

      // Only suggest if score is high enough
      if (score >= 30) {
        suggestions.push({
          userId,
          targetUserId: otherUser.id,
          targetName: otherUser.full_name,
          targetEmail: otherUser.email,
          targetAvatar: otherUser.avatar_url,
          targetDepartment: otherUser.department,
          reason: reason || 'Similar work patterns detected',
          score,
          sharedInterests: [...sharedTopics, ...sharedSkills],
          suggestedBy,
          confidence: Math.min(score, 100),
        });
      }
    }

    // Sort by score and return top 10
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  /**
   * Detect similar work being done by others
   */
  async detectSimilarWork(
    userId: string,
    workType: 'project' | 'knowledge_item' | 'question',
    workTitle: string,
    workTags?: string[]
  ): Promise<SimilarWorkAlert[]> {
    const alerts: SimilarWorkAlert[] = [];

    if (workType === 'project') {
      // Find similar projects
      const { data: similarProjects } = await this.supabase
        .from('projects')
        .select('id, name, tags, created_by, profiles!created_by(full_name, email)')
        .neq('created_by', userId);

      similarProjects?.forEach(project => {
        const similarity = this.calculateTextSimilarity(
          workTitle.toLowerCase(),
          project.name.toLowerCase()
        );

        const tagSimilarity = workTags 
          ? this.calculateTagSimilarity(workTags, project.tags || [])
          : 0;

        const finalSimilarity = Math.max(similarity, tagSimilarity);

        if (finalSimilarity >= 60) {
          const profileData: any = project.profiles;
          alerts.push({
            id: `project-${project.id}`,
            userId,
            relatedUserId: project.created_by,
            relatedUserName: (Array.isArray(profileData) ? profileData[0]?.full_name : profileData?.full_name) || 'Unknown',
            relatedUserEmail: (Array.isArray(profileData) ? profileData[0]?.email : profileData?.email) || '',
            workType: 'project',
            workId: project.id,
            workTitle: project.name,
            similarity: finalSimilarity,
            reason: `Similar project: "${project.name}"`,
            timestamp: new Date(),
            isRead: false,
          });
        }
      });
    } else if (workType === 'knowledge_item') {
      // Find similar knowledge items
      const { data: similarItems } = await this.supabase
        .from('knowledge_items')
        .select('id, title, tags, created_by, profiles!created_by(full_name, email)')
        .neq('created_by', userId);

      similarItems?.forEach(item => {
        const similarity = this.calculateTextSimilarity(
          workTitle.toLowerCase(),
          item.title.toLowerCase()
        );

        const tagSimilarity = workTags 
          ? this.calculateTagSimilarity(workTags, item.tags || [])
          : 0;

        const finalSimilarity = Math.max(similarity, tagSimilarity);

        if (finalSimilarity >= 70) {
          const profileData: any = item.profiles;
          alerts.push({
            id: `knowledge-${item.id}`,
            userId,
            relatedUserId: item.created_by,
            relatedUserName: (Array.isArray(profileData) ? profileData[0]?.full_name : profileData?.full_name) || 'Unknown',
            relatedUserEmail: (Array.isArray(profileData) ? profileData[0]?.email : profileData?.email) || '',
            workType: 'knowledge_item',
            workId: item.id,
            workTitle: item.title,
            similarity: finalSimilarity,
            reason: `Similar knowledge shared: "${item.title}"`,
            timestamp: new Date(),
            isRead: false,
          });
        }
      });
    }

    return alerts.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  }

  /**
   * Calculate text similarity (simple Jaccard similarity)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 3));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;
    return (intersection.size / union.size) * 100;
  }

  /**
   * Calculate tag similarity
   */
  private calculateTagSimilarity(tags1: string[], tags2: string[]): number {
    if (!tags1.length || !tags2.length) return 0;

    const set1 = new Set(tags1.map(t => t.toLowerCase()));
    const set2 = new Set(tags2.map(t => t.toLowerCase()));

    const intersection = new Set([...set1].filter(t => set2.has(t)));
    const union = new Set([...set1, ...set2]);

    return (intersection.size / union.size) * 100;
  }

  /**
   * Store connection suggestion for later retrieval
   */
  async storeConnectionSuggestion(suggestion: ConnectionSuggestion): Promise<void> {
    await this.supabase.from('ai_connection_suggestions').insert({
      user_id: suggestion.userId,
      suggested_user_id: suggestion.targetUserId,
      reason: suggestion.reason,
      score: suggestion.score,
      shared_interests: suggestion.sharedInterests,
      suggested_by: suggestion.suggestedBy,
      confidence: suggestion.confidence,
      is_dismissed: false,
    });
  }

  /**
   * Get stored suggestions for a user
   */
  async getStoredSuggestions(userId: string): Promise<ConnectionSuggestion[]> {
    const { data } = await this.supabase
      .from('ai_connection_suggestions')
      .select(`
        *,
        target:profiles!suggested_user_id(
          id,
          full_name,
          email,
          avatar_url,
          department
        )
      `)
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .order('score', { ascending: false })
      .limit(10);

    if (!data) return [];

    return data.map(d => ({
      userId: d.user_id,
      targetUserId: d.suggested_user_id,
      targetName: d.target.full_name,
      targetEmail: d.target.email,
      targetAvatar: d.target.avatar_url,
      targetDepartment: d.target.department,
      reason: d.reason,
      score: d.score,
      sharedInterests: d.shared_interests,
      suggestedBy: d.suggested_by,
      confidence: d.confidence,
    }));
  }

  /**
   * Generate AI insights for a specific project
   */
  async generateProjectInsights(userId: string, projectId?: number): Promise<AIInsight[]> {
    console.log('[ProactiveAI] Generating project insights for user:', userId);
    const insights: AIInsight[] = [];

    try {
      // Get user's active projects from work pattern
      const pattern = await this.analyzeUserWorkPattern(userId);
      const userProjectIds = pattern.projects.map(p => parseInt(p)).filter(id => !isNaN(id));

      if (userProjectIds.length === 0) {
        console.log('[ProactiveAI] No active projects found');
        return [];
      }

      // Use the first project if projectId not specified
      const targetProjectId = projectId || userProjectIds[0];

      // INSIGHT 1: Shared Team Members
      // Find team members working on multiple projects
      const { data: teamMembers, error: teamError } = await this.supabase.rpc(
        'analyze_shared_team_members',
        {
          p_project_id_1: targetProjectId,
          p_project_id_2: userProjectIds.find(id => id !== targetProjectId) || targetProjectId,
          p_days_back: 30,
        }
      );

      if (teamMembers && teamMembers.length > 0 && !teamError) {
        const count = teamMembers.length;
        const topMembers = teamMembers.slice(0, 3).map((m: any) => m.full_name).join(', ');
        
        insights.push({
          type: 'shared_team',
          title: 'Shared Team Members Detected',
          description: `${count} team member${count > 1 ? 's are' : ' is'} actively working across multiple projects: ${topMembers}`,
          actionLabel: 'Coordinate Sprints',
          actionData: { memberIds: teamMembers.map((m: any) => m.user_id), projectIds: [targetProjectId] },
          priorityScore: 80 + count * 2,
        });
      }

      // INSIGHT 2: Common Dependencies
      // Find projects with similar technology/knowledge dependencies
      const { data: dependencies, error: depError } = await this.supabase.rpc(
        'detect_common_dependencies',
        {
          p_project_id: targetProjectId,
          p_limit: 5,
        }
      );

      if (dependencies && dependencies.length > 0 && !depError) {
        const impactedCount = dependencies.length;
        const topDeps = dependencies.slice(0, 2).map((d: any) => d.project_title).join(', ');
        
        insights.push({
          type: 'common_dependencies',
          title: 'Cross-Project Dependencies Found',
          description: `This project shares critical dependencies with ${impactedCount} other project${impactedCount > 1 ? 's' : ''}: ${topDeps}`,
          actionLabel: 'Review Impact',
          actionData: { dependencies: dependencies.map((d: any) => d.related_project_id) },
          priorityScore: 75 + impactedCount * 3,
        });
      }

      // INSIGHT 3: Knowledge Transfer Opportunities
      // Find projects that could benefit from shared knowledge
      const { data: opportunities, error: oppError } = await this.supabase.rpc(
        'identify_knowledge_transfer_opportunities',
        {
          p_user_id: userId,
          p_limit: 5,
        }
      );

      if (opportunities && opportunities.length > 0 && !oppError) {
        const opp = opportunities[0];
        const sharedTopicsStr = opp.shared_topics?.slice(0, 3).join(', ') || 'related topics';
        
        insights.push({
          type: 'knowledge_transfer',
          title: 'Knowledge Transfer Opportunity',
          description: `Team working on "${opp.from_project_title}" has valuable insights for "${opp.to_project_title}" (shared: ${sharedTopicsStr})`,
          actionLabel: 'Schedule Sync',
          actionData: {
            fromProjectId: opp.from_project_id,
            toProjectId: opp.to_project_id,
            topics: opp.shared_topics,
          },
          priorityScore: 70 + (opp.opportunity_score || 0),
        });
      }

      // INSIGHT 4: Timeline Risk Detection
      // Analyze activity patterns to detect potential timeline risks
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: recentActivity } = await this.supabase
        .from('project_activity_log')
        .select('activity_type, created_at')
        .eq('project_id', targetProjectId)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (recentActivity) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentCount = recentActivity.filter(
          a => new Date(a.created_at) > sevenDaysAgo
        ).length;
        
        const olderCount = recentActivity.filter(
          a => new Date(a.created_at) <= sevenDaysAgo
        ).length;

        // If activity dropped significantly in last week
        if (olderCount > 10 && recentCount < olderCount * 0.3) {
          insights.push({
            type: 'timeline_risk',
            title: 'Activity Slowdown Detected',
            description: `Project activity decreased by ${Math.round((1 - recentCount/olderCount) * 100)}% in the last week. Team may need support.`,
            actionLabel: 'Check Team Status',
            actionData: { projectId: targetProjectId, recentCount, olderCount },
            priorityScore: 90,
          });
        }
      }

      // Cache insights for fast retrieval
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Cache for 1 hour

      for (const insight of insights) {
        await this.supabase
          .from('ai_insights_cache')
          .upsert({
            user_id: userId,
            project_id: projectId,
            insight_type: insight.type,
            title: insight.title,
            description: insight.description,
            action_label: insight.actionLabel,
            action_data: insight.actionData,
            priority_score: insight.priorityScore,
            expires_at: expiresAt.toISOString(),
          }, {
            onConflict: 'user_id,project_id,insight_type,title',
          });
      }

      console.log(`[ProactiveAI] Generated ${insights.length} insights`);
      return insights.sort((a, b) => b.priorityScore - a.priorityScore);
    } catch (error) {
      console.error('[ProactiveAI] Error generating insights:', error);
      return [];
    }
  }

  /**
   * Get cached insights (fast retrieval)
   */
  async getCachedInsights(userId: string, projectId?: number): Promise<AIInsight[]> {
    const now = new Date().toISOString();
    
    let query = this.supabase
      .from('ai_insights_cache')
      .select('*')
      .eq('user_id', userId)
      .gte('expires_at', now)
      .order('priority_score', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data } = await query;

    if (!data || data.length === 0) {
      // No cache, generate fresh insights
      return this.generateProjectInsights(userId, projectId);
    }

    return data.map(d => ({
      id: d.id.toString(),
      type: d.insight_type as any,
      title: d.title,
      description: d.description,
      actionLabel: d.action_label,
      actionData: d.action_data,
      priorityScore: d.priority_score,
      metadata: d.metadata,
    }));
  }

  /**
   * Run background analysis for all active users
   */
  async runBackgroundAnalysis(): Promise<void> {
    console.log('[ProactiveAI] Starting background analysis...');

    // Get users who have been active in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: activeUsers } = await this.supabase
      .from('profiles')
      .select('id')
      .gte('updated_at', sevenDaysAgo.toISOString());

    if (!activeUsers) return;

    console.log(`[ProactiveAI] Analyzing ${activeUsers.length} active users...`);

    for (const user of activeUsers) {
      try {
        // Generate work pattern analysis
        await this.analyzeUserWorkPattern(user.id);
        
        // Generate connection suggestions
        const suggestions = await this.generateConnectionSuggestions(user.id);
        
        for (const suggestion of suggestions) {
          await this.storeConnectionSuggestion(suggestion);
        }

        // Generate project insights
        await this.generateProjectInsights(user.id);

        console.log(`[ProactiveAI] Analyzed user ${user.id}: ${suggestions.length} suggestions`);
      } catch (error) {
        console.error(`[ProactiveAI] Error analyzing user ${user.id}:`, error);
      }
    }

    console.log('[ProactiveAI] Background analysis complete');
  }
}

/**
 * Singleton instance
 */
let aiService: ProactiveAIService | null = null;

export function getProactiveAI(): ProactiveAIService {
  if (!aiService) {
    aiService = new ProactiveAIService();
  }
  return aiService;
}
