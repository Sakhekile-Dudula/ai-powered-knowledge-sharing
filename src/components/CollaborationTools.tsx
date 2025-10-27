import { useState, useEffect } from 'react';
import { Video, Calendar, FileEdit, Users, Clock, Phone, Share2, Check, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';

interface CollaborationToolsProps {
  user: any;
}

interface OfficeHour {
  id: string;
  expert_id: string;
  expert_name: string;
  expert_role: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  topic: string;
  max_participants: number;
  current_participants: number;
}

interface CollabRequest {
  id: string;
  requester_id: string;
  requester_name: string;
  target_id: string;
  target_name: string;
  project_title: string;
  description: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
}

export function CollaborationTools({ user }: CollaborationToolsProps) {
  const [officeHours, setOfficeHours] = useState<OfficeHour[]>([]);
  const [collabRequests, setCollabRequests] = useState<CollabRequest[]>([]);

  console.log('User:', user); // Using user to avoid TS error

  useEffect(() => {
    fetchOfficeHours();
    fetchCollabRequests();
  }, []);

  const fetchOfficeHours = async () => {
    try {
      // This would fetch from a database table
      setOfficeHours([
        {
          id: '1',
          expert_id: 'expert1',
          expert_name: 'Dr. Sarah Chen',
          expert_role: 'AI Research Lead',
          day_of_week: 'Monday',
          start_time: '14:00',
          end_time: '16:00',
          topic: 'Machine Learning Q&A',
          max_participants: 10,
          current_participants: 3
        },
        {
          id: '2',
          expert_id: 'expert2',
          expert_name: 'John Smith',
          expert_role: 'Senior Developer',
          day_of_week: 'Wednesday',
          start_time: '10:00',
          end_time: '12:00',
          topic: 'Code Review Sessions',
          max_participants: 5,
          current_participants: 2
        }
      ]);
    } catch (error) {
      console.error('Error fetching office hours:', error);
    }
  };

  const fetchCollabRequests = async () => {
    try {
      // This would fetch from a database table
      setCollabRequests([]);
    } catch (error) {
      console.error('Error fetching collaboration requests:', error);
    }
  };

  const joinOfficeHours = (officeHour: OfficeHour) => {
    toast.success(`Joined ${officeHour.expert_name}'s office hours!`);
    toast.info('Meeting link will be sent to your email');
  };

  const startVideoCall = () => {
    toast.info('Opening video call... (Integration with Zoom/Teams/Google Meet)');
    // This would integrate with video conferencing APIs
  };

  const shareScreen = () => {
    toast.info('Screen sharing initiated... (Requires browser permissions)');
    // This would use WebRTC screen sharing API
  };

  const createCollabRequest = () => {
    toast.success('Collaboration request sent!');
  };

  const handleCollabRequest = (_requestId: string, action: 'accept' | 'decline') => {
    toast.success(`Request ${action}ed`);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Collaboration Tools</h1>
        <p className="text-muted-foreground mt-2">Connect, collaborate, and learn together</p>
      </div>

      <Tabs defaultValue="office-hours" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-4xl">
          <TabsTrigger value="office-hours">Office Hours</TabsTrigger>
          <TabsTrigger value="video-chat">Video Chat</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>

        {/* Office Hours Tab */}
        <TabsContent value="office-hours" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Virtual Office Hours
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Join scheduled sessions with experts in your field
            </p>

            <div className="space-y-4">
              {officeHours.map((hour) => (
                <Card key={hour.id} className="p-4 border">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{hour.expert_name}</h3>
                      <p className="text-sm text-muted-foreground">{hour.expert_role}</p>
                      <p className="text-sm mt-2 font-medium">{hour.topic}</p>
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {hour.day_of_week}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {hour.start_time} - {hour.end_time}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {hour.current_participants}/{hour.max_participants}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => joinOfficeHours(hour)}
                      disabled={hour.current_participants >= hour.max_participants}
                      size="sm"
                    >
                      Join
                    </Button>
                  </div>
                </Card>
              ))}

              {officeHours.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No office hours scheduled yet
                </p>
              )}
            </div>

            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold mb-4">Host Office Hours</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Topic</Label>
                  <Input placeholder="e.g., React Best Practices" />
                </div>
                <div className="space-y-2">
                  <Label>Day</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background">
                    <option>Monday</option>
                    <option>Tuesday</option>
                    <option>Wednesday</option>
                    <option>Thursday</option>
                    <option>Friday</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" />
                </div>
              </div>
              <Button className="mt-4" onClick={() => toast.success('Office hours created!')}>
                Create Office Hours
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Video Chat Tab */}
        <TabsContent value="video-chat" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Video className="w-5 h-5" />
              Video & Screen Sharing
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Start instant video calls and share your screen
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6 border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                <Video className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="font-semibold mb-2">Start Video Call</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Launch an instant video meeting with team members
                </p>
                <Button onClick={startVideoCall} className="w-full">
                  <Video className="w-4 h-4 mr-2" />
                  Start Call
                </Button>
              </Card>

              <Card className="p-6 border bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
                <Share2 className="w-12 h-12 text-purple-600 mb-4" />
                <h3 className="font-semibold mb-2">Share Screen</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Share your screen for presentations or demos
                </p>
                <Button onClick={shareScreen} className="w-full" variant="outline">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Screen
                </Button>
              </Card>

              <Card className="p-6 border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
                <Phone className="w-12 h-12 text-green-600 mb-4" />
                <h3 className="font-semibold mb-2">Join Meeting</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter a meeting code to join
                </p>
                <div className="flex gap-2">
                  <Input placeholder="Meeting code" />
                  <Button>Join</Button>
                </div>
              </Card>

              <Card className="p-6 border">
                <h3 className="font-semibold mb-3">Recent Meetings</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span>Team Standup</span>
                    <span className="text-muted-foreground">2 hours ago</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-muted/50">
                    <span>Code Review</span>
                    <span className="text-muted-foreground">Yesterday</span>
                  </div>
                </div>
              </Card>
            </div>
          </Card>
        </TabsContent>

        {/* Collaborative Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileEdit className="w-5 h-5" />
              Collaborative Documents
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Work together on documents in real-time
            </p>

            <div className="mb-6">
              <Button onClick={() => toast.success('New document created!')}>
                <FileEdit className="w-4 h-4 mr-2" />
                New Document
              </Button>
            </div>

            <div className="space-y-3">
              {[
                { title: 'Project Requirements', collaborators: 3, updated: '5 min ago' },
                { title: 'API Documentation', collaborators: 2, updated: '1 hour ago' },
                { title: 'Meeting Notes', collaborators: 5, updated: 'Yesterday' }
              ].map((doc, index) => (
                <Card key={index} className="p-4 border hover:border-primary cursor-pointer transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileEdit className="w-5 h-5 text-blue-600" />
                      <div>
                        <h3 className="font-medium">{doc.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {doc.collaborators} collaborators • Updated {doc.updated}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">Open</Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Collaboration Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Project Collaboration Requests
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Send and manage collaboration requests
            </p>

            <div className="mb-6 p-4 border rounded-lg">
              <h3 className="font-semibold mb-4">Send Collaboration Request</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Collaborator Name/Email</Label>
                  <Input placeholder="Enter name or email" />
                </div>
                <div className="space-y-2">
                  <Label>Project Title</Label>
                  <Input placeholder="e.g., AI-Powered Dashboard" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <textarea
                    className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background"
                    placeholder="Describe what you'd like to collaborate on..."
                  />
                </div>
                <Button onClick={createCollabRequest}>Send Request</Button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Pending Requests</h3>
              {collabRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No collaboration requests yet
                </p>
              ) : (
                collabRequests.map((request) => (
                  <Card key={request.id} className="p-4 border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{request.project_title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          From: {request.requester_name}
                        </p>
                        <p className="text-sm mt-2">{request.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCollabRequest(request.id, 'accept')}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCollabRequest(request.id, 'decline')}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CollaborationTools;
