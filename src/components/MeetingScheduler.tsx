/**
 * Automated Meeting Scheduler with Teams Integration
 * Uses Microsoft Graph API to create Teams meetings with calendar sync
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Calendar, Clock, Users, Video, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getGraphClient } from '../utils/graphAPI';
import { toast } from 'sonner';

interface MeetingSchedulerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultParticipants?: string[];
  defaultSubject?: string;
}

export function MeetingScheduler({ 
  open, 
  onOpenChange, 
  defaultParticipants = [],
  defaultSubject = ''
}: MeetingSchedulerProps) {
  const [subject, setSubject] = useState(defaultSubject);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [participants, setParticipants] = useState<string[]>(defaultParticipants);
  const [newParticipant, setNewParticipant] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availability, setAvailability] = useState<Map<string, boolean>>(new Map());
  const [meetingCreated, setMeetingCreated] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState('');

  const addParticipant = () => {
    if (newParticipant && isValidEmail(newParticipant) && !participants.includes(newParticipant)) {
      setParticipants([...participants, newParticipant]);
      setNewParticipant('');
    }
  };

  const removeParticipant = (email: string) => {
    setParticipants(participants.filter(p => p !== email));
  };

  const checkAvailability = async () => {
    if (!date || !startTime) {
      toast.error('Please select date and time first');
      return;
    }

    setCheckingAvailability(true);
    const graphClient = getGraphClient();

    if (!graphClient.isInitialized()) {
      toast.error('Microsoft Graph API not configured. Please contact your administrator.');
      setCheckingAvailability(false);
      return;
    }

    try {
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(startDateTime.getTime() + parseInt(duration) * 60000);

      const availabilityMap = new Map<string, boolean>();

      for (const participant of participants) {
        const isAvailable = await graphClient.checkAvailability(
          participant,
          startDateTime,
          endDateTime
        );
        availabilityMap.set(participant, isAvailable);
      }

      setAvailability(availabilityMap);
      
      const unavailableCount = Array.from(availabilityMap.values()).filter(v => !v).length;
      if (unavailableCount > 0) {
        toast.warning(`${unavailableCount} participant(s) may not be available`);
      } else {
        toast.success('All participants are available!');
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      toast.error('Could not check availability. You can still create the meeting.');
    } finally {
      setCheckingAvailability(false);
    }
  };

  const createMeeting = async () => {
    if (!subject || !date || !startTime || participants.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    const graphClient = getGraphClient();

    if (!graphClient.isInitialized()) {
      toast.error('Microsoft Graph API not configured. Please contact your administrator.');
      setIsCreating(false);
      return;
    }

    try {
      const startDateTime = new Date(`${date}T${startTime}`);
      const endDateTime = new Date(startDateTime.getTime() + parseInt(duration) * 60000);

      const meeting = await graphClient.createMeeting({
        subject,
        description,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        participants,
        isOnlineMeeting: true,
      });

      setMeetingUrl(meeting.joinUrl);
      setMeetingCreated(true);
      
      toast.success('Teams meeting created successfully!');
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast.error('Failed to create meeting. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setSubject(defaultSubject);
    setDescription('');
    setDate('');
    setStartTime('');
    setDuration('30');
    setParticipants(defaultParticipants);
    setNewParticipant('');
    setMeetingCreated(false);
    setMeetingUrl('');
    setAvailability(new Map());
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  if (meetingCreated) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Meeting Created!
            </DialogTitle>
            <DialogDescription>
              Your Teams meeting has been successfully created and added to calendars.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">{subject}</h4>
              <p className="text-sm text-green-700 mb-3">
                {new Date(date + 'T' + startTime).toLocaleString()} · {duration} minutes
              </p>
              <Button
                onClick={() => window.open(meetingUrl, '_blank')}
                className="w-full"
              >
                <Video className="w-4 h-4 mr-2" />
                Join Meeting
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>📧 Calendar invites sent to:</p>
              <ul className="mt-2 space-y-1">
                {participants.map(p => (
                  <li key={p} className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={resetForm}>
                Create Another
              </Button>
              <Button className="flex-1" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            Schedule Teams Meeting
          </DialogTitle>
          <DialogDescription>
            Create a Microsoft Teams meeting with automatic calendar sync
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Meeting Subject *</Label>
            <Input
              id="subject"
              placeholder="e.g., Weekly Standup"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Meeting agenda or notes..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date *
              </Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Start Time *
              </Label>
              <Input
                id="time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
            </select>
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Participants *
            </Label>
            
            <div className="flex gap-2">
              <Input
                placeholder="Enter email address"
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
              />
              <Button type="button" onClick={addParticipant} variant="outline">
                Add
              </Button>
            </div>

            {participants.length > 0 && (
              <div className="space-y-2 mt-3">
                {participants.map(email => (
                  <div key={email} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{email}</span>
                      {availability.has(email) && (
                        availability.get(email) ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Available
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            May be busy
                          </Badge>
                        )
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeParticipant(email)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={checkAvailability}
              disabled={!date || !startTime || participants.length === 0 || checkingAvailability}
            >
              {checkingAvailability ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Clock className="w-4 h-4 mr-2" />
              )}
              Check Availability
            </Button>
            
            <Button
              type="button"
              className="flex-1"
              onClick={createMeeting}
              disabled={!subject || !date || !startTime || participants.length === 0 || isCreating}
            >
              {isCreating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Video className="w-4 h-4 mr-2" />
              )}
              Create Meeting
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
