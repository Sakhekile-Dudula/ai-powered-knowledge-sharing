import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Bookmark, Trash2, ExternalLink, FileText, MessageSquare, Code, BookOpen, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

interface BookmarkedItem {
  id: string;
  knowledge_item_id: string;
  user_id: string;
  created_at: string;
  title: string;
  description: string;
  type: string;
  author: string;
  team: string;
  tags: string[];
}

export function Bookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      setIsLoading(true);
      const { data: user } = await supabase.auth.getUser();

      if (user?.user?.id) {
        const { data, error } = await supabase
          .from('bookmarks')
          .select(`
            id,
            knowledge_item_id,
            user_id,
            created_at,
            knowledge_items (
              title,
              description,
              category,
              tags,
              author_id,
              profiles (
                full_name,
                department
              )
            )
          `)
          .eq('user_id', user.user.id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          // Transform the data
          const transformedBookmarks = data.map((bookmark: any) => ({
            id: bookmark.id,
            knowledge_item_id: bookmark.knowledge_item_id,
            user_id: bookmark.user_id,
            created_at: bookmark.created_at,
            title: bookmark.knowledge_items?.title || 'Untitled',
            description: bookmark.knowledge_items?.description || '',
            type: bookmark.knowledge_items?.category || 'document',
            author: bookmark.knowledge_items?.profiles?.full_name || 'Unknown',
            team: bookmark.knowledge_items?.profiles?.department || 'Unknown',
            tags: bookmark.knowledge_items?.tags || [],
          }));
          setBookmarks(transformedBookmarks);
        }
      }
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      toast.error('Failed to load bookmarks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveBookmark = async (bookmarkId: string) => {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', bookmarkId);

      if (!error) {
        setBookmarks(bookmarks.filter(b => b.id !== bookmarkId));
        toast.success('Bookmark removed');
      } else {
        toast.error('Failed to remove bookmark');
      }
    } catch (error) {
      console.error('Error removing bookmark:', error);
      toast.error('Failed to remove bookmark');
    }
  };

  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
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
    switch (type.toLowerCase()) {
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bookmark className="w-5 h-5" />
          My Bookmarks
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="text-center py-12">
            <Bookmark className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-600 dark:text-slate-400">No bookmarks yet</p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">
              Bookmark knowledge items to access them quickly
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {bookmarks.map((bookmark) => {
                const Icon = getIcon(bookmark.type);
                return (
                  <Card key={bookmark.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 ${getTypeColor(bookmark.type)} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                            {bookmark.title}
                          </h4>
                          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-2">
                            {bookmark.description}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-2">
                            <span>{bookmark.author}</span>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">{bookmark.team}</Badge>
                          </div>
                          {bookmark.tags && bookmark.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {bookmark.tags.map((tag: string, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleRemoveBookmark(bookmark.id)}
                            >
                              <Trash2 className="w-3 h-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
