import { useState, useEffect } from "react";
import { 
  TrendingUp, Users, MessageSquare, FileText, Award, 
  BarChart3, PieChart, Activity, Target, Zap
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { createClient } from "../utils/supabase/client";
import { toast } from "sonner";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AnalyticsProps {
  accessToken: string;
}

interface EngagementMetrics {
  total_users: number;
  active_users_7d: number;
  active_users_30d: number;
  total_questions: number;
  answered_questions: number;
  total_knowledge_items: number;
  total_connections: number;
  avg_response_time_hours: number;
}

interface TopContributor {
  user_id: string;
  full_name: string;
  department: string;
  role: string;
  reputation_score: number;
  questions_asked: number;
  answers_given: number;
  accepted_answers: number;
  knowledge_items_created: number;
}

interface TrendingTopic {
  topic: string;
  mention_count: number;
  trend_direction: string;
}

interface ActivityData {
  date: string;
  questions_count: number;
  answers_count: number;
  knowledge_items_count: number;
  messages_count: number;
}

interface SkillData {
  skill: string;
  user_count: number;
  avg_reputation: number;
}

export function EnhancedAnalytics({ accessToken: _accessToken }: AnalyticsProps) {
  const [metrics, setMetrics] = useState<EngagementMetrics | null>(null);
  const [contributors, setContributors] = useState<TopContributor[]>([]);
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [skillsData, setSkillsData] = useState<SkillData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch all analytics data in parallel
      const [metricsRes, contributorsRes, trendingRes, activityRes, skillsRes] = await Promise.all([
        supabase.rpc('get_engagement_metrics'),
        supabase.rpc('get_top_contributors', { limit_count: 10 }),
        supabase.rpc('get_trending_topics', { days: 7 }),
        supabase.rpc('get_activity_timeline', { days: 30 }),
        supabase.rpc('get_skills_distribution')
      ]);

      if (metricsRes.data) setMetrics(metricsRes.data[0]);
      if (contributorsRes.data) setContributors(contributorsRes.data);
      if (trendingRes.data) setTrending(trendingRes.data);
      if (activityRes.data) setActivityData(activityRes.data);
      if (skillsRes.data) setSkillsData(skillsRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'rising':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'falling':
        return <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />;
      default:
        return <Activity className="w-4 h-4 text-blue-600" />;
    }
  };

  // Activity Timeline Chart Data
  const activityChartData = {
    labels: activityData.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Questions',
        data: activityData.map(d => d.questions_count),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Answers',
        data: activityData.map(d => d.answers_count),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Knowledge Items',
        data: activityData.map(d => d.knowledge_items_count),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  // Skills Distribution Chart Data
  const skillsChartData = {
    labels: skillsData.slice(0, 10).map(s => s.skill),
    datasets: [{
      label: 'Number of Users',
      data: skillsData.slice(0, 10).map(s => s.user_count),
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(251, 146, 60, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(14, 165, 233, 0.8)',
        'rgba(132, 204, 22, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(99, 102, 241, 0.8)'
      ]
    }]
  };

  // Engagement Pie Chart
  const engagementChartData = metrics ? {
    labels: ['Active (7d)', 'Active (30d)', 'Inactive'],
    datasets: [{
      data: [
        metrics.active_users_7d,
        metrics.active_users_30d - metrics.active_users_7d,
        metrics.total_users - metrics.active_users_30d
      ],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(148, 163, 184, 0.5)'
      ]
    }]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-500 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Advanced Analytics</h2>
          <p className="text-slate-600 dark:text-slate-400">Insights and performance metrics</p>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="w-8 h-8 text-blue-600" />
                <Badge variant="secondary">{((metrics.active_users_7d / metrics.total_users) * 100).toFixed(0)}% active</Badge>
              </div>
              <h3 className="text-2xl font-bold mb-1">{metrics.total_users}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Users</p>
              <p className="text-xs text-slate-500 mt-2">
                {metrics.active_users_7d} active this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <MessageSquare className="w-8 h-8 text-green-600" />
                <Badge variant="secondary">{((metrics.answered_questions / metrics.total_questions) * 100).toFixed(0)}% answered</Badge>
              </div>
              <h3 className="text-2xl font-bold mb-1">{metrics.total_questions}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Questions Asked</p>
              <p className="text-xs text-slate-500 mt-2">
                {metrics.answered_questions} have answers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-8 h-8 text-purple-600" />
                <Badge variant="secondary">
                  <Zap className="w-3 h-3 mr-1" />
                  Growing
                </Badge>
              </div>
              <h3 className="text-2xl font-bold mb-1">{metrics.total_knowledge_items}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Knowledge Items</p>
              <p className="text-xs text-slate-500 mt-2">
                Shared across teams
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Target className="w-8 h-8 text-orange-600" />
                <Badge variant="secondary">
                  {metrics.avg_response_time_hours?.toFixed(1)}h avg
                </Badge>
              </div>
              <h3 className="text-2xl font-bold mb-1">{metrics.total_connections}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">Active Connections</p>
              <p className="text-xs text-slate-500 mt-2">
                Cross-team collaboration
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contributors">Contributors</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Activity Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Activity Timeline (30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Line data={activityChartData} options={chartOptions} />
                </div>
              </CardContent>
            </Card>

            {/* User Engagement */}
            {engagementChartData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    User Engagement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <Doughnut 
                      data={engagementChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom' as const,
                          },
                        },
                      }} 
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Contributors Tab */}
        <TabsContent value="contributors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Top Contributors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contributors.map((contributor, index) => (
                  <div
                    key={contributor.user_id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {index < 3 ? (
                            <Award className="w-6 h-6" fill="currentColor" />
                          ) : (
                            getInitials(contributor.full_name)
                          )}
                        </div>
                        {index < 3 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{contributor.full_name}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {contributor.role} • {contributor.department}
                        </p>
                        <div className="flex gap-4 mt-2 text-xs text-slate-500">
                          <span>{contributor.answers_given} answers</span>
                          <span>{contributor.accepted_answers} accepted</span>
                          <span>{contributor.knowledge_items_created} items</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600">
                        {contributor.reputation_score}
                      </div>
                      <p className="text-xs text-slate-500">reputation</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Skills Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <Bar 
                    data={skillsChartData} 
                    options={{
                      ...chartOptions,
                      indexAxis: 'y' as const,
                    }} 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skills by Expertise Level</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {skillsData.slice(0, 10).map((skill, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{skill.skill}</span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {skill.user_count} users
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-600 to-pink-500 h-2 rounded-full transition-all"
                          style={{ width: `${(skill.user_count / skillsData[0].user_count) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Trending Topics (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {trending.map((topic, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="secondary" className="text-xs">
                        #{index + 1}
                      </Badge>
                      {getTrendIcon(topic.trend_direction)}
                    </div>
                    <h4 className="font-semibold text-lg mb-1">{topic.topic}</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {topic.mention_count} mentions
                    </p>
                    <Badge
                      variant={
                        topic.trend_direction === 'rising'
                          ? 'default'
                          : topic.trend_direction === 'falling'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="mt-2 text-xs"
                    >
                      {topic.trend_direction}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
