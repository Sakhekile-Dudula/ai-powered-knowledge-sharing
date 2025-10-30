import { useState, useEffect } from "react";
import { 
  HelpCircle, Plus, Search, ThumbsUp, ThumbsDown, Check, 
  MessageCircle, Eye, Clock, Tag, Filter, ArrowUp, TrendingUp 
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { createClient } from "../utils/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Question {
  id: number;
  author_id: string;
  author_name: string;
  author_role: string;
  title: string;
  description: string;
  tags: string[];
  views: number;
  status: string;
  accepted_answer_id: number | null;
  created_at: string;
  upvotes: number;
  downvotes: number;
  answer_count: number;
}

interface Answer {
  id: number;
  question_id: number;
  author_id: string;
  author_name: string;
  author_role: string;
  content: string;
  is_accepted: boolean;
  created_at: string;
  upvotes: number;
  downvotes: number;
}

interface QASystemProps {
  userId: string;
  userName: string;
}

export function QASystem({ userId }: QASystemProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAskDialogOpen, setIsAskDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  
  // Ask question form
  const [questionTitle, setQuestionTitle] = useState("");
  const [questionDescription, setQuestionDescription] = useState("");
  const [questionTags, setQuestionTags] = useState("");
  
  // Answer form
  const [answerContent, setAnswerContent] = useState("");
  
  const supabase = createClient();

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_questions_with_stats');
      
      if (error) throw error;
      if (data) setQuestions(data);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast.error('Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!questionTitle.trim() || !questionDescription.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast.error('You must be logged in to ask a question');
        console.error('Auth error:', authError);
        return;
      }

      const tags = questionTags
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      console.log('Posting question with user:', user.id);

      const { data, error } = await supabase
        .from('questions')
        .insert({
          author_id: user.id,
          title: questionTitle.trim(),
          description: questionDescription.trim(),
          tags: tags
        })
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Question posted successfully:', data);
      toast.success('Question posted successfully!');
      setQuestionTitle('');
      setQuestionDescription('');
      setQuestionTags('');
      setIsAskDialogOpen(false);
      fetchQuestions();
    } catch (error: any) {
      console.error('Error posting question:', error);
      toast.error(`Failed to post question: ${error.message || 'Unknown error'}`);
    }
  };

  const handleViewQuestion = async (question: Question) => {
    setSelectedQuestion(question);
    
    // Increment view count
    await supabase.rpc('increment_question_views', {
      p_question_id: question.id
    });

    // Fetch answers
    try {
      const { data, error } = await supabase.rpc('get_answers_for_question', {
        p_question_id: question.id
      });

      if (error) throw error;
      if (data) setAnswers(data);
    } catch (error) {
      console.error('Error fetching answers:', error);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answerContent.trim() || !selectedQuestion) {
      toast.error('Please enter an answer');
      return;
    }

    try {
      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast.error('You must be logged in to post an answer');
        console.error('Auth error:', authError);
        return;
      }

      console.log('Posting answer for question:', selectedQuestion.id);
      console.log('User ID:', user.id);
      console.log('Answer content:', answerContent.substring(0, 50) + '...');

      const { data, error } = await supabase
        .from('answers')
        .insert({
          question_id: selectedQuestion.id,
          author_id: user.id,
          content: answerContent.trim()
        })
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Answer posted successfully:', data);
      toast.success('Answer posted successfully!');
      setAnswerContent('');
      
      // Refresh answers
      const { data: answersData } = await supabase.rpc('get_answers_for_question', {
        p_question_id: selectedQuestion.id
      });
      if (answersData) setAnswers(answersData);
      
      // Also refresh questions to update answer count
      await fetchQuestions();
      
    } catch (error: any) {
      console.error('Error posting answer:', error);
      toast.error(`Failed to post answer: ${error.message || 'Unknown error'}`);
    }
  };

  const handleVote = async (type: 'question' | 'answer', id: number, voteType: number) => {
    try {
      await supabase.rpc('toggle_vote', {
        p_votable_type: type,
        p_votable_id: id,
        p_vote_type: voteType
      });

      // Refresh data
      if (type === 'question') {
        fetchQuestions();
      } else if (selectedQuestion) {
        const { data } = await supabase.rpc('get_answers_for_question', {
          p_question_id: selectedQuestion.id
        });
        if (data) setAnswers(data);
      }
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const handleAcceptAnswer = async (answerId: number) => {
    try {
      await supabase.rpc('accept_answer', { p_answer_id: answerId });
      
      toast.success('Answer accepted!');
      
      // Refresh answers
      if (selectedQuestion) {
        const { data } = await supabase.rpc('get_answers_for_question', {
          p_question_id: selectedQuestion.id
        });
        if (data) setAnswers(data);
      }
      
      fetchQuestions();
    } catch (error: any) {
      console.error('Error accepting answer:', error);
      toast.error(error.message || 'Failed to accept answer');
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  };

  const filteredQuestions = questions
    .filter(q => {
      const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           q.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           q.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesStatus = filterStatus === 'all' || q.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'popular':
          return (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes);
        case 'unanswered':
          return a.answer_count - b.answer_count;
        default:
          return 0;
      }
    });

  if (selectedQuestion) {
    return (
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="outline" onClick={() => setSelectedQuestion(null)}>
          ← Back to Questions
        </Button>

        {/* Question Detail */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{selectedQuestion.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs">
                      {getInitials(selectedQuestion.author_name)}
                    </div>
                    <span>{selectedQuestion.author_name}</span>
                  </div>
                  <span>•</span>
                  <span>{selectedQuestion.author_role}</span>
                  <span>•</span>
                  <Clock className="w-4 h-4" />
                  <span>{formatDistanceToNow(new Date(selectedQuestion.created_at), { addSuffix: true })}</span>
                </div>
              </div>
              
              {/* Vote buttons */}
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVote('question', selectedQuestion.id, 1)}
                >
                  <ThumbsUp className="w-4 h-4" />
                </Button>
                <span className="font-semibold">{selectedQuestion.upvotes - selectedQuestion.downvotes}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleVote('question', selectedQuestion.id, -1)}
                >
                  <ThumbsDown className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 dark:text-slate-300 mb-4 whitespace-pre-wrap">
              {selectedQuestion.description}
            </p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedQuestion.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{selectedQuestion.views} views</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                <span>{selectedQuestion.answer_count} answers</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Answers */}
        <Card>
          <CardHeader>
            <CardTitle>{answers.length} Answers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {answers.map((answer) => (
              <div
                key={answer.id}
                className={`p-4 rounded-lg border ${
                  answer.is_accepted
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex gap-4">
                  {/* Vote buttons */}
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVote('answer', answer.id, 1)}
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </Button>
                    <span className="font-semibold">{answer.upvotes - answer.downvotes}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleVote('answer', answer.id, -1)}
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </Button>
                    {selectedQuestion.author_id === userId && !answer.is_accepted && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAcceptAnswer(answer.id)}
                        title="Accept this answer"
                      >
                        <Check className="w-4 h-4 text-green-600" />
                      </Button>
                    )}
                    {answer.is_accepted && (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <Check className="w-4 h-4" />
                        <span className="text-xs font-medium">Accepted</span>
                      </div>
                    )}
                  </div>

                  {/* Answer content */}
                  <div className="flex-1">
                    <p className="text-slate-700 dark:text-slate-300 mb-3 whitespace-pre-wrap">
                      {answer.content}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white text-xs">
                          {getInitials(answer.author_name)}
                        </div>
                        <span>{answer.author_name}</span>
                      </div>
                      <span>•</span>
                      <span>{answer.author_role}</span>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>{formatDistanceToNow(new Date(answer.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Add Answer Form */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
              <h4 className="font-semibold mb-3">Your Answer</h4>
              <Textarea
                placeholder="Share your knowledge..."
                value={answerContent}
                onChange={(e) => setAnswerContent(e.target.value)}
                rows={6}
                className="mb-3"
              />
              <Button onClick={handleSubmitAnswer}>
                Post Answer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
            <HelpCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Knowledge Q&A</h2>
            <p className="text-slate-600 dark:text-slate-400">Ask questions and share expertise</p>
          </div>
        </div>

        <Dialog open={isAskDialogOpen} onOpenChange={setIsAskDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-orange-600 to-red-500">
              <Plus className="w-4 h-4 mr-2" />
              Ask Question
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ask a Question</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Question Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., How to optimize PostgreSQL queries?"
                  value={questionTitle}
                  onChange={(e) => setQuestionTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Provide details about your question..."
                  value={questionDescription}
                  onChange={(e) => setQuestionDescription(e.target.value)}
                  rows={6}
                />
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  placeholder="e.g., React, TypeScript, Performance"
                  value={questionTags}
                  onChange={(e) => setQuestionTags(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsAskDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAskQuestion}>
                  Post Question
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Questions</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="answered">Answered</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Tabs value={sortBy} onValueChange={setSortBy}>
                <TabsList>
                  <TabsTrigger value="recent">
                    <Clock className="w-4 h-4 mr-1" />
                    Recent
                  </TabsTrigger>
                  <TabsTrigger value="popular">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Popular
                  </TabsTrigger>
                  <TabsTrigger value="unanswered">
                    <MessageCircle className="w-4 h-4 mr-1" />
                    Unanswered
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600" />
        </div>
      ) : filteredQuestions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <HelpCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">No questions found</p>
            <Button
              className="mt-4"
              onClick={() => setIsAskDialogOpen(true)}
            >
              Ask the First Question
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredQuestions.map((question) => (
            <Card
              key={question.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleViewQuestion(question)}
            >
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  {/* Stats */}
                  <div className="flex flex-col items-center gap-3 min-w-[80px]">
                    <div className="flex items-center gap-1 text-sm">
                      <ArrowUp className="w-4 h-4 text-green-600" />
                      <span className="font-semibold">{question.upvotes - question.downvotes}</span>
                    </div>
                    <div className={`flex items-center gap-1 text-sm ${
                      question.answer_count > 0 ? 'text-green-600' : 'text-slate-500'
                    }`}>
                      <MessageCircle className="w-4 h-4" />
                      <span className="font-semibold">{question.answer_count}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Eye className="w-4 h-4" />
                      <span>{question.views}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                      {question.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                      {question.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {question.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                      <span>{question.author_name}</span>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>{formatDistanceToNow(new Date(question.created_at), { addSuffix: true })}</span>
                      {question.status === 'answered' && (
                        <>
                          <span>•</span>
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <Check className="w-3 h-3 mr-1" />
                            Answered
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
