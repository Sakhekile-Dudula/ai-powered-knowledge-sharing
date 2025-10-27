import { useState, useEffect } from "react";
import { Brain, Search, Users, Network, MessageSquare, Lightbulb, Moon, LogOut, HelpCircle, Settings as SettingsIcon, Video } from "lucide-react";
import { Auth } from "./components/Auth";
import { Dashboard } from "./components/Dashboard";
import { KnowledgeSearch } from "./components/KnowledgeSearch";
import { ExpertFinder } from "./components/ExpertFinder";
import { ProjectConnections } from "./components/ProjectConnections";
import { InsightsHub } from "./components/InsightsHub";
import { Messages } from "./components/Messages";
import { Settings } from "./components/Settings";
import { CollaborationTools } from "./components/CollaborationTools";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/sonner";
import { createClient } from "./utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { UserProfile } from "./types";
import { HelpBot } from "./components/HelpBot";
import { KeyboardShortcuts } from "./components/KeyboardShortcuts";
import { Notifications } from "./components/Notifications";
import { QASystem } from "./components/QASystem";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [userAccount, setUserAccount] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const supabase = createClient();

  // Handle auth state changes
  useEffect(() => {
    // Always start in light mode
    setIsDarkMode(false);
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");

    let isSubscribed = true;
    
    // Check for existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isSubscribed) return;

      if (session?.user) {
        setUserAccount(session.user);
        setAccessToken(session.access_token);
        await fetchUserProfile(session.user);
      } else {
        // Clear state when no session exists
        setUserAccount(null);
        setUserProfile(null);
        setAccessToken(null);
      }
    };
    
    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isSubscribed) return;

      if (event === 'SIGNED_OUT') {
        setUserAccount(null);
        setUserProfile(null);
        setAccessToken(null);
        setActiveTab('dashboard');
      } else if (session?.user) {
        setUserAccount(session.user);
        setAccessToken(session.access_token);
        // Debounce the profile fetch
        const timeoutId = setTimeout(() => {
          if (isSubscribed) {
            fetchUserProfile(session.user);
          }
        }, 100);
        return () => clearTimeout(timeoutId);
      }
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, []);

  // Memoize the fetch profile function
  const fetchUserProfile = async (user: User) => {
    // Add a flag to prevent duplicate fetches
    if ((window as any).__fetchingProfile) return;
    (window as any).__fetchingProfile = true;

    try {
      const { data: userProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([
              {
                id: user.id,
                full_name: user.email?.split('@')[0] || 'Anonymous',
                email: user.email || null,
                role: 'User'
              }
            ])
            .select()
            .single();

          if (createError) throw createError;
          
          setUserProfile(newProfile);
          return;
        }
        throw error;
      }

      setUserProfile(userProfile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

  const handleAuthSuccess = async (user: User) => {
    setUserAccount(user);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setAccessToken(session.access_token);
    }
    await fetchUserProfile(user);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDarkMode ? "light" : "dark");
  };

  if (!userAccount) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <Toaster />
      
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 z-50 shadow-sm flex-shrink-0">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-slate-900 dark:text-slate-100">MRI Synapse</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Cross-Team Intelligence Hub</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-slate-700 dark:text-slate-300 text-sm">{userProfile?.full_name || userAccount.email}</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs">{userProfile?.role || 'User'}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">
                  {(userProfile?.full_name || userAccount.email || '')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </span>
              </div>
              <Notifications userId={userAccount.id} />
              <Button
                variant="ghost"
                size="sm"
                title="Switch theme"
                onClick={toggleDarkMode}
              >
                <Moon className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                title="Logout"
                onClick={() => supabase.auth.signOut()}
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div dir="ltr" data-orientation="horizontal" data-slot="tabs" className="flex flex-col gap-2 w-full mb-8">
          <div 
            role="tablist" 
            aria-orientation="horizontal" 
            data-slot="tabs-list" 
            className="bg-muted text-muted-foreground h-auto items-center justify-center rounded-xl p-1 flex flex-wrap gap-1 w-full"
          >
            <Button
              type="button"
              role="tab"
              variant={activeTab === "dashboard" ? "default" : "ghost"}
              className="data-[state=active]:bg-card dark:data-[state=active]:text-foreground flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-4 h-8"
              onClick={() => setActiveTab("dashboard")}
            >
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
            <Button
              type="button"
              role="tab"
              variant={activeTab === "search" ? "default" : "ghost"}
              className="data-[state=active]:bg-card dark:data-[state=active]:text-foreground flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-4 h-8"
              onClick={() => setActiveTab("search")}
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Search</span>
            </Button>
            <Button
              type="button"
              role="tab"
              variant={activeTab === "knowledge" ? "default" : "ghost"}
              className="data-[state=active]:bg-card dark:data-[state=active]:text-foreground flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-4 h-8"
              onClick={() => setActiveTab("knowledge")}
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Q&A</span>
            </Button>
            <Button
              type="button"
              role="tab"
              variant={activeTab === "experts" ? "default" : "ghost"}
              className="data-[state=active]:bg-card dark:data-[state=active]:text-foreground flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-4 h-8"
              onClick={() => setActiveTab("experts")}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Experts</span>
            </Button>
            <Button
              type="button"
              role="tab"
              variant={activeTab === "projects" ? "default" : "ghost"}
              className="data-[state=active]:bg-card dark:data-[state=active]:text-foreground flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-4 h-8"
              onClick={() => setActiveTab("projects")}
            >
              <Network className="w-4 h-4" />
              <span className="hidden sm:inline">Projects</span>
            </Button>
            <Button
              type="button"
              role="tab"
              variant={activeTab === "messages" ? "default" : "ghost"}
              className="data-[state=active]:bg-card dark:data-[state=active]:text-foreground flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-4 h-8"
              onClick={() => setActiveTab("messages")}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Messages</span>
            </Button>
            <Button
              type="button"
              role="tab"
              variant={activeTab === "insights" ? "default" : "ghost"}
              className="data-[state=active]:bg-card dark:data-[state=active]:text-foreground flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-4 h-8"
              onClick={() => setActiveTab("insights")}
            >
              <Lightbulb className="w-4 h-4" />
              <span className="hidden sm:inline">Insights</span>
            </Button>
            <Button
              type="button"
              role="tab"
              variant={activeTab === "collaboration" ? "default" : "ghost"}
              className="data-[state=active]:bg-card dark:data-[state=active]:text-foreground flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-4 h-8"
              onClick={() => setActiveTab("collaboration")}
            >
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">Collab</span>
            </Button>
            <Button
              type="button"
              role="tab"
              variant={activeTab === "settings" ? "default" : "ghost"}
              className="data-[state=active]:bg-card dark:data-[state=active]:text-foreground flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-4 h-8"
              onClick={() => setActiveTab("settings")}
            >
              <SettingsIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "dashboard" && accessToken && (
          <Dashboard accessToken={accessToken} />
        )}
        {activeTab === "search" && accessToken && (
          <KnowledgeSearch accessToken={accessToken} />
        )}
        {activeTab === "knowledge" && accessToken && userAccount && (
          <QASystem 
            userId={userAccount.id}
            userName={userProfile?.full_name || userAccount.email || "User"}
          />
        )}
        {activeTab === "experts" && accessToken && (
          <ExpertFinder
            accessToken={accessToken}
            currentUserName={userProfile?.full_name || userAccount.email || "You"}
          />
        )}
        {activeTab === "projects" && accessToken && (
          <ProjectConnections accessToken={accessToken} />
        )}
        {activeTab === "messages" && accessToken && (
          <Messages
            currentUserName={userProfile?.full_name || userAccount.email || "You"}
          />
        )}
        {activeTab === "insights" && accessToken && (
          <InsightsHub accessToken={accessToken} />
        )}
        {activeTab === "collaboration" && userAccount && (
          <CollaborationTools user={userAccount} />
        )}
        {activeTab === "settings" && userProfile && (
          <Settings 
            user={userProfile}
            onProfileUpdate={(updatedProfile) => setUserProfile(updatedProfile)}
          />
        )}
        </div>
      </main>
      
      {/* Help Bot and Keyboard Shortcuts */}
      {userAccount && (
        <>
          <HelpBot />
          <KeyboardShortcuts />
        </>
      )}
    </div>
  );
}