import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";

interface KnowledgeSearchDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  getTypeColor: (type: string) => string;
}

export function KnowledgeSearchDetail({ open, onOpenChange, item, getTypeColor }: KnowledgeSearchDetailProps) {
  if (!item) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item.title || "Knowledge Item"}</DialogTitle>
          <DialogDescription>
            {item.type ? (
              <span className="inline-flex">
                <Badge className={getTypeColor(item.type)}>
                  {item.type}
                </Badge>
              </span>
            ) : "Knowledge item details"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-slate-900 dark:text-slate-100">{item.description}</p>
          </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Author</p>
                <p className="text-slate-900 dark:text-slate-100">{item.author}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Team</p>
                <Badge variant="outline">{item.team}</Badge>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Date</p>
              <p className="text-slate-900 dark:text-slate-100">{item.date}</p>
            </div>
            
            {item.relevance && (
              <div>
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
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag: string, idx: number) => (
                    <Badge key={idx} variant="secondary">
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
