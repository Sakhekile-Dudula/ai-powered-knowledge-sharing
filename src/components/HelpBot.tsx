import { useState, useEffect, useRef } from 'react'
import { Bot, MessageCircle, X } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { Badge } from './ui/badge'

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
  suggestions?: string[]
}

export function HelpBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your MRI Synapse assistant. I can help you with:\n\n• Finding experts and team members\n• Navigating features and tools\n• Understanding analytics\n• Q&A system guidance\n• Troubleshooting issues\n• Best practices\n\nWhat would you like to know?',
      isUser: false,
      timestamp: new Date(),
      suggestions: [
        'How do I find an expert?',
        'How does the Q&A system work?',
        'Show me analytics features',
        'How to send messages?'
      ]
    },
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input
    if (!textToSend.trim()) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: textToSend,
      isUser: true,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')

    // Show typing indicator
    setIsTyping(true)

    // Simulate brief thinking time for better UX
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: getHelpfulResponse(textToSend),
        isUser: false,
        timestamp: new Date(),
        suggestions: getSuggestions(textToSend)
      }
      setMessages((prev) => [...prev, botMessage])
      setIsTyping(false)
    }, 800)
  }

  const getSuggestions = (query: string): string[] | undefined => {
    const lowerQuery = query.toLowerCase()
    
    if (lowerQuery.includes('expert') || lowerQuery.includes('find')) {
      return ['How to filter experts?', 'What skills can I search for?', 'How to connect with experts?']
    }
    if (lowerQuery.includes('q&a') || lowerQuery.includes('question')) {
      return ['How to ask a question?', 'How does voting work?', 'How to accept an answer?']
    }
    if (lowerQuery.includes('analytics') || lowerQuery.includes('metrics')) {
      return ['What metrics are tracked?', 'How is reputation calculated?', 'Show trending topics']
    }
    if (lowerQuery.includes('message')) {
      return ['How to start a conversation?', 'Are messages real-time?', 'Message notifications']
    }
    return undefined
  }

  const getHelpfulResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase()

    // Expert Finder help
    if (lowerQuery.includes('expert') || lowerQuery.includes('find expert')) {
      return 'Finding Experts:\n\n1. Go to the Experts tab\n2. Use the search bar to search by name, role, department, or skills\n3. Press Enter to see results\n4. Click on profiles to view details\n5. Use Connect button to send connection requests\n\nPro tip: Search by specific skills like "React" or "SQL" to find the right experts!'
    }

    // Q&A System help
    if (lowerQuery.includes('q&a') || lowerQuery.includes('question') || lowerQuery.includes('answer')) {
      return 'Q&A System Guide:\n\nAsking Questions:\n• Click "Ask Question" button\n• Add a clear title and description\n• Tag with relevant topics (e.g., React, API, Database)\n• Submit and wait for expert answers!\n\nAnswering:\n• Browse questions in Q&A tab\n• Click on a question to see details\n• Post your answer\n• Earn reputation points!\n\nVoting:\n• Upvote helpful answers\n• Authors can accept the best answer\n\nReputation: Earn points for helping others!'
    }

    // Analytics help
    if (lowerQuery.includes('analytics') || lowerQuery.includes('metric') || lowerQuery.includes('dashboard')) {
      return 'Analytics Dashboard:\n\nAvailable Insights:\n• Overview: Activity timeline, user engagement\n• Contributors: Top users by reputation\n• Skills: Most popular skills distribution\n• Trends: Rising/falling topics\n\nReputation System:\n• Answer: +5 points\n• Accepted answer: +15 bonus\n• Knowledge item: +10 points\n• Upvote: +2 points\n\nAccess: Go to Insights → Analytics tab\n\nTip: Track trending topics to stay updated!'
    }

    // Messages help
    if (lowerQuery.includes('message') || lowerQuery.includes('chat') || lowerQuery.includes('conversation')) {
      return 'Messaging System:\n\nStarting Conversations:\n1. Go to Messages tab\n2. Click "+ New Message"\n3. Select a user\n4. Type and send!\n\nFeatures:\n• Real-time messaging\n• Unread indicators\n• Message history\n• Search conversations\n\nNotifications:\n• Bell icon shows new messages\n• Toast notifications for updates\n\nTip: Connect with experts first for better collaboration!'
    }

    // Notifications help
    if (lowerQuery.includes('notification') || lowerQuery.includes('alert')) {
      return 'Smart Notifications:\n\nYou get notified for:\n• New connection requests\n• Accepted connections\n• New messages\n• Questions matching your expertise\n• Answers to your questions\n• Accepted answers\n\nManaging:\n• Click bell icon to view all\n• Mark individual as read\n• Mark all as read\n\nReal-time updates keep you in the loop!'
    }

    // Dashboard help
    if (lowerQuery.includes('dashboard') || lowerQuery.includes('home')) {
      return 'Dashboard Overview:\n\nYour Hub shows:\n• Activity feed\n• Recent questions\n• Trending topics\n• Active projects\n• Team updates\n• Quick stats\n\nNavigation:\n• 7 main tabs at the top\n• Click any tab to explore\n• Use search for quick access\n\nKeyboard shortcuts available (press ? to see)'
    }

    // Search help
    if (lowerQuery.includes('search') || lowerQuery.includes('find')) {
      return 'Search Features:\n\nKnowledge Search:\n• Search across all content\n• Filter by type, team, topic\n• Sort by relevance or date\n• View detailed results\n\nExpert Search:\n• Multi-field search (name, role, skills)\n• Department filters\n• Real-time results\n\nQ&A Search:\n• Filter: All, Open, Answered, Closed\n• Sort: Recent, Popular, Unanswered\n• Tag-based filtering\n\nTip: Use specific keywords for better results!'
    }

    // Projects/Connections help
    if (lowerQuery.includes('project') || lowerQuery.includes('connection') || lowerQuery.includes('collaborate')) {
      return 'Projects & Connections:\n\nConnecting:\n1. Find users in Experts tab\n2. Click "Connect" button\n3. Wait for acceptance\n4. Start collaborating!\n\nProjects:\n• View in Projects tab\n• See team members\n• Track progress\n• Join discussions\n\nCollaboration:\n• Cross-team connections tracked\n• Department collaboration matrix\n• Network visualization (coming soon)\n\nAnalytics show your collaboration impact!'
    }

    // Insights/Knowledge Sharing help
    if (lowerQuery.includes('insight') || lowerQuery.includes('knowledge') || lowerQuery.includes('share')) {
      return 'Knowledge Sharing:\n\nInsights Tab:\n• Share tips & best practices\n• Post success stories\n• Create how-to guides\n• Share lessons learned\n\nCategories:\n• Success stories\n• Tips & tricks\n• Lessons learned\n• Best practices\n\nImpact:\n• Track views and likes\n• See trending insights\n• Discover what works\n\nContribute: Your knowledge helps the team!'
    }

    // Profile/Settings help
    if (lowerQuery.includes('profile') || lowerQuery.includes('setting') || lowerQuery.includes('account')) {
      return 'Profile & Settings:\n\nYour Profile includes:\n• Full name & role\n• Department & team\n• Skills & expertise\n• Reputation score\n• Activity stats\n\nUpdate Profile:\n• Currently: Contact admin\n• Coming soon: Self-service edit\n\nPrivacy:\n• Your activity is visible\n• Helps others find you\n• Build your reputation\n\nTheme: Toggle dark/light mode (moon icon)'
    }

    // Getting Started
    if (lowerQuery.includes('start') || lowerQuery.includes('begin') || lowerQuery.includes('tutorial')) {
      return 'Getting Started:\n\nQuick Start:\n1. Complete your profile\n2. Add your skills & expertise\n3. Explore the Experts tab\n4. Ask or answer questions\n5. Share insights\n\nKey Features:\n• Dashboard: Your activity hub\n• Search: Find content\n• Q&A: Ask & answer\n• Experts: Find teammates\n• Projects: Collaborate\n• Messages: Chat\n• Insights: Share knowledge\n\nPro Tips:\n• Add specific skills to be discoverable\n• Answer questions to build reputation\n• Use tags on questions for better visibility'
    }

    // Troubleshooting
    if (lowerQuery.includes('error') || lowerQuery.includes('problem') || lowerQuery.includes('bug') || lowerQuery.includes('issue') || lowerQuery.includes('not working')) {
      return 'Troubleshooting:\n\nCommon Solutions:\n\n1. Page not loading:\n   • Refresh the page (F5)\n   • Clear browser cache\n   • Check internet connection\n\n2. Can\'t see data:\n   • Ensure you\'re logged in\n   • Check filters/search terms\n   • Database may be loading\n\n3. Features not working:\n   • Update your browser\n   • Disable ad blockers\n   • Try incognito mode\n\n4. Search shows nothing:\n   • Check spelling\n   • Try broader terms\n   • Remove filters\n\nStill having issues?\nContact your admin or IT support!'
    }

    // Reputation/Points
    if (lowerQuery.includes('reputation') || lowerQuery.includes('points') || lowerQuery.includes('score')) {
      return 'Reputation System:\n\nHow to Earn Points:\n• Post an answer: +5 points\n• Answer accepted: +15 bonus\n• Create knowledge item: +10 points\n• Receive upvote: +2 points\n\nWhy Reputation Matters:\n• Leaderboard recognition\n• Shows expertise level\n• Helps others trust your answers\n• Tracked in analytics\n\nCheck Rankings:\nGo to Insights → Analytics → Contributors tab\n\nPro Tip: Quality over quantity - accepted answers give the most points!'
    }

    // Tags/Topics
    if (lowerQuery.includes('tag') || lowerQuery.includes('topic') || lowerQuery.includes('category')) {
      return 'Tags & Topics:\n\nUsing Tags:\n• Add to questions (e.g., React, API, Database)\n• Separate with commas\n• Be specific and relevant\n• Use existing tags when possible\n\nBenefits:\n• Better search results\n• Matches expert expertise\n• Trending topic tracking\n• Analytics insights\n\nTrending Topics:\n• View in Analytics → Trends tab\n• Shows rising/falling topics\n• Based on last 7 days\n\nTip: Good tags = better answers faster!'
    }

    // Skills/Expertise
    if (lowerQuery.includes('skill') || lowerQuery.includes('expertise') || lowerQuery.includes('talent')) {
      return 'Skills & Expertise:\n\nAdding Skills:\n• Update during signup\n• Comma-separated list\n• Be specific (e.g., "React 18", "PostgreSQL")\n• Include technologies, tools, domains\n\nWhy It Matters:\n• Helps others find you\n• Get relevant questions\n• Featured in analytics\n• Build your profile\n\nPopular Skills:\nView in Analytics → Skills tab\n\nBest Practice:\n• Include 5-10 key skills\n• Mix technologies & domains\n• Update as you learn!\n\nTip: Specific skills = better matches!'
    }

    // Default helpful response
    return 'I\'m here to help!\n\nI can assist you with:\n\nCore Features:\n• Finding experts & team members\n• Q&A system (asking & answering)\n• Analytics & insights\n• Messaging & notifications\n• Projects & connections\n\nGetting Around:\n• Navigation & shortcuts\n• Search & filters\n• Profile settings\n\nTroubleshooting:\n• Common issues\n• Error solutions\n• Best practices\n\nTry asking:\n• "How do I find an expert?"\n• "How does Q&A work?"\n• "Show me analytics"\n• "Getting started guide"\n\nWhat would you like to know more about?'
  }

  return (
    <>
      {/* Bot trigger button */}
      {!isOpen && (
        <Button
          className="fixed !bottom-4 !left-4 h-12 w-12 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-lg hover:shadow-xl transition-all !z-[9999]"
          style={{ position: 'fixed', bottom: '1rem', left: '1rem' }}
          onClick={() => setIsOpen(true)}
        >
          <Bot className="h-6 w-6 text-white" />
        </Button>
      )}

      {/* Chat dialog */}
      {isOpen && (
        <Card 
          className="fixed !bottom-4 !left-4 w-80 h-[480px] max-h-[480px] flex flex-col shadow-2xl !z-[9999] border-2"
          style={{ position: 'fixed', bottom: '1rem', left: '1rem', height: '480px', maxHeight: '480px' }}
        >
          <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-blue-600 to-cyan-500">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">AI Assistant</h3>
                <p className="text-xs text-white/80">Here to help</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-3 bg-slate-50 dark:bg-slate-900" style={{maxHeight: '320px'}}>
            <div className="space-y-3">
              {messages.map((message) => (
                <div key={message.id} className="space-y-2">
                  <div
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`rounded-2xl px-3 py-2 max-w-[90%] ${
                        message.isUser
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-sm shadow-sm border'
                      }`}
                    >
                      <p className="text-xs whitespace-pre-line leading-relaxed">{message.content}</p>
                      <p className={`text-[10px] mt-0.5 ${message.isUser ? 'text-blue-100' : 'text-slate-400'}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  
                  {/* Quick action suggestions */}
                  {!message.isUser && message.suggestions && message.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pl-1">
                      {message.suggestions.map((suggestion, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-400 transition-colors text-[10px] py-0.5 px-2"
                          onClick={() => handleSend(suggestion)}
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 rounded-2xl px-3 py-2 shadow-sm border rounded-bl-sm">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t bg-white dark:bg-slate-950">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 h-9 text-sm"
                disabled={isTyping}
              />
              <Button 
                type="submit" 
                disabled={isTyping || !input.trim()}
                className="h-9 px-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-xs text-slate-400 mt-1.5 text-center">
              Powered by pattern matching
            </p>
          </div>
        </Card>
      )}
    </>
  )
}