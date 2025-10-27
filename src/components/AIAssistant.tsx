import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { supabase } from '../lib/supabase';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Tag, 
  Link as LinkIcon,
  FileText,
  Loader2,
  Lightbulb,
  TrendingUp
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface Expert {
  id: string;
  name: string;
  expertise: string[];
  relevance: number;
}

interface Connection {
  id: string;
  person1: string;
  person2: string;
  sharedProjects: string[];
  score: number;
}

export default function AIAssistant() {
  const [activeTab, setActiveTab] = useState('chatbot');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I\'m your AI knowledge assistant. Ask me things like:\n• "Who knows about React?"\n• "Find experts in machine learning"\n• "Suggest connections for John Doe"\n• "What are the trending topics?"',
      timestamp: new Date(),
      suggestions: [
        'Who knows about TypeScript?',
        'Find experts in cloud architecture',
        'What projects use AI?',
        'Show trending topics'
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    loadTrendingTopics();
  }, []);

  const loadTrendingTopics = async () => {
    try {
      // Get most common tags from knowledge items
      const { data, error } = await supabase
        .from('knowledge_items')
        .select('tags')
        .not('tags', 'is', null);

      if (error) throw error;

      const allTags: string[] = [];
      data?.forEach(item => {
        if (item.tags && Array.isArray(item.tags)) {
          allTags.push(...item.tags);
        }
      });

      // Count frequency
      const tagCounts: { [key: string]: number } = {};
      allTags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });

      // Sort and get top 10
      const trending = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag]) => tag);

      setTrendingTopics(trending);
    } catch (error) {
      console.error('Error loading trending topics:', error);
    }
  };

  const processQuery = async (query: string) => {
    setIsLoading(true);

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      let response = '';
      let suggestions: string[] = [];

      // Pattern matching for different query types
      const lowerQuery = query.toLowerCase();

      if (lowerQuery.includes('who knows') || lowerQuery.includes('expert') || lowerQuery.includes('find')) {
        // Expert finding
        const searchTerm = extractSearchTerm(query);
        const foundExperts = await findExperts(searchTerm);

        if (foundExperts.length > 0) {
          response = `I found ${foundExperts.length} expert(s) with knowledge in "${searchTerm}":\n\n`;
          foundExperts.forEach((expert, idx) => {
            response += `${idx + 1}. **${expert.name}**\n   Skills: ${expert.expertise.join(', ')}\n   Relevance: ${(expert.relevance * 100).toFixed(0)}%\n\n`;
          });
        } else {
          response = `I couldn't find any experts specifically for "${searchTerm}". Try:\n• Broadening your search terms\n• Checking spelling\n• Asking about related topics`;
        }

        suggestions = [
          'Find experts in AI',
          'Who knows about databases?',
          'Find cloud architects'
        ];

      } else if (lowerQuery.includes('connection') || lowerQuery.includes('suggest') || lowerQuery.includes('recommend')) {
        // Connection suggestions
        const userName = extractUserName(query);
        const suggestedConnections = await suggestConnections(userName);

        if (suggestedConnections.length > 0) {
          response = `Based on project history and expertise, here are suggested connections:\n\n`;
          suggestedConnections.forEach((conn, idx) => {
            response += `${idx + 1}. Connect **${conn.person1}** with **${conn.person2}**\n   Shared interests: ${conn.sharedProjects.join(', ')}\n   Match score: ${(conn.score * 100).toFixed(0)}%\n\n`;
          });
        } else {
          response = `I couldn't find connection suggestions. This might be because:\n• Limited project history\n• Not enough shared expertise areas\n• Need more user data`;
        }

        suggestions = [
          'Who should work with our AI team?',
          'Suggest connections for DevOps',
          'Find collaboration opportunities'
        ];

      } else if (lowerQuery.includes('trending') || lowerQuery.includes('popular') || lowerQuery.includes('topic')) {
        // Trending topics
        response = `Here are the trending topics based on recent activity:\n\n`;
        if (trendingTopics.length > 0) {
          trendingTopics.forEach((topic, idx) => {
            response += `${idx + 1}. **${topic}**\n`;
          });
        } else {
          response += 'No trending topics found yet. Topics will appear as users create and tag more content.';
        }

        suggestions = [
          'Who knows about the top trending topic?',
          'Show me projects using trending tech',
          'What\'s new in our knowledge base?'
        ];

      } else if (lowerQuery.includes('summarize') || lowerQuery.includes('summary')) {
        // Document summarization
        response = `📄 **Document Summary Generation**\n\nTo summarize a document, I would:\n1. Extract key points and main ideas\n2. Identify important technical concepts\n3. Highlight action items and conclusions\n4. Suggest related resources\n\nThis feature uses NLP to analyze long-form content and create concise summaries. Select a specific document to get started!`;

        suggestions = [
          'Summarize the latest design doc',
          'What are the key points in the architecture guide?',
          'Give me a summary of the Q4 roadmap'
        ];

      } else if (lowerQuery.includes('tag') || lowerQuery.includes('categorize')) {
        // Auto-tagging
        response = `🏷️ **Auto-Tagging with NLP**\n\nI can automatically tag content by:\n• Analyzing technical terms and frameworks\n• Identifying programming languages\n• Detecting project types and domains\n• Recognizing common patterns\n\nExample tags I might suggest:\n• React, TypeScript, Frontend\n• Machine Learning, Python, AI\n• DevOps, Docker, Kubernetes\n• Database, PostgreSQL, Backend`;

        suggestions = [
          'Tag my latest document',
          'What tags should I use for a React project?',
          'Suggest categories for my content'
        ];

      } else {
        // Generic/help response
        response = `I'm here to help with:\n\n🔍 **Expert Discovery**\n"Who knows about [topic]?"\n\n🤝 **Connection Suggestions**\n"Suggest connections for [person]"\n\n📈 **Trending Topics**\n"What's trending?"\n\n🏷️ **Auto-Tagging**\n"Tag my content about [topic]"\n\n📝 **Summarization**\n"Summarize [document]"\n\nTry one of the suggestions below!`;

        suggestions = [
          'Who knows about React?',
          'What are the trending topics?',
          'Suggest connections based on AI projects',
          'Help me tag my document'
        ];
      }

      // Add assistant response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        suggestions
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error processing query:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setInput('');
    }
  };

  const extractSearchTerm = (query: string): string => {
    // Extract topic from queries like "Who knows about React?" or "Find experts in AI"
    const patterns = [
      /who knows (?:about |in )?(.+?)(?:\?|$)/i,
      /find (?:experts? |people )?(?:in |with |about )?(.+?)(?:\?|$)/i,
      /expert(?:s)? (?:in |about |with )?(.+?)(?:\?|$)/i
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return query.replace(/who knows|find|expert|about|in/gi, '').trim();
  };

  const extractUserName = (query: string): string => {
    const match = query.match(/(?:for |with )(.+?)(?:\?|$)/i);
    return match ? match[1].trim() : '';
  };

  const findExperts = async (searchTerm: string): Promise<Expert[]> => {
    try {
      // Search in profiles for matching skills
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, skills, bio')
        .not('skills', 'is', null);

      if (error) throw error;

      const experts: Expert[] = [];
      const searchLower = searchTerm.toLowerCase();

      profiles?.forEach(profile => {
        let relevance = 0;
        const expertise: string[] = [];

        // Check skills
        if (profile.skills && Array.isArray(profile.skills)) {
          profile.skills.forEach((skill: string) => {
            if (skill.toLowerCase().includes(searchLower) || searchLower.includes(skill.toLowerCase())) {
              relevance += 0.5;
              expertise.push(skill);
            }
          });
        }

        // Check bio
        if (profile.bio && profile.bio.toLowerCase().includes(searchLower)) {
          relevance += 0.3;
        }

        if (relevance > 0) {
          experts.push({
            id: profile.id,
            name: profile.full_name || 'Unknown',
            expertise: expertise.length > 0 ? expertise : profile.skills || [],
            relevance: Math.min(relevance, 1)
          });
        }
      });

      return experts.sort((a, b) => b.relevance - a.relevance).slice(0, 5);
    } catch (error) {
      console.error('Error finding experts:', error);
      return [];
    }
  };

  // Function reserved for connection suggestion feature
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const suggestConnections = async (_userName: string): Promise<Connection[]> => {
    try {
      // Get all profiles with their project history
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, skills, department');

      if (error) throw error;

      const connections: Connection[] = [];

      // Simple connection logic based on shared skills
      for (let i = 0; i < (profiles?.length || 0); i++) {
        for (let j = i + 1; j < (profiles?.length || 0); j++) {
          const person1 = profiles![i];
          const person2 = profiles![j];

          const skills1 = person1.skills || [];
          const skills2 = person2.skills || [];
          const sharedSkills = skills1.filter((s: string) => skills2.includes(s));

          if (sharedSkills.length > 0) {
            connections.push({
              id: `${person1.id}-${person2.id}`,
              person1: person1.full_name || 'Unknown',
              person2: person2.full_name || 'Unknown',
              sharedProjects: sharedSkills,
              score: sharedSkills.length / Math.max(skills1.length, skills2.length)
            });
          }
        }
      }

      return connections.sort((a, b) => b.score - a.score).slice(0, 5);
    } catch (error) {
      console.error('Error suggesting connections:', error);
      return [];
    }
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    processQuery(input);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    processQuery(suggestion);
  };

  const renderChatbot = () => (
    <div className="flex flex-col h-[600px]">
      <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-t-lg">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${
              message.role === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white'
            } rounded-lg p-4 shadow`}>
              {message.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-4 h-4" />
                  <span className="text-xs font-semibold">AI Assistant</span>
                </div>
              )}
              <div className="whitespace-pre-line text-sm">{message.content}</div>
              
              {message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold opacity-70">Try asking:</p>
                  {message.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="block w-full text-left text-xs bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-2 rounded transition-colors"
                    >
                      💡 {suggestion}
                    </button>
                  ))}
                </div>
              )}
              
              <div className="mt-2 text-xs opacity-50">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-700 rounded-lg p-4 shadow">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white dark:bg-slate-700 rounded-b-lg border-t border-slate-200 dark:border-slate-600">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  const renderAutoTagging = () => (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Tag className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Auto-Tagging with NLP</h3>
        </div>

        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Our AI automatically analyzes your content and suggests relevant tags based on:
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Technical Terms</h4>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Identifies frameworks, languages, and tools mentioned in your content
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
            <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">Project Context</h4>
            <p className="text-sm text-green-700 dark:text-green-400">
              Understands project types, domains, and application areas
            </p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
            <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">Skill Matching</h4>
            <p className="text-sm text-purple-700 dark:text-purple-400">
              Matches content with relevant skills and expertise areas
            </p>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <h4 className="font-semibold text-orange-900 dark:text-orange-300 mb-2">Trending Topics</h4>
            <p className="text-sm text-orange-700 dark:text-orange-400">
              Suggests tags based on popular and emerging topics
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Example: Auto-Tagged Content</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            "Building a scalable microservices architecture using Docker and Kubernetes on AWS..."
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs">Microservices</span>
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs">Docker</span>
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs">Kubernetes</span>
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs">AWS</span>
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs">Cloud Architecture</span>
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-xs">DevOps</span>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderSummarization = () => (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Document Summarization</h3>
        </div>

        <p className="text-slate-600 dark:text-slate-400 mb-6">
          Our AI can automatically generate concise summaries of long documents, highlighting:
        </p>

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-yellow-600 mt-1" />
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white">Key Points</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">Main ideas and important takeaways</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 mt-1" />
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white">Technical Concepts</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">Important technical terms and methods</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white">Action Items</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">Tasks and next steps mentioned</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <LinkIcon className="w-5 h-5 text-green-600 mt-1" />
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white">Related Resources</h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">Suggested related content and references</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Example Summary</h4>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-semibold text-blue-600 dark:text-blue-400">📄 Original:</span>
              <p className="text-slate-600 dark:text-slate-400 mt-1 text-xs">
                (5000 word technical document about microservices migration...)
              </p>
            </div>
            <div>
              <span className="font-semibold text-green-600 dark:text-green-400">✨ Summary:</span>
              <p className="text-slate-900 dark:text-white mt-1">
                This document outlines our migration from monolithic to microservices architecture. Key benefits include improved scalability and independent deployment. Main challenges: data consistency and increased complexity. Recommended approach: gradual migration using strangler pattern. Timeline: 6 months with Phase 1 focusing on user authentication service.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">AI-Powered Features</h2>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <Button
          variant={activeTab === 'chatbot' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('chatbot')}
          className="rounded-b-none"
        >
          <Bot className="w-4 h-4 mr-2" />
          AI Chatbot
        </Button>
        <Button
          variant={activeTab === 'tagging' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('tagging')}
          className="rounded-b-none"
        >
          <Tag className="w-4 h-4 mr-2" />
          Auto-Tagging
        </Button>
        <Button
          variant={activeTab === 'summarization' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('summarization')}
          className="rounded-b-none"
        >
          <FileText className="w-4 h-4 mr-2" />
          Summarization
        </Button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'chatbot' && renderChatbot()}
        {activeTab === 'tagging' && renderAutoTagging()}
        {activeTab === 'summarization' && renderSummarization()}
      </div>
    </div>
  );
}
