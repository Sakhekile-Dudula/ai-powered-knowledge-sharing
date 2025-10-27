import { useState } from 'react';
import { Brain, User, Mail, Lock, Briefcase, Users, Sparkles, Building2, Camera } from "lucide-react";
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
  department: string;
}

export function Auth({ onAuthSuccess }: AuthProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [signUpData, setSignUpData] = useState<SignUpFormData>({
    full_name: "",
    email: "",
    password: "",
    role: "",
    team: "",
    expertise: "",
    department: ""
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
      // Convert expertise string to array (split by comma)
      const expertiseArray = signUpData.expertise 
        ? signUpData.expertise.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : [];

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            full_name: signUpData.full_name,
            email: signUpData.email,
            role: signUpData.role || 'User',
            team: signUpData.team || null,
            expertise: expertiseArray,
            department: signUpData.department || null
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

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Please upload an image file");
        return;
      }

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
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
                  {/* Avatar with Upload */}
                  <div className="flex flex-col items-center py-3 space-y-2">
                    <div className="relative group">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center overflow-hidden">
                        {profilePicture ? (
                          <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-white" />
                        )}
                      </div>
                      <label 
                        htmlFor="profile-picture-upload"
                        className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Camera className="w-6 h-6 text-white" />
                      </label>
                      <input
                        id="profile-picture-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureChange}
                        className="hidden"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Click to upload photo (optional)</p>
                  </div>

                  <div className="space-y-4">
                    {/* Personal Information */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                        <User className="w-4 h-4" />
                        <span>Personal Information</span>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="full_name" className="flex items-center gap-2">
                          Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="full_name"
                          name="full_name"
                          placeholder="John Doe"
                          required
                          value={signUpData.full_name}
                          onChange={handleSignUpInputChange}
                          className="h-10"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5" />
                          Email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="john.doe@mrisoftware.com"
                          required
                          value={signUpData.email}
                          onChange={handleSignUpInputChange}
                          className="h-10"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password" className="flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5" />
                          Password <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          placeholder="Minimum 6 characters"
                          required
                          value={signUpData.password}
                          onChange={handleSignUpInputChange}
                          className="h-10"
                        />
                      </div>
                    </div>

                    {/* Professional Information */}
                    <div className="space-y-3 pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                        <Briefcase className="w-4 h-4" />
                        <span>Professional Details</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="role">
                            Role <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="role"
                            name="role"
                            placeholder="Software Engineer"
                            required
                            value={signUpData.role}
                            onChange={handleSignUpInputChange}
                            className="h-10"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="team" className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            Team <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="team"
                            name="team"
                            placeholder="Platform Team"
                            required
                            value={signUpData.team}
                            onChange={handleSignUpInputChange}
                            className="h-10"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expertise" className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5" />
                        Skills & Expertise <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="expertise"
                        name="expertise"
                        placeholder="React, TypeScript, Node.js, PostgreSQL"
                        required
                        value={signUpData.expertise}
                        onChange={handleSignUpInputChange}
                        className="h-10"
                      />
                      <p className="text-xs text-muted-foreground flex items-start gap-1">
                        <span className="text-blue-600">💡</span>
                        Separate multiple skills with commas - this helps others find you!
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department" className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5" />
                        Department <span className="text-red-500">*</span>
                      </Label>
                      <select
                        id="department"
                        name="department"
                        required
                        value={signUpData.department}
                        onChange={(e) => setSignUpData(prev => ({ ...prev, department: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <option value="">Select your department</option>
                        <option value="Application Administration">Application Administration</option>
                        <option value="Business Operations">Business Operations</option>
                        <option value="Client Experience">Client Experience</option>
                        <option value="Client Support">Client Support</option>
                        <option value="Diversity, Equity, & Inclusion">Diversity, Equity, & Inclusion</option>
                        <option value="Education Services">Education Services</option>
                        <option value="Finance">Finance</option>
                        <option value="GRC Team">GRC Team</option>
                        <option value="IT">IT</option>
                        <option value="InfoSec">InfoSec</option>
                        <option value="Revenue Applications">Revenue Applications</option>
                        <option value="Legal">Legal</option>
                        <option value="MACS-Everyone">MACS-Everyone</option>
                        <option value="Managed Services">Managed Services</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Partner Connect">Partner Connect</option>
                        <option value="Product Development">Product Development</option>
                        <option value="Professional Services">Professional Services</option>
                        <option value="Sales">Sales</option>
                        <option value="Sales Enablement">Sales Enablement</option>
                        <option value="Sales Engineering">Sales Engineering</option>
                        <option value="Solution Practice - NA">Solution Practice - NA</option>
                        <option value="Talent Management">Talent Management</option>
                        <option value="Workplace Experience">Workplace Experience</option>
                      </select>
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

export default Auth;