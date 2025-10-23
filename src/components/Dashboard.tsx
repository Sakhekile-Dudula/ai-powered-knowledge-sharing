import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Activity, Users, FileText, Clock, Loader2 } from "lucide-react";
import { createClient } from "../utils/supabase/client";
import { toast } from "sonner";

// Database types
interface DashboardStats {
  active_connections: number;
  knowledge_items: number;
  team_collaborations: number;
  hours_saved: number;
}

interface HistoricalStats {
  previous_connections: number;
  previous_items: number;
  previous_collaborations: number;
  previous_hours: number;
}

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
  const [error, setError] = useState<string | null>(null);
  const [trendingTopics, setTrendingTopics] = useState<TopicData[]>([]);
  const [suggestedExperts, setSuggestedExperts] = useState<ExpertData[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityData[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const supabase = createClient();

        // Fetch real-time dashboard stats
        const { data: dashboardData, error: statsError } = await supabase
          .rpc('get_dashboard_stats');

        if (statsError) {
          throw new Error(`Failed to fetch dashboard stats: ${statsError.message}`);
        }

        if (dashboardData) {
          const current = dashboardData.current;
          const previous = dashboardData.previous;

          setStats({
            activeConnections: {
              value: current.active_connections,
              percentage: calculatePercentageChange(previous.active_connections, current.active_connections)
            },
            knowledgeItems: {
              value: current.knowledge_items,
              percentage: calculatePercentageChange(previous.knowledge_items, current.knowledge_items)
            },
            teamCollaborations: {
              value: current.team_collaborations,
              percentage: calculatePercentageChange(previous.team_collaborations, current.team_collaborations)
            },
            hoursSaved: {
              value: current.hours_saved,
              percentage: calculatePercentageChange(previous.hours_saved, current.hours_saved)
            }
          });

        try {
          // Attempt to fetch real stats if available
          const { data: realStats, error: statsError } = await supabase
            .rpc('get_dashboard_stats')
            .single();

          if (!statsError && realStats) {
            statsData = realStats;
          }

          // Attempt to fetch real historical data if available
          const { data: realHistoricalStats, error: historicalError } = await supabase
            .rpc('get_historical_stats')
            .single();

          if (!historicalError && realHistoricalStats) {
            historicalStats = realHistoricalStats;
          }
        } catch (error) {
          console.log('Using fallback data until database functions are set up');
        }

        if (historicalError) throw new Error(historicalError.message);

        if (statsData && historicalStats) {
          setStats({
            activeConnections: {
              value: statsData.active_connections || 0,
              percentage: calculatePercentageChange(
                historicalStats.previous_connections,
                statsData.active_connections
              ),
            },
            knowledgeItems: {
              value: statsData.knowledge_items || 0,
              percentage: calculatePercentageChange(
                historicalStats.previous_items,
                statsData.knowledge_items
              ),
            },
            teamCollaborations: {
              value: statsData.team_collaborations || 0,
              percentage: calculatePercentageChange(
                historicalStats.previous_collaborations,
                statsData.team_collaborations
              ),
            },
            hoursSaved: {
              value: statsData.hours_saved || 0,
              percentage: calculatePercentageChange(
                historicalStats.previous_hours,
                statsData.hours_saved
              ),
            },
          });
        }

        // Fetch trending topics
        const { data: topicsData, error: topicsError } = await supabase
          .rpc('get_trending_topics');

        if (topicsError) {
          throw new Error(`Failed to fetch trending topics: ${topicsError.message}`);
        }

        setTrendingTopics(topicsData || []);

        try {
          // Attempt to fetch real trending topics if available
          const { data: topicsData, error: topicsError } = await supabase
            .from('topics')
            .select('*')
            .order('views', { ascending: false })
            .limit(5);

          if (!topicsError && topicsData && topicsData.length > 0) {
            setTrendingTopics(
              topicsData.map((topic: any) => ({
                title: topic.title,
                views: topic.views,
                trending: determineTrend(topic.previous_views, topic.views)
              }))
            );
          } else {
            setTrendingTopics(
              fallbackTopics.map(topic => ({
                title: topic.title,
                views: topic.views,
                trending: determineTrend(topic.previous_views, topic.views)
              }))
            );
          }
        } catch (error) {
          console.log('Using fallback topics data');
          setTrendingTopics(
            fallbackTopics.map(topic => ({
              title: topic.title,
              views: topic.views,
              trending: determineTrend(topic.previous_views, topic.views)
            }))
          );
        }

        // Fetch recent activity
        const { data: activityData, error: activityError } = await supabase
          .rpc('get_recent_activity');

        if (activityError) {
          throw new Error(`Failed to fetch recent activity: ${activityError.message}`);
        }

        if (activityData) {
          setRecentActivity(
            activityData.map((activity: any) => ({
              ...activity,
              timestamp: formatRelativeTime(activity.timestamp)
            }))
          );
        }

        try {
          // Attempt to fetch real activity data if available
          const { data: activityData, error: activityError } = await supabase
            .from('activity_log')
            .select(`
              id,
              users!inner(full_name),
              action,
              topic,
              created_at,
              type
            `)
            .order('created_at', { ascending: false })
            .limit(5);

          if (!activityError && activityData && activityData.length > 0) {
            setRecentActivity(
              activityData.map((activity: any) => ({
                id: activity.id,
                user: activity.users.full_name,
                action: activity.action,
                topic: activity.topic,
                timestamp: formatRelativeTime(activity.created_at),
                type: activity.type
              }))
            );
          } else {
            setRecentActivity(fallbackActivity);
          }
        } catch (error) {
          console.log('Using fallback activity data');
          setRecentActivity(fallbackActivity);
        }

        if (activityData) {
          setRecentActivity(
            activityData.map((activity: any) => ({
              id: activity.id,
              user: activity.users.full_name,
              action: activity.action,
              topic: activity.topic,
              timestamp: formatRelativeTime(activity.created_at),
              type: activity.type
            }))
          );
        }

        // Use fallback data for suggested experts
        const fallbackExperts = [
          {
            id: "1",
            name: "Emma Davis",
            role: "Senior Architect",
            avatar: "ED",
            skills: ["System Design", "Scalability", "Cloud Architecture"],
            reason: "Expert in system architecture"
          },
          {
            id: "2",
            name: "Ryan Kumar",
            role: "Tech Lead",
            avatar: "RK",
            skills: ["React", "TypeScript", "Performance"],
            reason: "Specializes in frontend development"
          },
          {
            id: "3",
            name: "Sophie Anderson",
            role: "Security Engineer",
            avatar: "SA",
            skills: ["API Security", "OAuth", "Encryption"],
            reason: "Security domain expert"
          }
        ];

        try {
          // Attempt to fetch real suggested experts if available
          const { data: expertsData, error: expertsError } = await supabase
            .rpc('get_suggested_experts', { 
              user_id: (await supabase.auth.getUser()).data.user?.id || '' 
            })
            .limit(3);

          if (!expertsError && expertsData && expertsData.length > 0) {
            setSuggestedExperts(expertsData);
          } else {
            setSuggestedExperts(fallbackExperts);
          }
        } catch (error) {
          console.log('Using fallback experts data');
          setSuggestedExperts(fallbackExperts);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [accessToken]);

  const calculatePercentageChange = (previous: number, current: number) => {
    if (previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const determineTrend = (previous: number, current: number): 'up' | 'down' | 'neutral' => {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'neutral';
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
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Active Connections</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-slate-900 dark:text-slate-100">{stats.activeConnections.value}</span>
                      <span className="text-green-600 dark:text-green-400 text-sm">+{stats.activeConnections.percentage}%</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 text-blue-600 bg-opacity-10 dark:bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Knowledge Items</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-slate-900 dark:text-slate-100">{stats.knowledgeItems.value}</span>
                      <span className="text-green-600 dark:text-green-400 text-sm">+{stats.knowledgeItems.percentage}%</span>
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
                      <span className="text-green-600 dark:text-green-400 text-sm">+{stats.teamCollaborations.percentage}%</span>
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
                      <span className="text-green-600 dark:text-green-400 text-sm">+{stats.hoursSaved.percentage}%</span>
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
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div 
                      key={activity.id} 
                      className="flex items-start gap-3 pb-4 border-b dark:border-slate-700 last:border-0 last:pb-0"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm">
                          {activity.user.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-700 dark:text-slate-300">
                          <span>{activity.action}</span>
                          {' '}
                          <span className="text-slate-900 dark:text-slate-100">{activity.topic}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">{activity.type}</Badge>
                          <span className="text-slate-400 dark:text-slate-500 text-xs">{activity.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Trending Topics */}
            <Card>
              <CardHeader>
                <CardTitle>Trending Topics</CardTitle>
                <CardDescription>Popular across teams</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {trendingTopics.map((topic, index) => (
                    <div
                      key={topic.title}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600 dark:text-slate-400">{index + 1}.</span>
                        <span className="text-slate-900 dark:text-slate-100">{topic.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 dark:text-slate-400 text-sm">{topic.views}</span>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {suggestedExperts.map((expert) => (
                  <div
                    key={expert.id}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white">{expert.avatar}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-900 dark:text-slate-100">{expert.name}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">{expert.role}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {expert.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">{expert.reason}</p>
                    <button className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 border bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 w-full">
                      Connect
                      <Activity className="w-4 h-4 ml-2" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}