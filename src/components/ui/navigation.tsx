import { Home, Search, Users, Network, Lightbulb, MessageSquare } from "lucide-react";
import { Button } from "./button";
import { cn } from "../../utils";

interface NavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface NavItem {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const navItems: NavItem[] = [
  { id: "dashboard", icon: Home, label: "Dashboard" },
  { id: "search", icon: Search, label: "Search Knowledge" },
  { id: "experts", icon: Users, label: "Find Experts" },
  { id: "projects", icon: Network, label: "Project Connections" },
  { id: "insights", icon: Lightbulb, label: "Insights Hub" },
  { id: "messages", icon: MessageSquare, label: "Messages" },
];

export function Navigation({ activeTab, onTabChange }: NavProps) {
  return (
    <nav className="h-16 border-b bg-background">
      <div className="h-full flex items-center justify-center gap-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "flex flex-col h-full px-4 py-2 gap-1 rounded-none border-b-2 border-transparent",
                activeTab === item.id && "border-primary text-primary"
              )}
              onClick={() => onTabChange(item.id)}
            >
              <Icon className={cn(
                "h-5 w-5",
                activeTab === item.id ? "text-primary" : "text-muted-foreground"
              )} />
              <span className={cn(
                "text-xs",
                activeTab === item.id ? "text-primary" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}