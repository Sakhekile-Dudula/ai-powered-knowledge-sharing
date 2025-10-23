import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { 
  Building2, 
  Search, 
  ArrowRight, 
  Users, 
  Calendar, 
  TrendingUp,
  Filter,
  X,
  CheckCircle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface Project {
  id: string;
  name: string;
  team: string;
  status: string;
  connectedProjects?: string[];
  tags?: string[];
  description?: string;
  members?: number;
  timeline?: string;
  progress?: number;
}

interface ProjectGraphProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
}

const MRI_DEPARTMENTS = [
  "Application Administration",
  "Business Operations",
  "Client Experience",
  "Client Support",
  "Diversity, Equity, & Inclusion",
  "Education Services",
  "Finance",
  "GRC Team",
  "IT",
  "InfoSec",
  "Revenue Applications",
  "Legal",
  "MACS-Everyone",
  "Managed Services",
  "Marketing",
  "Partner Connect",
  "Product Central (UC)",
  "Professional Services",
  "Sales",
  "Sales Enablement",
  "Sales Engineering",
  "Solution Practice - NA",
  "Talent Management",
  "Workplace Experience",
];

const DEPARTMENT_COLORS: Record<string, string> = {
  "Application Administration": "from-blue-500 to-blue-600",
  "Business Operations": "from-purple-500 to-purple-600",
  "Client Experience": "from-pink-500 to-pink-600",
  "Client Support": "from-rose-500 to-rose-600",
  "Diversity, Equity, & Inclusion": "from-amber-500 to-amber-600",
  "Education Services": "from-green-500 to-green-600",
  "Finance": "from-cyan-500 to-cyan-600",
  "GRC Team": "from-indigo-500 to-indigo-600",
  "IT": "from-blue-500 to-cyan-500",
  "InfoSec": "from-red-500 to-orange-600",
  "Revenue Applications": "from-emerald-500 to-emerald-600",
  "Legal": "from-slate-500 to-slate-600",
  "MACS-Everyone": "from-violet-500 to-violet-600",
  "Managed Services": "from-teal-500 to-teal-600",
  "Marketing": "from-fuchsia-500 to-fuchsia-600",
  "Partner Connect": "from-lime-500 to-lime-600",
  "Product Central (UC)": "from-sky-500 to-sky-600",
  "Professional Services": "from-orange-500 to-orange-600",
  "Sales": "from-yellow-500 to-yellow-600",
  "Sales Enablement": "from-green-500 to-teal-600",
  "Sales Engineering": "from-blue-500 to-indigo-600",
  "Solution Practice - NA": "from-purple-500 to-pink-600",
  "Talent Management": "from-rose-500 to-pink-600",
  "Workplace Experience": "from-cyan-500 to-blue-600",
};

