import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Activity, Users, FileText, Clock, Loader2 } from "lucide-react";
import { createClient } from "../utils/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { ScrollArea } from "./ui/scroll-area";

// UI types
interface StatsItem {
  value: number;
  percentage: number;
}

interface StatsData {
  activeConnections: StatsItem;
  knowledgeItems: StatsItem;
  teamCollaborations: StatsItem;
  hoursSaved: StatsItem;
}

interface TopicData {
  title: string;
  views: number;
  trending: 'up' | 'down' | 'neutral';
}

interface ExpertData {
  id: string;
  name: string;
  role: string;
  avatar: string;
  skills: string[];
  reason: string;
}

interface ActivityData {
  id: string;
  user: string;
  action: string;
  topic: string;
  timestamp: string;
  type: string;
  userAvatar?: string;
  userDepartment?: string;
  relatedItemId?: string;
}

interface DashboardProps {
  accessToken: string;
}

export function Dashboard({ accessToken }: DashboardProps) {
  const [stats, setStats] = useState<StatsData>({
    activeConnections: { value: 0, percentage: 0 },
    knowledgeItems: { value: 0, percentage: 0 },
    teamCollaborations: { value: 0, percentage: 0 },
    hoursSaved: { value: 0, percentage: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [trendingTopics, setTrendingTopics] = useState<TopicData[]>([]);
  const [suggestedExperts, setSuggestedExperts] = useState<ExpertData[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityData[]>([]);
  
  // Dialog states
  const [selectedActivity, setSelectedActivity] = useState<ActivityData | null>(null);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);
  const [isConnectionsDialogOpen, setIsConnectionsDialogOpen] = useState(false);
  const [isKnowledgeDialogOpen, setIsKnowledgeDialogOpen] = useState(false);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  
  // Data for dialogs
  const [connections, setConnections] = useState<any[]>([]);
  const [knowledgeItems, setKnowledgeItems] = useState<any[]>([]);
  const [topicItems, setTopicItems] = useState<any[]>([]);
  const [loadingDialog, setLoadingDialog] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const supabase = createClient();

        // Fetch current dashboard stats
        let { data: statsData, error: statsError } = await supabase
          .rpc('get_dashboard_stats');

        console.log('Dashboard stats response:', { statsData, statsError });

        if (statsError) {
          console.warn('Failed to fetch dashboard stats:', statsError.message);
          // Use default values instead of throwing
          statsData = null;
        }

        // Extract first row if data is an array
        if (statsData && Array.isArray(statsData) && statsData.length > 0) {
          statsData = statsData[0];
        }

        // Fetch historical stats for comparison
        const { data: historicalStats, error: historicalError } = await supabase
          .rpc('get_historical_stats');

        if (historicalError) {
          console.warn('Historical stats not available:', historicalError.message);
        }

        // Update stats with real data
        if (statsData) {
          const previous = historicalStats || {
            previous_connections: 0,
            previous_items: 0,
            previous_collaborations: 0,
            previous_hours: 0
          };

          setStats({
            activeConnections: {
              value: statsData.active_connections || 0,
              percentage: calculatePercentageChange(
                previous.previous_connections,
                statsData.active_connections
              ),
            },
            knowledgeItems: {
              value: statsData.knowledge_items || 0,
              percentage: calculatePercentageChange(
                previous.previous_items,
                statsData.knowledge_items
              ),
            },
            teamCollaborations: {
              value: statsData.team_collaborations || 0,
              percentage: calculatePercentageChange(
                previous.previous_collaborations,
                statsData.team_collaborations
              ),
            },
            hoursSaved: {
              value: statsData.hours_saved || 0,
              percentage: calculatePercentageChange(
                previous.previous_hours,
                statsData.hours_saved
              ),
            },
          });
        }

        // Fetch trending topics (use new function if available)
        const { data: topicsData, error: topicsError } = await supabase
          .rpc('get_trending_topics_with_items');

        if (topicsError) {
          console.warn('Failed to fetch trending topics:', topicsError.message);
          // Fallback to empty array
          setTrendingTopics([]);
        } else if (topicsData && Array.isArray(topicsData)) {
          setTrendingTopics(
            topicsData.map((topic: any) => ({
              title: topic.topic_title || topic.category,
              views: topic.views || 0,
              trending: 'up' as const
            }))
          );
        }

        // Fetch recent activity
        const { data: activityData, error: activityError } = await supabase
          .rpc('get_recent_activity');

        if (activityError) {
          console.warn('Failed to fetch recent activity:', activityError.message);
          // Set empty array as fallback
          setRecentActivity([]);
        } else if (activityData && Array.isArray(activityData)) {
          setRecentActivity(
            activityData.map((activity: any) => ({
              id: activity.id?.toString() || Math.random().toString(),
              user: activity.user_name || 'Unknown User',
              action: activity.action || 'performed an action',
              topic: activity.topic || 'Unknown Topic',
              timestamp: formatRelativeTime(activity.created_at),
              type: activity.type || 'activity',
              userAvatar: activity.user_avatar,
              userDepartment: activity.user_department
            }))
          );
        }

        // Fetch smart suggested connections
        const { data: user } = await supabase.auth.getUser();
        if (user?.user?.id) {
          const { data: expertsData, error: expertsError } = await supabase
            .rpc('get_smart_suggested_connections', { 
              p_user_id: user.user.id 
            })
            .limit(3);

          if (expertsError) {
            console.warn('Failed to fetch suggested connections:', expertsError.message);
            // Use fallback empty array
            setSuggestedExperts([]);
          } else if (expertsData && expertsData.length > 0) {
            setSuggestedExperts(
              expertsData.map((expert: any) => ({
                id: expert.id,
                name: expert.full_name,
                role: expert.role || 'Team Member',
                avatar: expert.avatar_url || expert.full_name.split(' ').map((n: string) => n[0]).join(''),
                skills: expert.expertise || [],
                reason: expert.match_reason || 'Recommended for you'
              }))
            );
          } else {
            setSuggestedExperts([]);
          }
        }

      } catch (error: any) {
        console.error('Error fetching dashboard data:', error);
        // Only show error if it's critical, otherwise use fallbacks
        if (error?.message && !error.message.includes('does not exist')) {
          toast.error('Some dashboard features are not available yet');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [accessToken]);

  const calculatePercentageChange = (previous: number, current: number) => {
    if (previous === 0 && current === 0) return 0;
    if (previous === 0 && current > 0) return 100; // New items, show 100% growth
    if (current === 0) return -100; // Lost all items
    return Math.round(((current - previous) / previous) * 100);
  };

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  // Handler functions for clickable items
  const handleActivityClick = (activity: ActivityData) => {
    setSelectedActivity(activity);
    setIsActivityDialogOpen(true);
  };

  const handleConnectionsClick = async () => {
    setLoadingDialog(true);
    setIsConnectionsDialogOpen(true);
    
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      
      if (user?.user?.id) {
        const { data, error } = await supabase
          .rpc('get_user_connections', { p_user_id: user.user.id });
        
        if (!error && data) {
          setConnections(data);
        }
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast.error('Failed to load connections');
    } finally {
      setLoadingDialog(false);
    }
  };

  const handleKnowledgeClick = async () => {
    setLoadingDialog(true);
    setIsKnowledgeDialogOpen(true);
    
    try {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      
      if (user?.user?.id) {
        const { data, error } = await supabase
          .rpc('get_user_knowledge_items', { p_user_id: user.user.id });
        
        if (!error && data) {
          setKnowledgeItems(data);
        }
      }
    } catch (error) {
      console.error('Error fetching knowledge items:', error);
      toast.error('Failed to load knowledge items');
    } finally {
      setLoadingDialog(false);
    }
  };

  const handleTopicClick = async (topic: string) => {
    setLoadingDialog(true);
    setSelectedTopic(topic);
    setIsTopicDialogOpen(true);
    
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .rpc('get_topic_items', { p_topic: topic });
      
      if (!error && data) {
        setTopicItems(data);
      }
    } catch (error) {
      console.error('Error fetching topic items:', error);
      toast.error('Failed to load topic items');
    } finally {
      setLoadingDialog(false);
    }
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={handleConnectionsClick}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Active Connections</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-slate-900 dark:text-slate-100">{stats.activeConnections.value}</span>
                      {!isNaN(stats.activeConnections.percentage) && (
                        <span className="text-green-600 dark:text-green-400 text-sm">
                          {stats.activeConnections.percentage > 0 ? '+' : ''}{stats.activeConnections.percentage}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-12 h-12 text-blue-600 bg-opacity-10 dark:bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={handleKnowledgeClick}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Knowledge Items</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-slate-900 dark:text-slate-100">{stats.knowledgeItems.value}</span>
                      {!isNaN(stats.knowledgeItems.percentage) && (
                        <span className="text-green-600 dark:text-green-400 text-sm">
                          {stats.knowledgeItems.percentage > 0 ? '+' : ''}{stats.knowledgeItems.percentage}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-12 h-12 text-purple-600 bg-opacity-10 dark:bg-opacity-20 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Team Collaborations</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-slate-900 dark:text-slate-100">{stats.teamCollaborations.value}</span>
                      {!isNaN(stats.teamCollaborations.percentage) && (
                        <span className="text-green-600 dark:text-green-400 text-sm">
                          {stats.teamCollaborations.percentage > 0 ? '+' : ''}{stats.teamCollaborations.percentage}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-12 h-12 text-cyan-600 bg-opacity-10 dark:bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-cyan-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Hours Saved</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-slate-900 dark:text-slate-100">{stats.hoursSaved.value}</span>
                      {!isNaN(stats.hoursSaved.percentage) && (
                        <span className="text-green-600 dark:text-green-400 text-sm">
                          {stats.hoursSaved.percentage > 0 ? '+' : ''}{stats.hoursSaved.percentage}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-12 h-12 text-green-600 bg-opacity-10 dark:bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity and Trending Topics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Live updates from across your organization</CardDescription>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>No recent activity yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                    <div 
                      key={activity.id} 
                      className="flex items-start gap-3 pb-4 border-b dark:border-slate-700 last:border-0 last:pb-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg p-2 -m-2 transition-colors"
                      onClick={() => handleActivityClick(activity)}
                    >
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer">
                            <span className="text-white text-sm font-medium">
                              {activity.user.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold">
                                  {activity.user.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold">{activity.user}</h4>
                                {activity.userDepartment && (
                                  <p className="text-xs text-muted-foreground">{activity.userDepartment}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              <p>Recent activity: {activity.action}</p>
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-700 dark:text-slate-300">
                          <span className="font-medium">{activity.user}</span>
                          {' '}
                          <span>{activity.action}</span>
                          {' '}
                          <span className="text-slate-900 dark:text-slate-100 font-medium">{activity.topic}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">{activity.type}</Badge>
                          <span className="text-slate-400 dark:text-slate-500 text-xs">{activity.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trending Topics */}
            <Card>
              <CardHeader>
                <CardTitle>Trending Topics</CardTitle>
                <CardDescription>Popular across teams</CardDescription>
              </CardHeader>
              <CardContent>
                {trendingTopics.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>No trending topics yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trendingTopics.map((topic, index) => (
                    <div
                      key={topic.title}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                      onClick={() => handleTopicClick(topic.title)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">{index + 1}.</span>
                        <span className="text-slate-900 dark:text-slate-100 font-medium truncate">{topic.title}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">{topic.views}</span>
                        <Activity
                          className={`w-4 h-4 ${
                            topic.trending === 'up'
                              ? 'text-green-600 dark:text-green-400'
                              : topic.trending === 'down'
                              ? 'text-red-600 dark:text-red-400 rotate-180'
                              : 'text-slate-400'
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Suggested Connections */}
          <Card>
            <CardHeader>
              <CardTitle>Suggested Connections</CardTitle>
              <CardDescription>People who might help with your current work</CardDescription>
            </CardHeader>
            <CardContent>
              {suggestedExperts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                  <p>No suggested connections available yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {suggestedExperts.map((expert) => (
                  <HoverCard key={expert.id}>
                    <HoverCardTrigger asChild>
                      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-500 transition-colors cursor-pointer">
                        <div className="flex items-start gap-3 mb-3">
                          <Avatar className="w-12 h-12">
                            <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-500 text-white font-medium">
                              {expert.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-900 dark:text-slate-100 font-medium">{expert.name}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">{expert.role}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {expert.skills.slice(0, 3).map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-3 line-clamp-2">{expert.reason}</p>
                        <button className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 w-full">
                          Connect
                          <Users className="w-4 h-4 ml-2" />
                        </button>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-14 h-14">
                            <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-500 text-white font-semibold">
                              {expert.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="text-sm font-semibold">{expert.name}</h4>
                            <p className="text-xs text-muted-foreground">{expert.role}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium mb-2">Skills & Expertise</p>
                          <div className="flex flex-wrap gap-1">
                            {expert.skills.map((skill) => (
                              <Badge key={skill} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Why suggested:</span> {expert.reason}
                          </p>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Activity Detail Dialog */}
      <Dialog open={isActivityDialogOpen} onOpenChange={setIsActivityDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Activity Details</DialogTitle>
            <DialogDescription>View full details of this activity</DialogDescription>
          </DialogHeader>
          {selectedActivity && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white font-medium">
                    {selectedActivity.user.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedActivity.user}</h3>
                  {selectedActivity.userDepartment && (
                    <p className="text-sm text-muted-foreground">{selectedActivity.userDepartment}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Action:</span>
                  <p className="text-sm text-muted-foreground">{selectedActivity.action}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Topic:</span>
                  <p className="text-sm text-muted-foreground">{selectedActivity.topic}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Type:</span>
                  <Badge variant="secondary">{selectedActivity.type}</Badge>
                </div>
                <div>
                  <span className="text-sm font-medium">Time:</span>
                  <p className="text-sm text-muted-foreground">{selectedActivity.timestamp}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Active Connections Dialog */}
      <Dialog open={isConnectionsDialogOpen} onOpenChange={setIsConnectionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Your Active Connections</DialogTitle>
            <DialogDescription>People you're connected with ({connections.length})</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {loadingDialog ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : connections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>No connections yet. Start connecting with colleagues!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                {connections.map((connection) => (
                  <Card key={connection.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={connection.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                          {connection.full_name.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold truncate">{connection.full_name}</h4>
                        <p className="text-sm text-muted-foreground">{connection.role || 'Team Member'}</p>
                        {connection.department && (
                          <Badge variant="outline" className="text-xs mt-1">{connection.department}</Badge>
                        )}
                      </div>
                    </div>
                    {connection.expertise && connection.expertise.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {connection.expertise.slice(0, 3).map((skill: string) => (
                          <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Knowledge Items Dialog */}
      <Dialog open={isKnowledgeDialogOpen} onOpenChange={setIsKnowledgeDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Your Knowledge Items</DialogTitle>
            <DialogDescription>Items you've authored or collaborated on ({knowledgeItems.length})</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {loadingDialog ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : knowledgeItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>No knowledge items yet. Start sharing your knowledge!</p>
              </div>
            ) : (
              <div className="space-y-4 p-1">
                {knowledgeItems.map((item) => (
                  <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-lg">{item.title}</h4>
                        <Badge variant="secondary">{item.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{item.views} views • {item.helpful_count} helpful</span>
                        <span>{formatRelativeTime(item.created_at)}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Trending Topic Items Dialog */}
      <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedTopic}</DialogTitle>
            <DialogDescription>All items in this trending topic ({topicItems.length})</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {loadingDialog ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : topicItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>No items found for this topic</p>
              </div>
            ) : (
              <div className="space-y-4 p-1">
                {topicItems.map((item) => (
                  <Card key={item.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-lg flex-1">{item.title}</h4>
                        <Badge variant="secondary">{item.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={item.author_avatar} />
                          <AvatarFallback className="text-xs">{item.author_name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{item.author_name}</span>
                        {item.author_department && (
                          <Badge variant="outline" className="text-xs">{item.author_department}</Badge>
                        )}
                      </div>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.map((tag: string) => (
                            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{item.views} views • {item.helpful_count} helpful</span>
                        <span>{formatRelativeTime(item.created_at)}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Dashboard;
