/**
 * Smart Connection Suggestions Widget
 * Shows AI-generated connection recommendations based on work pattern analysis
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Sparkles, UserPlus, X, TrendingUp, Loader2, RefreshCw } from 'lucide-react';
import { getProactiveAI, ConnectionSuggestion } from '../utils/proactiveAI';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner';

interface SmartConnectionsWidgetProps {
  userId: string;
  compact?: boolean;
}

export function SmartConnectionsWidget({ userId, compact = false }: SmartConnectionsWidgetProps) {
  const [suggestions, setSuggestions] = useState<ConnectionSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingIds, setConnectingIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadSuggestions();
  }, [userId]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const aiService = getProactiveAI();
      
      // First try to get stored suggestions
      const stored = await aiService.getStoredSuggestions(userId);
      
      if (stored.length > 0) {
        setSuggestions(stored.filter(s => !dismissedIds.has(s.targetUserId)));
      } else {
        // Generate new suggestions if none exist
        const generated = await aiService.generateConnectionSuggestions(userId);
        setSuggestions(generated);
        
        // Store them for future
        for (const suggestion of generated) {
          await aiService.storeConnectionSuggestion(suggestion);
        }
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
      toast.error('Failed to load connection suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (suggestion: ConnectionSuggestion) => {
    console.log('🔗 Dashboard Connect button clicked for:', suggestion.targetName, suggestion.targetUserId);
    alert(`Connect button clicked! Check console for details.`);
    setConnectingIds(new Set(connectingIds).add(suggestion.targetUserId));
    
    try {
      const supabase = createClient();
      
      console.log('👤 Connecting:', userId, '->', suggestion.targetUserId);
      
      // Create bidirectional connection immediately (not pending)
      const { error: error1 } = await supabase
        .from('user_connections')
        .insert({
          user_id: userId,
          connected_with: suggestion.targetUserId,
          status: 'connected',
        });

      if (error1) {
        console.error('❌ Error creating connection 1:', error1);
        throw error1;
      }
      console.log('✅ Connection 1 created');

      // Create reverse connection
      const { error: error2 } = await supabase
        .from('user_connections')
        .insert({
          user_id: suggestion.targetUserId,
          connected_with: userId,
          status: 'connected',
        });

      if (error2) {
        console.error('❌ Error creating connection 2:', error2);
        throw error2;
      }
      console.log('✅ Connection 2 created');

      // Update suggestion as accepted
      await supabase
        .from('ai_connection_suggestions')
        .update({ is_accepted: true })
        .eq('user_id', userId)
        .eq('suggested_user_id', suggestion.targetUserId);

      toast.success(`Successfully connected with ${suggestion.targetName}!`);
      
      // Remove from list
      setSuggestions(suggestions.filter(s => s.targetUserId !== suggestion.targetUserId));
    } catch (error) {
      console.error('❌ Error in handleConnect:', error);
      toast.error('Failed to connect. Please try again.');
    } finally {
      const newSet = new Set(connectingIds);
      newSet.delete(suggestion.targetUserId);
      setConnectingIds(newSet);
    }
  };

  const handleDismiss = async (suggestion: ConnectionSuggestion) => {
    try {
      const supabase = createClient();
      
      await supabase
        .from('ai_connection_suggestions')
        .update({ is_dismissed: true })
        .eq('user_id', userId)
        .eq('suggested_user_id', suggestion.targetUserId);

      setDismissedIds(new Set(dismissedIds).add(suggestion.targetUserId));
      setSuggestions(suggestions.filter(s => s.targetUserId !== suggestion.targetUserId));
      
      toast.success('Suggestion dismissed');
    } catch (error) {
      console.error('Error dismissing suggestion:', error);
    }
  };

  const handleRefresh = () => {
    loadSuggestions();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getSuggestedByLabel = (suggestedBy: ConnectionSuggestion['suggestedBy']) => {
    switch (suggestedBy) {
      case 'ai_pattern_analysis':
        return 'Work Pattern Match';
      case 'project_overlap':
        return 'Project Overlap';
      case 'skill_match':
        return 'Skill Match';
      case 'knowledge_similarity':
        return 'Knowledge Similarity';
    }
  };

  const getSuggestedByColor = (suggestedBy: ConnectionSuggestion['suggestedBy']) => {
    switch (suggestedBy) {
      case 'ai_pattern_analysis':
        return 'bg-purple-100 text-purple-700';
      case 'project_overlap':
        return 'bg-blue-100 text-blue-700';
      case 'skill_match':
        return 'bg-green-100 text-green-700';
      case 'knowledge_similarity':
        return 'bg-amber-100 text-amber-700';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Connection Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Connection Suggestions
          </CardTitle>
          <CardDescription>
            No new suggestions right now
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-4">
              We're analyzing your work patterns to find great connections.
            </p>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Suggestions
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Smart Suggestions
            </CardTitle>
            <Badge variant="secondary">{suggestions.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions.slice(0, 3).map((suggestion) => (
            <div key={suggestion.targetUserId} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
              <Avatar className="w-10 h-10">
                <AvatarImage src={suggestion.targetAvatar} />
                <AvatarFallback className="bg-purple-100 text-purple-700">
                  {getInitials(suggestion.targetName)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{suggestion.targetName}</p>
                <p className="text-xs text-muted-foreground truncate">{suggestion.reason}</p>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleConnect(suggestion)}
                disabled={connectingIds.has(suggestion.targetUserId)}
              >
                {connectingIds.has(suggestion.targetUserId) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
              </Button>
            </div>
          ))}
          
          {suggestions.length > 3 && (
            <Button variant="link" className="w-full text-xs">
              View {suggestions.length - 3} more suggestions
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Connection Suggestions
            </CardTitle>
            <CardDescription>
              Smart recommendations based on your work patterns
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div key={suggestion.targetUserId} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={suggestion.targetAvatar} />
                    <AvatarFallback className="bg-purple-100 text-purple-700">
                      {getInitials(suggestion.targetName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h4 className="font-semibold">{suggestion.targetName}</h4>
                    <p className="text-sm text-muted-foreground">{suggestion.targetEmail}</p>
                    {suggestion.targetDepartment && (
                      <Badge variant="outline" className="mt-1">
                        {suggestion.targetDepartment}
                      </Badge>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDismiss(suggestion)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className={getSuggestedByColor(suggestion.suggestedBy)}>
                    {getSuggestedByLabel(suggestion.suggestedBy)}
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {suggestion.confidence}% match
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground">{suggestion.reason}</p>

                {suggestion.sharedInterests.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {suggestion.sharedInterests.slice(0, 5).map((interest) => (
                      <Badge key={interest} variant="outline" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                    {suggestion.sharedInterests.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{suggestion.sharedInterests.length - 5} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <Button
                className="w-full"
                onClick={() => handleConnect(suggestion)}
                disabled={connectingIds.has(suggestion.targetUserId)}
              >
                {connectingIds.has(suggestion.targetUserId) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending Request...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Send Connection Request
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
