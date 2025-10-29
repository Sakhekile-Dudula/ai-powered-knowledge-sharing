import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Search, MapPin, Award, MessageCircle, Calendar, Star, Loader2, UserPlus, UserCheck } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { MessagingDialog } from "./MessagingDialog";
import { toast } from "sonner";

interface ExpertFinderProps {
  accessToken: string;
  currentUserName: string;
}

export function ExpertFinder({ accessToken, currentUserName = "You" }: ExpertFinderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [experts, setExperts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [selectedExpert, setSelectedExpert] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [connectedUserIds, setConnectedUserIds] = useState<Set<string>>(new Set());
  const [connectingIds, setConnectingIds] = useState<Set<string>>(new Set());
  
  // Calendar booking state
  const [isCalendarDialogOpen, setIsCalendarDialogOpen] = useState(false);
  const [selectedExpertForBooking, setSelectedExpertForBooking] = useState<any>(null);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingDuration, setBookingDuration] = useState("30");
  const [bookingNotes, setBookingNotes] = useState("");

  useEffect(() => {
    fetchExperts();
    fetchConnections();
  }, [selectedDepartment]);

  const fetchConnections = async () => {
    try {
      const { createClient } = await import("../utils/supabase/client");
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_connections')
        .select('connected_with')
        .eq('user_id', user.id)
        .in('status', ['connected', 'accepted']);

      if (error) {
        console.error("Failed to fetch connections:", error);
        return;
      }

      if (data) {
        const connectedIds = new Set(data.map(conn => conn.connected_with));
        setConnectedUserIds(connectedIds);
        console.log('Connected users:', connectedIds.size, 'connections');
      }
    } catch (error) {
      console.error("Failed to fetch connections:", error);
    }
  };

  const fetchExperts = async () => {
    setIsLoading(true);
    try {
      const { createClient } = await import("../utils/supabase/client");
      const supabase = createClient();
      
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id;
      
      let query = supabase
        .from('profiles')
        .select('*');
      
      // Filter by department if not "all"
      if (selectedDepartment !== 'all') {
        query = query.eq('department', selectedDepartment);
      }
      
      // Exclude current user
      if (currentUserId) {
        query = query.neq('id', currentUserId);
      }
      
      const { data, error } = await query;

      if (error) {
        console.error("Failed to fetch experts:", error);
        toast.error("Failed to load experts");
        return;
      }

      if (data) {
        const mappedExperts = data.map((profile: any) => ({
          id: profile.id,
          name: profile.full_name,
          role: profile.role || 'Team Member',
          team: profile.team || 'General',
          department: profile.department,
          expertise: profile.expertise || [],
          availability: 'Available',
          rating: 4.8,
          avatar: profile.avatar_url
        }));
        console.log('Loaded experts:', mappedExperts);
        setExperts(mappedExperts);
      }
    } catch (error) {
      console.error("Failed to fetch experts:", error);
      toast.error("Failed to load experts");
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  // Dynamically calculate skills from all experts' expertise
  const skills = (() => {
    const skillMap: { [key: string]: number } = {};
    
    experts.forEach(expert => {
      if (Array.isArray(expert.expertise)) {
        expert.expertise.forEach((skill: string) => {
          skillMap[skill] = (skillMap[skill] || 0) + 1;
        });
      } else if (typeof expert.expertise === 'string' && expert.expertise) {
        skillMap[expert.expertise] = (skillMap[expert.expertise] || 0) + 1;
      }
    });

    // Convert to array and sort by count (descending)
    return Object.entries(skillMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Show top 10 skills
  })();

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case "Available":
        return "bg-green-100 text-green-700";
      case "Busy":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const handleMessage = (expertName: string) => {
    setSelectedExpert(expertName);
    setIsMessagingOpen(true);
  };

  const handleSchedule = (expert: any) => {
    setSelectedExpertForBooking(expert);
    setIsCalendarDialogOpen(true);
  };

  const handleConnect = async (expertId: string, expertName: string) => {
    try {
      setConnectingIds(prev => new Set(prev).add(expertId));
      
      const { createClient } = await import("../utils/supabase/client");
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to connect");
        return;
      }

      // Create bidirectional connection
      const { error: error1 } = await supabase
        .from('user_connections')
        .insert({
          user_id: user.id,
          connected_with: expertId,
          status: 'connected'
        });

      const { error: error2 } = await supabase
        .from('user_connections')
        .insert({
          user_id: expertId,
          connected_with: user.id,
          status: 'connected'
        });

      if (error1 || error2) {
        console.error("Failed to create connection:", error1 || error2);
        toast.error("Failed to connect. You may already be connected.");
        return;
      }

      // Update local state
      setConnectedUserIds(prev => new Set(prev).add(expertId));
      toast.success(`Successfully connected with ${expertName}!`);
    } catch (error) {
      console.error("Failed to create connection:", error);
      toast.error("Failed to connect. Please try again.");
    } finally {
      setConnectingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(expertId);
        return newSet;
      });
    }
  };

  const handleBookingSubmit = async () => {
    if (!bookingDate || !bookingTime) {
      toast.error("Please select a date and time");
      return;
    }

    // In a real app, this would send the booking to your backend
    // For now, we'll show a success message and create a calendar event

    toast.success(`Meeting scheduled with ${selectedExpertForBooking.name} on ${bookingDate} at ${bookingTime}`);
    
    // Create calendar event (basic implementation)
    const calendarEvent = {
      title: `Meeting with ${selectedExpertForBooking.name}`,
      start: `${bookingDate}T${bookingTime}`,
      duration: parseInt(bookingDuration),
      description: bookingNotes,
    };

    // Log the calendar event (in production, this would sync with team calendar)
    console.log("Calendar event created:", calendarEvent);

    // Reset form and close dialog
    setIsCalendarDialogOpen(false);
    setBookingDate("");
    setBookingTime("");
    setBookingDuration("30");
    setBookingNotes("");
  };

  const handleSkillClick = (skillName: string) => {
    setSearchQuery(skillName);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const filteredExperts = searchQuery
    ? experts
        .filter((expert) => !connectedUserIds.has(expert.id)) // Exclude connected users
        .filter((expert) => {
          const query = searchQuery.toLowerCase();
          const name = expert.name?.toLowerCase() || '';
          const team = expert.team?.toLowerCase() || '';
          const department = expert.department?.toLowerCase() || '';
          const role = expert.role?.toLowerCase() || '';
          
          console.log('Searching:', { query, name, team, department, role, expertise: expert.expertise });
          
          // Handle expertise - can be array or string
          let expertiseMatch = false;
          if (Array.isArray(expert.expertise)) {
            expertiseMatch = expert.expertise.some((skill: string) =>
              skill.toLowerCase().includes(query)
            );
          } else if (typeof expert.expertise === 'string') {
            expertiseMatch = expert.expertise.toLowerCase().includes(query);
          }
          
          const matches = (
            name.includes(query) ||
            team.includes(query) ||
            department.includes(query) ||
            role.includes(query) ||
            expertiseMatch
          );
          
          console.log('Match result:', matches);
          
          return matches;
        })
    : experts.filter((expert) => !connectedUserIds.has(expert.id)); // Exclude connected users

  return (
    <>
      <MessagingDialog
        isOpen={isMessagingOpen}
        onClose={() => setIsMessagingOpen(false)}
        recipientName={selectedExpert}
        currentUserName={currentUserName}
        accessToken={accessToken}
      />
      
      {/* Calendar Booking Dialog */}
      {selectedExpertForBooking && (
        <Dialog open={isCalendarDialogOpen} onOpenChange={setIsCalendarDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Meeting with {selectedExpertForBooking.name}</DialogTitle>
              <DialogDescription>
                Book a time slot and add it to your team calendar
              </DialogDescription>
            </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select value={bookingDuration} onValueChange={setBookingDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="What would you like to discuss?"
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsCalendarDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleBookingSubmit}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Add to Calendar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      )}

      <div className="space-y-6">
      {/* Search Header */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by name, skill, or team..."
              className="pl-10 h-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  // Scroll to results
                  const resultsSection = document.querySelector('[data-results-section]');
                  if (resultsSection) {
                    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }
              }}
            />
          </div>
          
          {/* Department Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Filter by Department</Label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="Application Administration">Application Administration</SelectItem>
                <SelectItem value="Business Operations">Business Operations</SelectItem>
                <SelectItem value="Client Experience">Client Experience</SelectItem>
                <SelectItem value="Client Support">Client Support</SelectItem>
                <SelectItem value="Diversity, Equity, & Inclusion">Diversity, Equity, & Inclusion</SelectItem>
                <SelectItem value="Education Services">Education Services</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="GRC Team">GRC Team</SelectItem>
                <SelectItem value="IT">IT</SelectItem>
                <SelectItem value="InfoSec">InfoSec</SelectItem>
                <SelectItem value="Revenue Applications">Revenue Applications</SelectItem>
                <SelectItem value="Legal">Legal</SelectItem>
                <SelectItem value="MACS-Everyone">MACS-Everyone</SelectItem>
                <SelectItem value="Managed Services">Managed Services</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Partner Connect">Partner Connect</SelectItem>
                <SelectItem value="Product Development">Product Development</SelectItem>
                <SelectItem value="Professional Services">Professional Services</SelectItem>
                <SelectItem value="Sales">Sales</SelectItem>
                <SelectItem value="Sales Enablement">Sales Enablement</SelectItem>
                <SelectItem value="Sales Engineering">Sales Engineering</SelectItem>
                <SelectItem value="Solution Practice - NA">Solution Practice - NA</SelectItem>
                <SelectItem value="Talent Management">Talent Management</SelectItem>
                <SelectItem value="Workplace Experience">Workplace Experience</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Skills Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Popular Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {skills.map((skill, index) => (
                <button
                  key={index}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
                  onClick={() => handleSkillClick(skill.name)}
                >
                  <span className="text-slate-700 dark:text-slate-300 text-sm">{skill.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {skill.count}
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Experts Grid */}
        <div className="lg:col-span-3 space-y-4" data-results-section>
          <div className="flex items-center justify-between">
            <p className="text-slate-700 dark:text-slate-300">
              <span className="text-slate-900 dark:text-slate-100">{filteredExperts.length}</span> experts found
            </p>
            <Tabs defaultValue="grid" className="w-auto">
              <TabsList>
                <TabsTrigger value="grid">Grid</TabsTrigger>
                <TabsTrigger value="list">List</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {filteredExperts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-600 dark:text-slate-400">No experts found matching your search.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredExperts.map((expert, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white">{getInitials(expert.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-slate-900 dark:text-slate-100 mb-1">{expert.name}</h3>
                      <p className="text-slate-600 dark:text-slate-400 text-sm mb-1">{expert.role}</p>
                      <div className="flex gap-2">
                        {expert.department && (
                          <Badge variant="default" className="text-xs bg-blue-600">
                            {expert.department}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {expert.team}
                        </Badge>
                      </div>
                    </div>
                    <Badge className={getAvailabilityColor(expert.availability)}>
                      {expert.availability}
                    </Badge>
                  </div>

                  <div className="space-y-3 mb-4">
                    {expert.location && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                        <MapPin className="w-4 h-4" />
                        {expert.location} {expert.timezone && `• ${expert.timezone}`}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 text-sm">
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4" />
                        {expert.contributions || 0} contributions
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {expert.rating || 5.0}
                      </div>
                    </div>
                  </div>

                  {expert.expertise && expert.expertise.length > 0 && (
                    <div className="mb-4">
                      <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">Expertise</p>
                      <div className="flex flex-wrap gap-1">
                        {expert.expertise.map((skill: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {expert.projects && expert.projects.length > 0 && (
                    <div className="mb-4">
                      <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">Recent Projects</p>
                      <ul className="space-y-1">
                        {expert.projects.slice(0, 2).map((project: string, idx: number) => (
                          <li key={idx} className="text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                            {project}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {connectedUserIds.has(expert.id) ? (
                      <Button variant="secondary" size="sm" disabled className="flex-1">
                        <UserCheck className="w-4 h-4 mr-2" />
                        Connected
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleConnect(expert.id, expert.name)}
                        disabled={connectingIds.has(expert.id)}
                        className="flex-1"
                      >
                        {connectingIds.has(expert.id) ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Connect
                          </>
                        )}
                      </Button>
                    )}
                    <Button size="sm" onClick={() => handleMessage(expert.name)}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleSchedule(expert)}>
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule
                    </Button>
                  </div>
                </CardContent>
              </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
