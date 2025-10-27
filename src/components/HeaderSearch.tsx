import { useState, useEffect, useRef } from "react";
import { Search, FileText, MessageSquare, Code, BookOpen, X, Loader2 } from "lucide-react";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { projectId } from "../utils/supabase/info";

interface HeaderSearchProps {
  accessToken: string | null;
}

export function HeaderSearch({ accessToken }: HeaderSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("q", searchQuery);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-d5b5d02c/knowledge/search?${params}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.results || []);
        setIsOpen(true);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="w-4 h-4" />;
      case "discussion":
        return <MessageSquare className="w-4 h-4" />;
      case "code":
        return <Code className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "document":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "discussion":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      case "code":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Search knowledge base..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery && setIsOpen(true)}
          className="pl-10 pr-10 h-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-600 animate-spin" />
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (searchResults.length > 0 || searchQuery) && (
        <Card className="absolute top-full mt-2 w-full max-h-96 overflow-y-auto shadow-lg z-50 border-slate-200 dark:border-slate-700">
          <div className="p-2">
            {searchResults.length > 0 ? (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
                </div>
                <div className="space-y-1 mt-2">
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        // You can add navigation or modal opening here
                        setIsOpen(false);
                      }}
                      className="w-full text-left p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                          {getTypeIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                              {result.title}
                            </h4>
                            <Badge className={`text-xs px-2 py-0 ${getTypeBadgeColor(result.type)}`}>
                              {result.type}
                            </Badge>
                          </div>
                          {result.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                              {result.description}
                            </p>
                          )}
                          {result.tags && result.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {result.tags.slice(0, 3).map((tag: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                              {result.tags.length > 3 && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  +{result.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : searchQuery ? (
              <div className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No results found for "{searchQuery}"
              </div>
            ) : null}
          </div>
        </Card>
      )}
    </div>
  );
}
