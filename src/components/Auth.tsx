import { useState } from 'react';
import { Brain } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { createClient } from "../utils/supabase/client";
import { toast } from 'sonner';
interface AuthProps {
  onAuthSuccess: (account: any) => void;
}

interface SignUpFormData {
  full_name: string;
  email: string;
  password: string;
  role: string;
  team: string;
  expertise: string;
}

export function Auth({ onAuthSuccess }: AuthProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [signUpData, setSignUpData] = useState<SignUpFormData>({
    full_name: "",
    email: "",
    password: "",
    role: "",
    team: "",
    expertise: ""
  });

  const handleLogin = async () => {
    if (!signUpData.email || !signUpData.password) {
      toast.error("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: signUpData.email,
        password: signUpData.password,
      });

      if (authError) {
        toast.error(authError.message);
        return;
      }

      if (!authData.user) {
        toast.error("Invalid login credentials");
        return;
      }

      // Get user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) {
        console.error("Profile error:", profileError);
        toast.error("Error fetching user profile");
        return;
      }

      if (!profile) {
        // If no profile exists, create one
        const { data: newProfile, error: createProfileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              full_name: authData.user.email?.split('@')[0],
              email: authData.user.email,
              role: 'User'
            }
          ])
          .select()
          .single();

        if (createProfileError) {
          toast.error("Error creating user profile");
          return;
        }

        toast.success("Successfully signed in");
        onAuthSuccess(newProfile);
        return;
      }

      toast.success("Successfully signed in");
      onAuthSuccess(profile);
      
    } catch (err) {
      console.error("Login failed:", err);
      toast.error("Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!signUpData.email || !signUpData.password || !signUpData.full_name) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      // First create the auth user
      const supabase = createClient();
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
      });

      if (authError) {
        toast.error(authError.message);
        return;
      }

      if (!authData.user) {
        toast.error("Error creating account");
        return;
      }

      // Then create their profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            full_name: signUpData.full_name,
            email: signUpData.email,
            role: signUpData.role || 'User',
            team: signUpData.team,
            expertise: signUpData.expertise
          }
        ])
        .select()
        .single();

      if (profileError) {
        toast.error("Error creating profile");
        // TODO: Consider cleaning up the auth user if profile creation fails
        return;
      }

      toast.success("Successfully signed up! Please verify your email.");
      onAuthSuccess(profile);
    } catch (err) {
      console.error("Sign up failed:", err);
      toast.error("Sign up failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignUpData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-card text-card-foreground rounded-xl border shadow-lg">
          <div className="flex flex-col items-center pt-8 pb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">MRI Synapse</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Cross-Team Intelligence Hub</p>
          </div>
          
          <div className="p-6">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="bg-muted text-muted-foreground h-9 items-center justify-center rounded-xl p-[3px] grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin" className="data-[state=active]:bg-card dark:data-[state=active]:text-foreground">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-card dark:data-[state=active]:text-foreground">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-4 space-y-4">
                <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        name="email"
                        type="email"
                        placeholder="you@mrisoftware.com"
                        required
                        value={signUpData.email}
                        onChange={handleSignUpInputChange}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        name="password"
                        type="password"
                        required
                        placeholder="Enter your password"
                        value={signUpData.password}
                        onChange={handleSignUpInputChange}
                        className="h-9"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Signing in...
                        </span>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4 space-y-4">
                <form onSubmit={(e) => { e.preventDefault(); handleSignUp(); }} className="space-y-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        name="full_name"
                        placeholder="Enter your full name"
                        required
                        value={signUpData.full_name}
                        onChange={handleSignUpInputChange}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@mrisoftware.com"
                        required
                        value={signUpData.email}
                        onChange={handleSignUpInputChange}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Create a password"
                        required
                        value={signUpData.password}
                        onChange={handleSignUpInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Input
                        id="role"
                        name="role"
                        placeholder="Enter your role"
                        required
                        value={signUpData.role}
                        onChange={handleSignUpInputChange}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="team">Team</Label>
                      <Input
                        id="team"
                        name="team"
                        placeholder="Enter your team"
                        required
                        value={signUpData.team}
                        onChange={handleSignUpInputChange}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expertise">Area of Expertise</Label>
                      <Input
                        id="expertise"
                        name="expertise"
                        placeholder="Enter your area of expertise"
                        required
                        value={signUpData.expertise}
                        onChange={handleSignUpInputChange}
                        className="h-9"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-700 hover:to-cyan-600"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Creating account...
                        </span>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      </div>
    </div>
  );
}