import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Search, Filter, FileText, MessageSquare, Code, BookOpen, ArrowRight, Clock, User, Loader2, Plus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { buildApiUrl, API_ENDPOINTS } from "../utils/supabase/api-config";
import { toast } from "sonner";
import { KnowledgeSearchDetail } from "./KnowledgeSearchDetail";

interface KnowledgeSearchProps {
  accessToken: string | null;
}

export function KnowledgeSearch({ accessToken }: KnowledgeSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Form state for new knowledge item
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState("document");
  const [newTags, setNewTags] = useState("");

  useEffect(() => {
    performSearch();
  }, [selectedType]);

  const performSearch = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (searchQuery) params.q = searchQuery;
      if (selectedType !== "all") params.type = selectedType;

      const response = await fetch(
        buildApiUrl(API_ENDPOINTS.KNOWLEDGE_SEARCH, params),
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    performSearch();
  };

  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(
        buildApiUrl(API_ENDPOINTS.KNOWLEDGE_CREATE),
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
            tags: newTags.split(",").map(t => t.trim()).filter(Boolean),
          }),
        }
      );

      if (response.ok) {
        setIsDialogOpen(false);
        setNewTitle("");
        setNewDescription("");
        setNewType("document");
        setNewTags("");
        performSearch();
      }
    } catch (error) {
      console.error("Failed to add knowledge:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetails = (item: any) => {
    setSelectedItem(item);
    setIsDetailDialogOpen(true);
  };

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag);
    performSearch();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "document":
        return FileText;
      case "discussion":
        return MessageSquare;
      case "code":
        return Code;
      case "insight":
        return BookOpen;
      default:
        return FileText;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "document":
        return "bg-blue-100 text-blue-700";
      case "discussion":
        return "bg-purple-100 text-purple-700";
      case "code":
        return "bg-green-100 text-green-700";
      case "insight":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Search knowledge, discussions, code, insights..."
                  className="pl-10 h-12"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Knowledge Item</DialogTitle>
                    <DialogDescription>
                      Share documentation, code, or insights with your team
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddKnowledge} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={newType} onValueChange={setNewType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="document">Document</SelectItem>
                          <SelectItem value="discussion">Discussion</SelectItem>
                          <SelectItem value="code">Code</SelectItem>
                          <SelectItem value="insight">Insight</SelectItem>
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
                      <Label>Tags (comma-separated)</Label>
                      <Input
                        value={newTags}
                        onChange={(e) => setNewTags(e.target.value)}
                        placeholder="API, Integration, Documentation"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Knowledge Item"
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                  <SelectItem value="discussion">Discussions</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                  <SelectItem value="insight">Insights</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-slate-200"
                  onClick={() => handleTagClick("Engineering")}
                >
                  Engineering
                </Badge>
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-slate-200"
                  onClick={() => handleTagClick("Product")}
                >
                  Product
                </Badge>
                <Badge 
                  variant="secondary" 
                  className="cursor-pointer hover:bg-slate-200"
                  onClick={() => toast.info("Filtering by last 30 days")}
                >
                  Last 30 days
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-slate-700 dark:text-slate-300">
            Found <span className="text-slate-900 dark:text-slate-100">{searchResults.length}</span> results
          </p>
          <Select defaultValue="relevance">
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Most Relevant</SelectItem>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="popular">Most Popular</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : searchResults.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-slate-600 dark:text-slate-400">No results found. Try a different search or add new knowledge items.</p>
            </CardContent>
          </Card>
        ) : (
          searchResults.map((result, index) => {
          const Icon = getIcon(result.type);
          return (
            <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 ${getTypeColor(result.type)} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="text-slate-900 dark:text-slate-100">{result.title}</h3>
                      {result.relevance && (
                        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm flex-shrink-0">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          {result.relevance}% match
                        </div>
                      )}
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mb-3">{result.description}</p>
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm">
                        <User className="w-4 h-4" />
                        {result.author}
                      </div>
                      <Badge variant="outline">{result.team}</Badge>
                      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-sm">
                        <Clock className="w-4 h-4" />
                        {result.date}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {result.tags.map((tag: string, idx: number) => (
                          <Badge 
                            key={idx} 
                            variant="secondary" 
                            className="text-xs cursor-pointer hover:bg-slate-300"
                            onClick={() => handleTagClick(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => handleViewDetails(result)}>
                        View Details
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }))}
      </div>

      {/* Knowledge Detail Dialog */}
      <KnowledgeSearchDetail
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        item={selectedItem}
        getTypeColor={getTypeColor}
      />
    </div>
  );
}
