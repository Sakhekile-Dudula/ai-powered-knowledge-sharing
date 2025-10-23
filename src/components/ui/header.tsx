import { LayoutGrid, BookmarkIcon, ChevronDown, Sun, Moon, ExternalLink } from "lucide-react";
import { Button } from "./button";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

interface HeaderProps {
  email: string;
  isDarkMode: boolean;
  onThemeToggle: () => void;
}

export function Header({ email, isDarkMode, onThemeToggle }: HeaderProps) {
  return (
    <header className="h-14 px-4 border-b flex items-center justify-between bg-background">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <LayoutGrid className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="flex items-center gap-2">
        <BookmarkIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">All Bookmarks</span>
      </div>

      <div className="text-sm">Welcome</div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {email.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-1 text-sm">
            <span>{email}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="flex items-center gap-2 border-l pl-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={onThemeToggle}
          >
            {isDarkMode ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}