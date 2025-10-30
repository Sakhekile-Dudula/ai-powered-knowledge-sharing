import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Network, Users, GitBranch, ArrowRight, Calendar, Loader2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { ProjectGraph } from "./ProjectGraph";
import { toast } from "sonner";

interface ProjectConnectionsProps {
  accessToken?: string | null;
}

export function ProjectConnections({}: ProjectConnectionsProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Form state
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTeam, setNewTeam] = useState("");
  const [newTimeline, setNewTimeline] = useState("");
  const [newTags, setNewTags] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const { createClient } = await import("../utils/supabase/client");
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          profiles:created_by(full_name, avatar_url, department)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Failed to fetch projects:", error);
        toast.error("Failed to load projects");
        return;
      }

      if (data) {
        // Transform data to match expected format
        const transformedProjects = data.map(project => ({
          id: project.id,
          name: project.name,
          description: project.description,
          team: project.profiles?.department || 'Unknown',
          timeline: project.created_at ? new Date(project.created_at).toLocaleDateString() : '',
          tags: project.tags || [],
          status: project.status || 'active',
          progress: 50, // Default progress
          members: 1,
          connectedProjects: [],
          created_by: project.profiles?.full_name || 'Unknown'
        }));
        setProjects(transformedProjects);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = (project: any) => {
    setSelectedProject(project);
    setIsDetailDialogOpen(true);
  };

  const handleInsightAction = (action: string) => {
    toast.success(`Action: ${action}`, {
      description: "This feature will help you coordinate better.",
    });
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { createClient } = await import("../utils/supabase/client");
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to create a project");
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('projects')
        .insert([{
          name: newName,
          description: newDescription,
          tags: newTags.split(",").map(t => t.trim()).filter(Boolean),
          status: 'active',
          created_by: user.id
        }]);

      if (error) {
        console.error("Failed to add project:", error);
        toast.error("Failed to create project");
      } else {
        toast.success("Project created successfully!");
        setIsDialogOpen(false);
        setNewName("");
        setNewDescription("");
        setNewTeam("");
        setNewTimeline("");
        setNewTags("");
        await fetchProjects();
      }
    } catch (error) {
      console.error("Failed to add project:", error);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }


  const connections = [
    {
      from: "Client Portal Redesign",
      to: "Analytics Dashboard",
      type: "Shared Components",
      strength: "Strong",
    },
    {
      from: "Cloud Migration",
      to: "Security Framework",
      type: "Infrastructure Dependency",
      strength: "Critical",
    },
    {
      from: "Analytics Dashboard",
      to: "Data Pipeline",
      type: "Data Flow",
      strength: "Strong",
    },
  ];

  const insights = [
    {
      title: "Shared Team Members",
      description: "3 engineers are working on both Client Portal and Analytics Dashboard",
      action: "Coordinate sprints",
    },
    {
      title: "Common Dependencies",
      description: "Security Framework impacts 4 active projects",
      action: "Review timeline",
    },
    {
      title: "Knowledge Transfer",
      description: "Cloud Migration team has insights useful for Platform API project",
      action: "Schedule sync",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Progress":
        return "bg-blue-100 text-blue-700";
      case "Planning":
        return "bg-purple-100 text-purple-700";
      case "Completed":
        return "bg-green-100 text-green-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Graph Dialog */}
      <ProjectGraph
        open={isGraphOpen}
        onOpenChange={setIsGraphOpen}
        projects={projects}
      />

      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-slate-900 dark:text-slate-100 mb-1">Project Network</h2>
              <p className="text-slate-600 dark:text-slate-400">Discover connections and dependencies across projects</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsGraphOpen(true)}>
                <Network className="w-4 h-4 mr-2" />
                View Graph
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>
                      Add a new project to track and connect with your team
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddProject} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Project Name</Label>
                      <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
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
                      <Label>Team</Label>
                      <Input
                        value={newTeam}
                        onChange={(e) => setNewTeam(e.target.value)}
                        placeholder="Product & Engineering"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Timeline</Label>
                      <Input
                        value={newTimeline}
                        onChange={(e) => setNewTimeline(e.target.value)}
                        placeholder="Q4 2025"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tags (comma-separated)</Label>
                      <Input
                        value={newTags}
                        onChange={(e) => setNewTags(e.target.value)}
                        placeholder="Frontend, UX, API"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Project"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Projects */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-slate-900 dark:text-slate-100">Active Projects</h3>
          {projects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-600 dark:text-slate-400 mb-4">No projects yet. Create your first project to get started.</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Project
                </Button>
              </CardContent>
            </Card>
          ) : (
            projects.map((project, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-slate-900 dark:text-slate-100 mb-1">{project.name}</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{project.description}</p>
                  </div>
                  <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                </div>

                {project.progress !== undefined && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-600 dark:text-slate-400">Progress</span>
                      <span className="text-slate-900 dark:text-slate-100">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {project.members && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                      <Users className="w-4 h-4" />
                      {project.members} members
                    </div>
                  )}
                  {project.timeline && (
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                      <Calendar className="w-4 h-4" />
                      {project.timeline}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">Team</p>
                  <Badge variant="outline">{project.team}</Badge>
                </div>

                {project.tags && project.tags.length > 0 && (
                  <div className="mb-4">
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">Technologies</p>
                    <div className="flex flex-wrap gap-1">
                      {project.tags.map((tag: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    {project.connectedProjects && project.connectedProjects.length > 0 ? (
                      <div>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">Connected Projects</p>
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700 dark:text-slate-300 text-sm">
                            {project.connectedProjects.join(", ")}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-500 dark:text-slate-400 text-sm">No connected projects yet</div>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleViewDetails(project)}>
                      View Details
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Key Connections */}
          <Card>
            <CardHeader>
              <CardTitle>Key Connections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {connections.map((connection, index) => (
                  <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="text-slate-700 dark:text-slate-300 text-sm">{connection.from}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-4 mb-2">
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-600 dark:text-slate-400 text-xs">{connection.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span className="text-slate-700 dark:text-slate-300 text-sm">{connection.to}</span>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`mt-2 text-xs ${
                        connection.strength === "Critical"
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {connection.strength}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <CardTitle>AI Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <div key={index} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                    <p className="text-slate-900 dark:text-slate-100 text-sm mb-1">{insight.title}</p>
                    <p className="text-slate-600 dark:text-slate-400 text-xs mb-2">{insight.description}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-xs"
                      onClick={() => handleInsightAction(insight.action)}
                    >
                      {insight.action}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Project Details Dialog */}
      {selectedProject && isDetailDialogOpen && (
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedProject.name}</DialogTitle>
              <DialogDescription>{selectedProject.description || "Project details"}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Status</p>
                  <Badge className={getStatusColor(selectedProject.status)}>
                    {selectedProject.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Team</p>
                  <Badge variant="outline">{selectedProject.team}</Badge>
                </div>
              </div>
              
              {selectedProject.timeline && (
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Timeline</p>
                  <p className="text-slate-900 dark:text-slate-100">{selectedProject.timeline}</p>
                </div>
              )}
              
              {selectedProject.progress !== undefined && (
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Progress: {selectedProject.progress}%</p>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all"
                      style={{ width: `${selectedProject.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              {selectedProject.members && (
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Team Members</p>
                  <p className="text-slate-900 dark:text-slate-100">{selectedProject.members} members</p>
                </div>
              )}
              
              {selectedProject.tags && selectedProject.tags.length > 0 && (
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Technologies</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.tags.map((tag: string, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedProject.connectedProjects && selectedProject.connectedProjects.length > 0 && (
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Connected Projects</p>
                  <div className="space-y-1">
                    {selectedProject.connectedProjects.map((proj: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                        <GitBranch className="w-4 h-4 text-slate-400" />
                        {proj}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
