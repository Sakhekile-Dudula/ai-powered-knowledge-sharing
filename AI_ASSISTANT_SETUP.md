# AI-Powered Help Assistant - Setup Guide

The Help Assistant now supports **real AI/ML integration** with ChatGPT-like capabilities!

## 🤖 AI Integration Options

### **Option 1: OpenAI GPT (Recommended)**

1. **Get an OpenAI API Key:**
   - Go to https://platform.openai.com/api-keys
   - Create a new API key
   - Copy the key

2. **Add to Environment:**
   - Open `.env` file in the project root
   - Add this line:
     ```
     VITE_OPENAI_API_KEY=your-api-key-here
     ```

3. **Restart Dev Server:**
   ```bash
   npm run dev
   ```

4. **Done!** The bot will now use GPT-3.5-turbo for intelligent responses.

**Cost:** ~$0.002 per conversation (very affordable)

---

### **Option 2: Supabase Edge Function with OpenAI**

For more security (API key not exposed), create a Supabase Edge Function:

1. **Create Edge Function:**
   ```bash
   supabase functions new ai-chat
   ```

2. **Add to function:**
   ```typescript
   import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

   serve(async (req) => {
     const { query, context } = await req.json()
     
     const response = await fetch('https://api.openai.com/v1/chat/completions', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`
       },
       body: JSON.stringify({
         model: 'gpt-3.5-turbo',
         messages: [
           { role: 'system', content: context },
           { role: 'user', content: query }
         ]
       })
     })

     const data = await response.json()
     return new Response(JSON.stringify(data))
   })
   ```

3. **Deploy:**
   ```bash
   supabase functions deploy ai-chat
   supabase secrets set OPENAI_API_KEY=your-key
   ```

4. **Update HelpBot to use Edge Function** (in `getAIResponse`)

---

### **Option 3: Use Anthropic Claude**

Similar to OpenAI but use Claude API:

```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 500,
    messages: [{ role: 'user', content: query }]
  })
})
```

**Add to .env:**
```
VITE_ANTHROPIC_API_KEY=your-key
```

---

### **Option 4: Google Gemini (Free Tier Available)**

```typescript
const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: query }] }]
  })
})
```

**Get Key:** https://makersuite.google.com/app/apikey

**Add to .env:**
```
VITE_GEMINI_API_KEY=your-key
```

---

### **Option 5: Local LLM (Ollama)**

Run AI locally with no API costs:

1. **Install Ollama:** https://ollama.ai
2. **Pull a model:**
   ```bash
   ollama pull llama2
   ```

3. **Update HelpBot:**
   ```typescript
   const response = await fetch('http://localhost:11434/api/generate', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       model: 'llama2',
       prompt: query,
       stream: false
     })
   })
   ```

**Pros:** Free, private, no internet needed
**Cons:** Requires local compute power

---

## 🎯 Current Setup (Fallback Mode)

**Without an API key**, the bot uses **smart pattern matching** with comprehensive knowledge about:
- All platform features
- Step-by-step guides
- Troubleshooting
- Best practices
- Contextual suggestions

This provides **excellent help** even without AI!

---

## 💡 Recommended Approach

**For Production:**
1. Start with **Smart Pattern Matching** (current setup - free, fast, privacy-friendly)
2. Add **OpenAI GPT** for complex queries ($0.002/conversation)
3. Consider **Supabase Edge Function** for better security
4. Use **Ollama** locally for development/testing

**For Development:**
1. Use **Gemini Free Tier** (generous limits)
2. Or **Ollama** for completely free local testing

---

## 🔧 How It Works

```typescript
// The bot tries AI first, then falls back to pattern matching

try {
  // 1. Try OpenAI/Gemini/Claude
  const aiResponse = await getAIResponse(query)
  showResponse(aiResponse)
} catch (error) {
  // 2. Fallback to smart pattern matching
  const smartResponse = getHelpfulResponse(query)
  showResponse(smartResponse)
}
```

**Benefits:**
✅ Best of both worlds
✅ Always works (even if API is down)
✅ Cost-effective (only uses AI when configured)
✅ Context-aware responses
✅ Conversational memory (last 6 messages)

---

## 📊 Features Already Built In

✅ **Conversation Context** - Remembers last 6 messages
✅ **Smart Suggestions** - Follow-up questions
✅ **Typing Indicator** - Realistic chat feel
✅ **Error Handling** - Graceful fallbacks
✅ **Quick Actions** - Clickable suggestion badges
✅ **Comprehensive Knowledge Base** - All platform features covered

---

## 🚀 Quick Start (OpenAI)

```bash
# 1. Get API key from https://platform.openai.com/api-keys

# 2. Add to .env
echo "VITE_OPENAI_API_KEY=sk-..." >> .env

# 3. Restart server
npm run dev

# 4. Test the bot!
```

---

## 🎨 Customization

Edit `getAIResponse()` in `HelpBot.tsx` to:
- Change AI model (gpt-4, claude-3, etc.)
- Adjust temperature (creativity level)
- Modify system prompt (personality, knowledge)
- Add custom context (user role, history)

---

## 💬 Example Conversations

**With AI:**
```
User: How do I become a top contributor?
Bot: Great question! Here's a comprehensive strategy:

1. Answer Questions Consistently
   • Browse the Q&A tab daily
   • Focus on topics you're expert in
   • Provide detailed, helpful answers

2. Earn Reputation Points
   • Each answer: +5 points
   • Accepted answer: +15 bonus
   • Aim for quality over quantity

3. Build Your Profile
   • Add specific skills
   • Complete your expertise
   • Stay active

Would you like tips on:
- Writing better answers?
- Finding questions to answer?
- Building your expertise profile?
```

**Without AI (Smart Pattern Matching):**
```
User: How do I become a top contributor?
Bot: 🏆 Reputation System:

How to Earn Points:
• Post an answer: +5 points
• Answer accepted: +15 bonus
• Create knowledge item: +10 points
• Receive upvote: +2 points

Check Rankings:
Go to Insights → Analytics → Contributors tab

Pro Tip: Quality over quantity - accepted answers give the most points!
```

Both are helpful! AI provides more conversational, personalized responses.

---

## ❓ FAQ

**Q: Do I need AI for the bot to work?**
A: No! It works great with pattern matching. AI is optional enhancement.

**Q: Which AI service is best?**
A: OpenAI GPT-3.5 is great balance of cost/quality. Gemini has free tier.

**Q: Is my API key safe?**
A: In `.env` it's safer. For production, use Supabase Edge Functions.

**Q: Can I use multiple AI services?**
A: Yes! You can add fallback logic: try OpenAI → try Gemini → use pattern matching.

**Q: What about rate limits?**
A: Free tiers: Gemini (60 req/min), OpenAI ($5 credit). Add caching for popular questions.

---

## 📝 Next Steps

1. Choose your AI provider
2. Get API key
3. Add to `.env`
4. Restart server
5. Test with complex questions
6. Monitor usage/costs
7. Optimize as needed

The bot is now **ready for AI** whenever you are! 🚀
