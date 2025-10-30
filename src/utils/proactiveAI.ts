/**
 * Proactive AI - Background analysis of work patterns to auto-suggest connections
 * Analyzes user activities, projects, knowledge items to find collaboration opportunities
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
 * Proactive AI Service for work pattern analysis
 */
export class ProactiveAIService {
  private supabase = createClient();

  /**
   * Analyze a user's work patterns
   */
  async analyzeUserWorkPattern(userId: string): Promise<WorkPattern> {
    // Get user's projects
    const { data: userProjects } = await this.supabase
      .from('project_members')
      .select('project:projects(name, tags)')
      .eq('user_id', userId);

    // Get user's knowledge contributions
    const { data: knowledgeItems } = await this.supabase
      .from('knowledge_items')
      .select('title, tags, category')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get user's recent activities
    const { data: activities } = await this.supabase
      .from('activity_log')
      .select('action_type, metadata')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

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

    // Extract patterns
    const topics = new Set<string>();
    const projects = new Set<string>();
    const skills = new Set<string>();

    // From projects
    if (userProjects && Array.isArray(userProjects)) {
      userProjects.forEach((up: any) => {
        if (up.project && !Array.isArray(up.project)) {
          projects.add(up.project.name);
          if (Array.isArray(up.project.tags)) {
            up.project.tags.forEach((tag: string) => topics.add(tag));
          }
        }
      });
    }

    // From knowledge items
    knowledgeItems?.forEach(item => {
      if (Array.isArray(item.tags)) {
        item.tags.forEach((tag: string) => topics.add(tag));
      }
      if (item.category) topics.add(item.category);
    });

    // From profile
    if (Array.isArray(profile?.expertise)) {
      profile.expertise.forEach(skill => skills.add(skill));
    }

    // Calculate activity score (higher = more active)
    const activityScore = (activities?.length || 0) + 
                         (knowledgeItems?.length || 0) * 2 + 
                         (userProjects?.length || 0) * 3;

    return {
      userId,
      topics: Array.from(topics),
      projects: Array.from(projects),
      skills: Array.from(skills),
      recentActivity: activities?.map(a => a.action_type) || [],
      collaborators: connections?.map(c => c.connected_with) || [],
      activityScore,
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
        const suggestions = await this.generateConnectionSuggestions(user.id);
        
        for (const suggestion of suggestions) {
          await this.storeConnectionSuggestion(suggestion);
        }

        console.log(`[ProactiveAI] Generated ${suggestions.length} suggestions for user ${user.id}`);
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
