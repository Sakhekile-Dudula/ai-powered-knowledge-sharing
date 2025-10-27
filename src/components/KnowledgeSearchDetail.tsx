import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Bookmark, Share2, Download, Printer, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";

interface KnowledgeSearchDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  getTypeColor: (type: string) => string;
}

export function KnowledgeSearchDetail({ open, onOpenChange, item, getTypeColor }: KnowledgeSearchDetailProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (item?.id && open) {
      checkBookmarkStatus();
    }
  }, [item?.id, open]);

  const checkBookmarkStatus = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (user?.user?.id && item?.id) {
        const { data, error } = await supabase
          .from('bookmarks')
          .select('id')
          .eq('user_id', user.user.id)
          .eq('knowledge_item_id', item.id)
          .single();
        
        setIsBookmarked(!!data && !error);
      }
    } catch (error) {
      console.error('Error checking bookmark status:', error);
    }
  };
  
  if (!item) return null;

  const handleBookmark = async () => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      const { data: user } = await supabase.auth.getUser();
      
      if (!user?.user?.id) {
        toast.error('Please log in to bookmark items');
        return;
      }

      const { data, error } = await supabase.rpc('toggle_bookmark', {
        p_user_id: user.user.id,
        p_knowledge_item_id: item.id
      });

      if (error) throw error;

      setIsBookmarked(data);
      toast.success(data ? "Bookmarked successfully" : "Removed from bookmarks");
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error('Failed to update bookmark');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      if (!user?.user?.id) {
        toast.error('Please log in to share items');
        return;
      }

      // Generate public share token
      const { data: shareToken, error } = await supabase.rpc('enable_public_share', {
        p_knowledge_item_id: item.id,
        p_user_id: user.user.id
      });

      if (error) throw error;

      const shareUrl = `${window.location.origin}/share/${shareToken}`;
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      toast.success("Share link copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error("Failed to generate share link");
    }
  };

  const logExport = async (exportType: 'pdf' | 'word' | 'print') => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (user?.user?.id) {
        await supabase.rpc('log_export', {
          p_user_id: user.user.id,
          p_knowledge_item_id: item.id,
          p_export_type: exportType
        });
      }
    } catch (error) {
      console.error('Error logging export:', error);
    }
  };

  const handleExportPDF = async () => {
    toast.info("Generating PDF export...");
    await logExport('pdf');
    
    // Create a simple PDF-like export using browser print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${item.title}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
              h1 { color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
              .meta { color: #64748b; margin: 20px 0; }
              .description { margin: 20px 0; line-height: 1.6; }
              .tags { margin: 20px 0; }
              .tag { display: inline-block; background: #e2e8f0; padding: 4px 12px; margin: 4px; border-radius: 4px; }
            </style>
          </head>
          <body>
            <h1>${item.title}</h1>
            <div class="meta">
              <p><strong>Author:</strong> ${item.author}</p>
              <p><strong>Team:</strong> ${item.team}</p>
              <p><strong>Date:</strong> ${item.date}</p>
              <p><strong>Type:</strong> ${item.type}</p>
            </div>
            <div class="description">
              <h2>Description</h2>
              <p>${item.description}</p>
            </div>
            ${item.tags && item.tags.length > 0 ? `
              <div class="tags">
                <h3>Tags</h3>
                ${item.tags.map((tag: string) => `<span class="tag">${tag}</span>`).join('')}
              </div>
            ` : ''}
          </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        toast.success("PDF export ready");
      }, 500);
    }
  };

  const handleExportWord = async () => {
    toast.info("Generating Word document...");
    await logExport('word');
    
    // Create a simple HTML export that can be opened in Word
    const content = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>${item.title}</title></head>
        <body>
          <h1>${item.title}</h1>
          <p><strong>Author:</strong> ${item.author}</p>
          <p><strong>Team:</strong> ${item.team}</p>
          <p><strong>Date:</strong> ${item.date}</p>
          <p><strong>Type:</strong> ${item.type}</p>
          <h2>Description</h2>
          <p>${item.description}</p>
          ${item.tags && item.tags.length > 0 ? `
            <h3>Tags</h3>
            <p>${item.tags.join(', ')}</p>
          ` : ''}
        </body>
      </html>
    `;
    
    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${item.title.replace(/[^a-z0-9]/gi, '_')}.doc`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Word document downloaded");
  };

  const handlePrint = async () => {
    await logExport('print');
    window.print();
    toast.info("Opening print dialog...");
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto print:max-w-full">
        <DialogHeader>
          <DialogTitle className="print:text-2xl">{item.title || "Knowledge Item"}</DialogTitle>
          <DialogDescription className="print:hidden">
            {item.type ? (
              <span className="inline-flex">
                <Badge className={getTypeColor(item.type)}>
                  {item.type}
                </Badge>
              </span>
            ) : "Knowledge item details"}
          </DialogDescription>
        </DialogHeader>

        {/* Action Buttons - Hidden in print */}
        <div className="flex flex-wrap gap-2 pb-4 border-b print:hidden">
          <Button
            variant={isBookmarked ? "default" : "outline"}
            size="sm"
            onClick={handleBookmark}
            className="gap-2"
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            {isBookmarked ? "Bookmarked" : "Bookmark"}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-2"
          >
            {isCopied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            {isCopied ? "Copied!" : "Share Link"}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportWord}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export Word
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </div>

        <div className="space-y-4 print:space-y-6">
          <div>
            <p className="text-slate-900 dark:text-slate-100 print:text-black print:text-base">{item.description}</p>
          </div>
            
            <div className="grid grid-cols-2 gap-4 print:grid-cols-1 print:gap-2">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1 print:text-black print:font-semibold">Author</p>
                <p className="text-slate-900 dark:text-slate-100 print:text-black">{item.author}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1 print:text-black print:font-semibold">Team</p>
                <Badge variant="outline" className="print:border-0 print:p-0">{item.team}</Badge>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1 print:text-black print:font-semibold">Date</p>
              <p className="text-slate-900 dark:text-slate-100 print:text-black">{item.date}</p>
            </div>
            
            {item.relevance && (
              <div className="print:hidden">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Relevance</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                      style={{ width: `${item.relevance}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-slate-900 dark:text-slate-100">{item.relevance}%</span>
                </div>
              </div>
            )}
            
            {item.tags && item.tags.length > 0 && (
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 print:text-black print:font-semibold">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="print:border print:border-black print:bg-white print:text-black">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
