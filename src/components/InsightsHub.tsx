import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Lightbulb, TrendingUp, AlertCircle, CheckCircle, Clock, ThumbsUp, MessageSquare, Share2, Loader2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ScrollArea } from "./ui/scroll-area";
import { projectId } from "../utils/supabase/info";
import { toast } from "sonner";

interface InsightsHubProps {
  accessToken: string | null;
}

export function InsightsHub({ accessToken }: InsightsHubProps) {
  const [insights, setInsights] = useState<any[]>([]);
  const [filteredInsights, setFilteredInsights] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Dialog states
  const [isTrendingDialogOpen, setIsTrendingDialogOpen] = useState(false);
  const [selectedTrendingTopic, setSelectedTrendingTopic] = useState<string>("");
  const [isImpactDialogOpen, setIsImpactDialogOpen] = useState(false);
  const [selectedImpactStat, setSelectedImpactStat] = useState<string>("");
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  // Form state
  const [newType, setNewType] = useState("tip");
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newImpact, setNewImpact] = useState("Medium");
  const [newTags, setNewTags] = useState("");

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d5b5d02c/insights`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setInsights(data.insights);
        setFilteredInsights(data.insights);
      }
    } catch (error) {
      console.error("Failed to fetch insights:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddInsight = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d5b5d02c/insights`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            type: newType,
            title: newTitle,
            description: newDescription,
            impact: newImpact,
            tags: newTags.split(",").map(t => t.trim()).filter(Boolean),
          }),
        }
      );

      if (response.ok) {
        setIsDialogOpen(false);
        setNewType("tip");
        setNewTitle("");
        setNewDescription("");
        setNewImpact("Medium");
        setNewTags("");
        fetchInsights();
        toast.success("Insight shared successfully!");
      }
    } catch (error) {
      console.error("Failed to add insight:", error);
      toast.error("Failed to share insight");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (insightId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d5b5d02c/insights/${insightId}/like`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.ok) {
        fetchInsights();
      }
    } catch (error) {
      console.error("Failed to like insight:", error);
    }
  };

  const handleTrendingTopicClick = (topic: string) => {
    setSelectedTrendingTopic(topic);
    // Filter insights by topic name in title or tags
    const filtered = insights.filter(insight => 
      insight.title.toLowerCase().includes(topic.toLowerCase()) ||
      insight.tags?.some((tag: string) => tag.toLowerCase().includes(topic.toLowerCase()))
    );
    setFilteredInsights(filtered);
    setIsTrendingDialogOpen(true);
  };

  const handleImpactStatClick = (stat: string) => {
    setSelectedImpactStat(stat);
    setIsImpactDialogOpen(true);
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    // Filter insights by category in tags
    const filtered = insights.filter(insight =>
      insight.tags?.some((tag: string) => tag.toLowerCase() === category.toLowerCase())
    );
    setFilteredInsights(filtered);
    setIsCategoryDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const trendingInsights = [
    { topic: "Cloud Migration Strategies", views: 234, trend: "+45%" },
    { topic: "Microservices Best Practices", views: 189, trend: "+32%" },
    { topic: "React Performance Tips", views: 156, trend: "+28%" },
    { topic: "Security Compliance", views: 142, trend: "+21%" },
  ];

  const impactStats = [
    { label: "Insights Shared", value: 8, description: "Total insights you've contributed" },
    { label: "Total Likes", value: 142, description: "People who found your insights helpful" },
    { label: "Comments", value: 67, description: "Discussions started by your insights" },
    { label: "People Helped", value: 234, description: "Unique individuals reached" },
  ];

  const categories = [
    { name: "Engineering", count: 24 },
    { name: "Product", count: 18 },
    { name: "Design", count: 15 },
    { name: "Security", count: 21 },
    { name: "DevOps", count: 19 },
    { name: "Data", count: 12 },
  ];

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "success":
        return CheckCircle;
      case "warning":
        return AlertCircle;
      case "learning":
        return Lightbulb;
      default:
        return Lightbulb;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-100 text-green-700";
      case "warning":
        return "bg-red-100 text-red-700";
      case "learning":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-purple-100 text-purple-700";
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "Critical":
        return "bg-red-100 text-red-700";
      case "High":
        return "bg-orange-100 text-orange-700";
      case "Medium":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  // Mock activity data for impact stats
  const mockActivityData = {
    "Insights Shared": [
      { title: "React Performance Optimization", date: "2 days ago", likes: 23 },
      { title: "API Design Best Practices", date: "1 week ago", likes: 45 },
      { title: "Security Tips for Web Apps", date: "2 weeks ago", likes: 34 },
    ],
    "Total Likes": [
      { insight: "React Performance Optimization", likes: 23, date: "2 days ago" },
      { insight: "API Design Best Practices", likes: 45, date: "1 week ago" },
      { insight: "Security Tips for Web Apps", likes: 34, date: "2 weeks ago" },
    ],
    "Comments": [
      { insight: "React Performance Optimization", comments: 12, lastComment: "1 hour ago" },
      { insight: "API Design Best Practices", comments: 28, lastComment: "3 hours ago" },
      { insight: "Security Tips for Web Apps", comments: 27, lastComment: "1 day ago" },
    ],
    "People Helped": [
      { person: "John Doe", insight: "React Performance Optimization", date: "2 days ago" },
      { person: "Jane Smith", insight: "API Design Best Practices", date: "1 week ago" },
      { person: "Mike Johnson", insight: "Security Tips for Web Apps", date: "2 weeks ago" },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-slate-900 dark:text-slate-100 mb-1">Insights Hub</h2>
              <p className="text-slate-600 dark:text-slate-400">Share learnings and discover what's working across teams</p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Share Insight
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share an Insight</DialogTitle>
                  <DialogDescription>
                    Share learnings, best practices, or important updates with your team
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddInsight} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={newType} onValueChange={setNewType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="success">Success Story</SelectItem>
                        <SelectItem value="learning">Learning</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="tip">Tip</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Impact</Label>
                    <Select value={newImpact} onValueChange={setNewImpact}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Critical">Critical</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tags (comma-separated)</Label>
                    <Input
                      value={newTags}
                      onChange={(e) => setNewTags(e.target.value)}
                      placeholder="Performance, API, Optimization"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sharing...
                      </>
                    ) : (
                      "Share Insight"
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-4">
          {insights.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-600 dark:text-slate-400 mb-4">No insights yet. Be the first to share!</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Share Insight
                </Button>
              </CardContent>
            </Card>
          ) : (
            insights.map((insight) => {
            const Icon = getInsightIcon(insight.type);
            return (
              <Card key={insight.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 ${getInsightColor(insight.type)} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h3 className="text-slate-900 dark:text-slate-100">{insight.title}</h3>
                        <Badge className={getImpactColor(insight.impact)}>{insight.impact} Impact</Badge>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 mb-3">{insight.description}</p>

                      {insight.tags && insight.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {insight.tags.map((tag: string, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                            <span>{insight.author}</span>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">{insight.team}</Badge>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {insight.date}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleLike(insight.id)}
                            className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span className="text-sm">{insight.likes || 0}</span>
                          </button>
                          <button 
                            className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            onClick={() => toast.info("Opening comments")}
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span className="text-sm">{insight.comments || 0}</span>
                          </button>
                          <button 
                            className="flex items-center gap-1 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            onClick={() => toast.success("Insight shared!")}
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }))}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Trending Topics - Now Clickable */}
          <Card>
            <CardHeader>
              <CardTitle>Trending Topics</CardTitle>
              <CardDescription>Most viewed this week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trendingInsights.map((item, index) => (
                  <div 
                    key={index} 
                    className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer"
                    onClick={() => handleTrendingTopicClick(item.topic)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-900 dark:text-slate-100 text-sm">{item.topic}</span>
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 text-xs">{item.views} views</span>
                      <span className="text-green-600 text-xs">{item.trend}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Your Impact - Now Clickable */}
          <Card>
            <CardHeader>
              <CardTitle>Your Impact</CardTitle>
              <CardDescription>Click to view details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {impactStats.map((stat, index) => (
                  <button
                    key={index}
                    onClick={() => handleImpactStatClick(stat.label)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <span className="text-slate-600 dark:text-slate-400 text-sm">{stat.label}</span>
                    <span className="text-slate-900 dark:text-slate-100">{stat.value}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Categories - Now Clickable */}
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Filter by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {categories.map((category, index) => (
                  <button
                    key={index}
                    onClick={() => handleCategoryClick(category.name)}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
                  >
                    <span className="text-slate-700 dark:text-slate-300 text-sm">{category.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {category.count}
                    </Badge>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Trending Topic Dialog */}
      {selectedTrendingTopic && (
        <Dialog open={isTrendingDialogOpen} onOpenChange={setIsTrendingDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{selectedTrendingTopic}</DialogTitle>
              <DialogDescription>
                All insights related to {selectedTrendingTopic}
              </DialogDescription>
            </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {filteredInsights.length === 0 ? (
              <p className="text-center py-8 text-slate-500 dark:text-slate-400">
                No insights found for this topic yet.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredInsights.map((insight) => {
                  const Icon = getInsightIcon(insight.type);
                  return (
                    <div key={insight.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 ${getInsightColor(insight.type)} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-slate-900 dark:text-slate-100 mb-1">{insight.title}</h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{insight.description}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>{insight.author}</span>
                            <span>•</span>
                            <span>{insight.date}</span>
                            <span>•</span>
                            <span>{insight.likes} likes</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      )}

      {/* Impact Activity Dialog */}
      {selectedImpactStat && (
        <Dialog open={isImpactDialogOpen} onOpenChange={setIsImpactDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedImpactStat}</DialogTitle>
            <DialogDescription>
              Your activity for {selectedImpactStat}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-3">
              {selectedImpactStat && mockActivityData[selectedImpactStat as keyof typeof mockActivityData]?.map((item: any, index: number) => (
                <div key={index} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                  {selectedImpactStat === "Insights Shared" && (
                    <>
                      <h4 className="text-slate-900 dark:text-slate-100 mb-2">{item.title}</h4>
                      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <span>{item.date}</span>
                        <span>•</span>
                        <span>{item.likes} likes</span>
                      </div>
                    </>
                  )}
                  {selectedImpactStat === "Total Likes" && (
                    <>
                      <h4 className="text-slate-900 dark:text-slate-100 mb-2">{item.insight}</h4>
                      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <span>{item.likes} likes</span>
                        <span>•</span>
                        <span>{item.date}</span>
                      </div>
                    </>
                  )}
                  {selectedImpactStat === "Comments" && (
                    <>
                      <h4 className="text-slate-900 dark:text-slate-100 mb-2">{item.insight}</h4>
                      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <span>{item.comments} comments</span>
                        <span>•</span>
                        <span>Last comment {item.lastComment}</span>
                      </div>
                    </>
                  )}
                  {selectedImpactStat === "People Helped" && (
                    <>
                      <h4 className="text-slate-900 dark:text-slate-100 mb-2">{item.person}</h4>
                      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <span>Found helpful: {item.insight}</span>
                        <span>•</span>
                        <span>{item.date}</span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      )}

      {/* Category Filter Dialog */}
      {selectedCategory && (
        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedCategory} Insights</DialogTitle>
            <DialogDescription>
              All insights tagged with {selectedCategory}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {filteredInsights.length === 0 ? (
              <p className="text-center py-8 text-slate-500 dark:text-slate-400">
                No insights found in this category yet.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredInsights.map((insight) => {
                  const Icon = getInsightIcon(insight.type);
                  return (
                    <div key={insight.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 ${getInsightColor(insight.type)} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="text-slate-900 dark:text-slate-100">{insight.title}</h4>
                            <Badge className={`${getImpactColor(insight.impact)} text-xs`}>{insight.impact}</Badge>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{insight.description}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>{insight.author}</span>
                            <span>•</span>
                            <span>{insight.date}</span>
                            <span>•</span>
                            <span>{insight.likes} likes</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
