import { History, Share2, Sun, Moon } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useState } from "react";

interface HeaderProps {
  email: string;
  onThemeToggle?: () => void;
}

export function Header({ email, onThemeToggle }: HeaderProps) {
  const [isDark, setIsDark] = useState(false);

  const handleThemeToggle = () => {
    setIsDark(!isDark);
    onThemeToggle?.();
  };

  const initials = email
    .split('@')[0]
    .split('.')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex items-center justify-between py-4 px-6 border-b">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-medium">Welcome</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleThemeToggle}>
          {isDark ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
        <Button variant="ghost" size="icon">
          <History className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <Share2 className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
            <AvatarImage src={`https://avatars.dicebear.com/api/initials/${email}.svg`} />
          </Avatar>
          <span className="text-sm font-medium">{email}</span>
        </div>
      </div>
    </div>
  );
}