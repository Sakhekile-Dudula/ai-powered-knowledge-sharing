import { useState } from 'react'
import { Bot, MessageCircle, X } from 'lucide-react'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: Date
}

export function HelpBot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your MRI Synapse assistant. How can I help you today?',
      isUser: false,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')

  const handleSend = async () => {
    if (!input.trim()) return

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      isUser: true,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')

    // Simulate bot response
    // In a real implementation, this would call your AI service
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: getHelpfulResponse(input),
        isUser: false,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMessage])
    }, 1000)
  }

  const getHelpfulResponse = (query: string): string => {
    // Simple response logic - in production, this would be replaced with a real AI service
    const responses = {
      default: "I'll help you find what you're looking for. Could you please provide more details?",
      search: "To search for knowledge items, use the search tab in the main navigation. You can filter by topics and teams.",
      experts: "You can find experts in the 'Experts' tab. Filter by skills or departments to find the right person.",
      projects: "The Projects tab shows all active projects. You can connect with team members and view project details.",
      error: "If you're experiencing an error, try refreshing the page or checking your connection. Contact support if the issue persists.",
    }

    query = query.toLowerCase()
    if (query.includes('search') || query.includes('find')) return responses.search
    if (query.includes('expert') || query.includes('help')) return responses.experts
    if (query.includes('project') || query.includes('team')) return responses.projects
    if (query.includes('error') || query.includes('problem')) return responses.error
    return responses.default
  }

  return (
    <>
      {/* Bot trigger button */}
      <Button
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 shadow-lg"
        onClick={() => setIsOpen(true)}
      >
        <Bot className="h-6 w-6 text-white" />
      </Button>

      {/* Chat dialog */}
      {isOpen && (
        <Card className="fixed bottom-20 right-4 w-96 h-[500px] flex flex-col shadow-xl">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600" />
              <h3 className="font-medium">Help Assistant</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.isUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t">
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
                placeholder="Type your question..."
                className="flex-1"
              />
              <Button type="submit">
                <MessageCircle className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      )}
    </>
  )
}