export function ProjectGraph({ open, onOpenChange, projects }: ProjectGraphProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isProjectDetailOpen, setIsProjectDetailOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"all" | "grid">("all");

  // Group projects by department
  const projectsByDepartment = useMemo(() => {
    const grouped = new Map<string, Project[]>();
    
    MRI_DEPARTMENTS.forEach((dept) => {
      grouped.set(dept, []);
    });

    projects.forEach((project) => {
      const dept = project.team;
      if (grouped.has(dept)) {
        grouped.get(dept)!.push(project);
      } else {
        grouped.set(dept, [project]);
      }
    });

    return grouped;
  }, [projects]);

  // Filter departments and projects
  const filteredDepartments = useMemo(() => {
    let depts = Array.from(projectsByDepartment.entries());

    // Filter by search query
    if (searchQuery) {
      depts = depts.filter(([dept, projs]) => {
        const deptMatch = dept.toLowerCase().includes(searchQuery.toLowerCase());
        const projMatch = projs.some(p => 
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return deptMatch || projMatch;
      });
    }

    // Filter by selected department
    if (selectedDepartment) {
      depts = depts.filter(([dept]) => dept === selectedDepartment);
    }

    // Filter projects within departments by status
    if (statusFilter) {
      depts = depts.map(([dept, projs]) => [
        dept,
        projs.filter(p => p.status === statusFilter)
      ] as [string, Project[]]).filter(([_, projs]) => projs.length > 0);
    }

    return depts;
  }, [projectsByDepartment, searchQuery, selectedDepartment, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const departmentsWithProjects = Array.from(projectsByDepartment.values()).filter(
      projs => projs.length > 0
    ).length;
    const inProgress = projects.filter(p => p.status === "In Progress").length;
    const completed = projects.filter(p => p.status === "Completed").length;
    
    return { totalProjects, departmentsWithProjects, inProgress, completed };
  }, [projects, projectsByDepartment]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Progress":
        return "bg-blue-500";
      case "Planning":
        return "bg-purple-500";
      case "Completed":
        return "bg-green-500";
      default:
        return "bg-slate-500";
    }
  };

  const getDepartmentColor = (dept: string) => {
    return DEPARTMENT_COLORS[dept] || "from-slate-500 to-slate-600";
  };

  const getConnectedProjects = (project: Project) => {
    if (!project.connectedProjects) return [];
    return project.connectedProjects
      .map(name => projects.find(p => p.name === name))
      .filter(Boolean) as Project[];
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[95vh] w-full p-0 flex flex-col overflow-hidden" aria-describedby="graph-description">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b dark:border-slate-700 shrink-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                MRI Software Project Network
              </DialogTitle>
              <DialogDescription id="graph-description">
                Explore {stats.totalProjects} projects across {stats.departmentsWithProjects} departments
              </DialogDescription>
            </DialogHeader>

            {/* Stats - Improved Visual Hierarchy */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border-2 border-blue-200 dark:border-blue-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-blue-600 dark:text-blue-400">Total Projects</p>
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="text-2xl text-blue-900 dark:text-blue-100">{stats.totalProjects}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border-2 border-purple-200 dark:border-purple-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-purple-600 dark:text-purple-400">Departments</p>
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <p className="text-2xl text-purple-900 dark:text-purple-100">{stats.departmentsWithProjects}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border-2 border-green-200 dark:border-green-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-green-600 dark:text-green-400">In Progress</p>
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <p className="text-2xl text-green-900 dark:text-green-100">{stats.inProgress}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border-2 border-cyan-200 dark:border-cyan-800 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-cyan-600 dark:text-cyan-400">Completed</p>
                  <div className="w-8 h-8 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                </div>
                <p className="text-2xl text-cyan-900 dark:text-cyan-100">{stats.completed}</p>
              </div>
            </div>

            {/* Filters - Improved Layout */}
            <div className="flex flex-col gap-3 mt-5">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                <Input
                  placeholder="Search departments or projects..."
                  className="pl-10 h-11 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400 mr-1">Filter:</span>
                <Button
                  variant={statusFilter === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(null)}
                  className="h-9"
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === "In Progress" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("In Progress")}
                  className="h-9"
                >
                  In Progress
                </Button>
                <Button
                  variant={statusFilter === "Planning" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("Planning")}
                  className="h-9"
                >
                  Planning
                </Button>
                <Button
                  variant={statusFilter === "Completed" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("Completed")}
                  className="h-9"
                >
                  Completed
                </Button>
              </div>

              {(searchQuery || selectedDepartment || statusFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedDepartment(null);
                    setStatusFilter(null);
                  }}
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Content - Scrollable Area */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
                {filteredDepartments.length === 0 ? (
                  <div className="text-center py-12">
                    <Building2 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500 dark:text-slate-400">
                      No departments or projects found matching your filters
                    </p>
                  </div>
                ) : (
                  filteredDepartments.map(([department, deptProjects]) => (
                    <div key={department} className="space-y-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800">
                      {/* Department Header - Improved */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 bg-gradient-to-br ${getDepartmentColor(department)} rounded-xl flex items-center justify-center shadow-lg shrink-0`}>
                            <Building2 className="w-7 h-7 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg text-slate-900 dark:text-slate-100 mb-1">
                              {department}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {deptProjects.length} project{deptProjects.length !== 1 ? 's' : ''} • {deptProjects.filter(p => p.status === "In Progress").length} active
                            </p>
                          </div>
                        </div>
                        
                        {deptProjects.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {Array.from(new Set(deptProjects.map(p => p.status))).map(status => (
                              <Badge key={status} variant="outline" className="gap-1 text-xs">
                                <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                                {deptProjects.filter(p => p.status === status).length} {status}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Projects Grid - Improved Cards */}
                      {deptProjects.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {deptProjects.map((project) => {
                            const connectedProjects = getConnectedProjects(project);
                            
                            return (
                              <div
                                key={project.id}
                                className="group bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-600 hover:scale-[1.02] transition-all cursor-pointer"
                                onClick={() => {
                                  setSelectedProject(project);
                                  setIsProjectDetailOpen(true);
                                }}
                              >
                                {/* Project Header - Improved */}
                                <div className="flex items-start justify-between mb-4">
                                  <h4 className="text-base text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 flex-1 pr-2">
                                    {project.name}
                                  </h4>
                                  <Badge className={`${getStatusColor(project.status)} text-white text-xs shrink-0 px-2 py-1`}>
                                    {project.status}
                                  </Badge>
                                </div>

                                {/* Description */}
                                {project.description && (
                                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                                    {project.description}
                                  </p>
                                )}

                                {/* Meta Info */}
                                <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
                                  {project.members && (
                                    <div className="flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      {project.members}
                                    </div>
                                  )}
                                  {project.timeline && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      {project.timeline}
                                    </div>
                                  )}
                                  {project.progress !== undefined && (
                                    <div className="flex items-center gap-1">
                                      <TrendingUp className="w-3 h-3" />
                                      {project.progress}%
                                    </div>
                                  )}
                                </div>

                                {/* Progress Bar */}
                                {project.progress !== undefined && (
                                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mb-3">
                                    <div
                                      className={`h-1.5 rounded-full ${getStatusColor(project.status)}`}
                                      style={{ width: `${project.progress}%` }}
                                    />
                                  </div>
                                )}

                                {/* Tags */}
                                {project.tags && project.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-3">
                                    {project.tags.slice(0, 3).map((tag, idx) => (
                                      <Badge key={idx} variant="secondary" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                    {project.tags.length > 3 && (
                                      <Badge variant="secondary" className="text-xs">
                                        +{project.tags.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                )}

                                {/* Connected Projects */}
                                {connectedProjects.length > 0 && (
                                  <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                      <ArrowRight className="w-3 h-3" />
                                      <span className="line-clamp-1">
                                        Connected to {connectedProjects.length} project{connectedProjects.length !== 1 ? 's' : ''}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-8 text-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
                          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                          <p className="text-slate-400 dark:text-slate-500 text-sm">
                            No projects in this department
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Project Details Modal - Separate Dialog */}
    {selectedProject && isProjectDetailOpen && (
      <Dialog open={isProjectDetailOpen} onOpenChange={setIsProjectDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>{selectedProject.name}</DialogTitle>
            <DialogDescription>
              {selectedProject.description || "Project details"}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Badge className={`${getStatusColor(selectedProject.status)} text-white`}>
                  {selectedProject.status}
                </Badge>
                <Badge variant="outline" className="gap-2">
                  <Building2 className="w-3 h-3" />
                  {selectedProject.team}
                </Badge>
              </div>

              {selectedProject.progress !== undefined && (
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Progress</span>
                    <span className="text-sm text-slate-900 dark:text-slate-100">{selectedProject.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getStatusColor(selectedProject.status)}`}
                      style={{ width: `${selectedProject.progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedProject.members && (
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Team Members</p>
                    <p className="text-slate-900 dark:text-slate-100">{selectedProject.members}</p>
                  </div>
                )}
                {selectedProject.timeline && (
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Timeline</p>
                    <p className="text-slate-900 dark:text-slate-100">{selectedProject.timeline}</p>
                  </div>
                )}
              </div>

              {selectedProject.tags && selectedProject.tags.length > 0 && (
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Technologies</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.tags.map((tag, idx) => (
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
                  <div className="space-y-2">
                    {getConnectedProjects(selectedProject).map((connProject) => (
                      <div
                        key={connProject.id}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedProject(connProject);
                        }}
                      >
                        <div>
                          <p className="text-sm text-slate-900 dark:text-slate-100">{connProject.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{connProject.team}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}
