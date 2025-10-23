import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

// MRI Synapse API Server - Updated with messaging support
const app = new Hono();

// Create Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Enable logger
app.use("*", logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

// Middleware to verify authenticated user
async function getAuthenticatedUser(authHeader: string | null) {
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

// Health check endpoint
app.get("/make-server-d5b5d02c/health", (c) => {
  return c.json({ status: "ok" });
});

// ===== AUTHENTICATION =====

// Sign up
app.post("/make-server-d5b5d02c/auth/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name, role, team, expertise } = body;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm since email server isn't configured
      user_metadata: { name, role, team },
    });

    if (authError) {
      console.log("Sign up auth error:", authError);
      return c.json({ error: authError.message }, 400);
    }

    // Store user profile
    await kv.set(`user:${authData.user.id}`, {
      id: authData.user.id,
      email,
      name,
      role,
      team,
      expertise: expertise || [],
      projects: [],
      contributions: 0,
      rating: 5.0,
      availability: "Available",
      createdAt: new Date().toISOString(),
    });

    return c.json({ user: authData.user });
  } catch (error) {
    console.log("Sign up error:", error);
    return c.json({ error: "Sign up failed" }, 500);
  }
});

// Sign in
app.post("/make-server-d5b5d02c/auth/signin", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log("Sign in error:", error);
      return c.json({ error: error.message }, 400);
    }

    return c.json({ 
      accessToken: data.session.access_token,
      user: data.user 
    });
  } catch (error) {
    console.log("Sign in error:", error);
    return c.json({ error: "Sign in failed" }, 500);
  }
});

// Get current user profile
app.get("/make-server-d5b5d02c/auth/profile", async (c) => {
  const user = await getAuthenticatedUser(c.req.header("Authorization"));
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const profile = await kv.get(`user:${user.id}`);
    return c.json({ profile });
  } catch (error) {
    console.log("Get profile error:", error);
    return c.json({ error: "Failed to get profile" }, 500);
  }
});

// ===== DASHBOARD =====

// Get dashboard stats
app.get("/make-server-d5b5d02c/dashboard/stats", async (c) => {
  const user = await getAuthenticatedUser(c.req.header("Authorization"));
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const users = await kv.getByPrefix("user:");
    const knowledge = await kv.getByPrefix("knowledge:");
    const projects = await kv.getByPrefix("project:");
    const insights = await kv.getByPrefix("insight:");

    const stats = {
      activeConnections: users.length,
      knowledgeItems: knowledge.length,
      teamCollaborations: projects.length,
      hoursSaved: insights.reduce((sum, i: any) => sum + (i.impact === "High" ? 10 : 5), 0),
    };

    return c.json({ stats });
  } catch (error) {
    console.log("Get stats error:", error);
    return c.json({ error: "Failed to get stats" }, 500);
  }
});

// Get recent activity
app.get("/make-server-d5b5d02c/dashboard/activity", async (c) => {
  const user = await getAuthenticatedUser(c.req.header("Authorization"));
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const activity = await kv.get("activity") || [];
    return c.json({ activity: activity.slice(0, 10) });
  } catch (error) {
    console.log("Get activity error:", error);
    return c.json({ error: "Failed to get activity" }, 500);
  }
});

// ===== KNOWLEDGE SEARCH =====

// Search knowledge base
app.get("/make-server-d5b5d02c/knowledge/search", async (c) => {
  const user = await getAuthenticatedUser(c.req.header("Authorization"));
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const query = c.req.query("q")?.toLowerCase() || "";
    const type = c.req.query("type") || "all";

    let items = await kv.getByPrefix("knowledge:");
    
    // Filter by type
    if (type !== "all") {
      items = items.filter((item: any) => item.type === type);
    }

    // Simple search by title and description
    if (query) {
      items = items.filter((item: any) => 
        item.title.toLowerCase().includes(query) || 
        item.description.toLowerCase().includes(query) ||
        item.tags.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }

    // Sort by relevance (date for now)
    items.sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return c.json({ results: items });
  } catch (error) {
    console.log("Search knowledge error:", error);
    return c.json({ error: "Failed to search knowledge" }, 500);
  }
});

// Add knowledge item
app.post("/make-server-d5b5d02c/knowledge", async (c) => {
  const user = await getAuthenticatedUser(c.req.header("Authorization"));
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const profile = await kv.get(`user:${user.id}`);

    const item = {
      id,
      ...body,
      author: profile?.name || user.email,
      authorId: user.id,
      team: profile?.team || "Unknown",
      date: new Date().toISOString(),
      relevance: 100,
    };

    await kv.set(`knowledge:${id}`, item);

    // Add to activity
    const activity = await kv.get("activity") || [];
    activity.unshift({
      user: item.author,
      action: "shared insights on",
      topic: item.title,
      time: "just now",
      team: item.team,
      timestamp: Date.now(),
    });
    await kv.set("activity", activity.slice(0, 50));

    return c.json({ item });
  } catch (error) {
    console.log("Add knowledge error:", error);
    return c.json({ error: "Failed to add knowledge" }, 500);
  }
});

// ===== EXPERT FINDER =====

// Get all experts
app.get("/make-server-d5b5d02c/experts", async (c) => {
  const user = await getAuthenticatedUser(c.req.header("Authorization"));
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const experts = await kv.getByPrefix("user:");
    return c.json({ experts });
  } catch (error) {
    console.log("Get experts error:", error);
    return c.json({ error: "Failed to get experts" }, 500);
  }
});

// Update user profile
app.put("/make-server-d5b5d02c/experts/:id", async (c) => {
  const user = await getAuthenticatedUser(c.req.header("Authorization"));
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const id = c.req.param("id");
    if (id !== user.id) {
      return c.json({ error: "Can only update own profile" }, 403);
    }

    const body = await c.req.json();
    const profile = await kv.get(`user:${id}`);
    
    const updated = {
      ...profile,
      ...body,
      id,
    };

    await kv.set(`user:${id}`, updated);
    return c.json({ profile: updated });
  } catch (error) {
    console.log("Update profile error:", error);
    return c.json({ error: "Failed to update profile" }, 500);
  }
});

// ===== PROJECTS =====

// Get all projects
app.get("/make-server-d5b5d02c/projects", async (c) => {
  const user = await getAuthenticatedUser(c.req.header("Authorization"));
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const projects = await kv.getByPrefix("project:");
    return c.json({ projects });
  } catch (error) {
    console.log("Get projects error:", error);
    return c.json({ error: "Failed to get projects" }, 500);
  }
});

// Create project
app.post("/make-server-d5b5d02c/projects", async (c) => {
  const user = await getAuthenticatedUser(c.req.header("Authorization"));
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();

    const project = {
      id,
      ...body,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    };

    await kv.set(`project:${id}`, project);
    return c.json({ project });
  } catch (error) {
    console.log("Create project error:", error);
    return c.json({ error: "Failed to create project" }, 500);
  }
});

// ===== INSIGHTS =====

// Get all insights
app.get("/make-server-d5b5d02c/insights", async (c) => {
  const user = await getAuthenticatedUser(c.req.header("Authorization"));
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const insights = await kv.getByPrefix("insight:");
    insights.sort((a: any, b: any) => b.timestamp - a.timestamp);
    return c.json({ insights });
  } catch (error) {
    console.log("Get insights error:", error);
    return c.json({ error: "Failed to get insights" }, 500);
  }
});

// Create insight
app.post("/make-server-d5b5d02c/insights", async (c) => {
  const user = await getAuthenticatedUser(c.req.header("Authorization"));
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const profile = await kv.get(`user:${user.id}`);

    const insight = {
      id,
      ...body,
      author: profile?.name || user.email,
      authorId: user.id,
      team: profile?.team || "Unknown",
      date: new Date().toISOString(),
      timestamp: Date.now(),
      likes: 0,
      comments: 0,
    };

    await kv.set(`insight:${id}`, insight);

    // Update user contributions
    if (profile) {
      profile.contributions = (profile.contributions || 0) + 1;
      await kv.set(`user:${user.id}`, profile);
    }

    return c.json({ insight });
  } catch (error) {
    console.log("Create insight error:", error);
    return c.json({ error: "Failed to create insight" }, 500);
  }
});

// Like insight
app.post("/make-server-d5b5d02c/insights/:id/like", async (c) => {
  const user = await getAuthenticatedUser(c.req.header("Authorization"));
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const id = c.req.param("id");
    const insight = await kv.get(`insight:${id}`);
    
    if (!insight) {
      return c.json({ error: "Insight not found" }, 404);
    }

    insight.likes = (insight.likes || 0) + 1;
    await kv.set(`insight:${id}`, insight);

    return c.json({ insight });
  } catch (error) {
    console.log("Like insight error:", error);
    return c.json({ error: "Failed to like insight" }, 500);
  }
});

// ===== MESSAGING =====

// Get all conversations for current user
app.get("/make-server-d5b5d02c/conversations", async (c) => {
  const user = await getAuthenticatedUser(c.req.header("Authorization"));
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const profile = await kv.get(`user:${user.id}`);
    const allMessages = await kv.getByPrefix("message:");
    
    // Group messages by conversation
    const conversationMap = new Map();
    
    for (const message of allMessages) {
      // Check if current user is sender or recipient
      const isSender = message.senderId === user.id;
      const isRecipient = message.recipientName === (profile?.name || user.email);
      
      if (!isSender && !isRecipient) continue;
      
      // Get the other participant's name
      const participantName = isSender ? message.recipientName : message.senderName;
      
      if (!conversationMap.has(participantName)) {
        conversationMap.set(participantName, {
          id: participantName,
          participantName,
          lastMessage: message.content,
          timestamp: message.timestamp,
          unreadCount: 0,
        });
      } else {
        const existing = conversationMap.get(participantName);
        if (new Date(message.timestamp) > new Date(existing.timestamp)) {
          existing.lastMessage = message.content;
          existing.timestamp = message.timestamp;
        }
      }
    }
    
    const conversations = Array.from(conversationMap.values());
    conversations.sort((a: any, b: any) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    return c.json({ conversations });
  } catch (error) {
    console.log("Get conversations error:", error);
    return c.json({ error: "Failed to get conversations" }, 500);
  }
});

// Get messages for a conversation
app.get("/make-server-d5b5d02c/messages", async (c) => {
  const user = await getAuthenticatedUser(c.req.header("Authorization"));
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const recipient = c.req.query("recipient");
    if (!recipient) {
      return c.json({ error: "Recipient required" }, 400);
    }

    const profile = await kv.get(`user:${user.id}`);
    const currentUserName = profile?.name || user.email;
    
    const allMessages = await kv.getByPrefix("message:");
    
    // Filter messages for this conversation
    const messages = allMessages
      .filter((msg: any) => 
        (msg.senderName === currentUserName && msg.recipientName === recipient) ||
        (msg.senderName === recipient && msg.recipientName === currentUserName)
      )
      .map((msg: any) => ({
        id: msg.id,
        sender: msg.senderName,
        content: msg.content,
        timestamp: msg.timestamp,
        isCurrentUser: msg.senderName === currentUserName,
      }))
      .sort((a: any, b: any) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    
    return c.json({ messages });
  } catch (error) {
    console.log("Get messages error:", error);
    return c.json({ error: "Failed to get messages" }, 500);
  }
});

// Send a message
app.post("/make-server-d5b5d02c/messages", async (c) => {
  const user = await getAuthenticatedUser(c.req.header("Authorization"));
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await c.req.json();
    const { recipient, content } = body;
    
    if (!recipient || !content) {
      return c.json({ error: "Recipient and content required" }, 400);
    }

    const profile = await kv.get(`user:${user.id}`);
    const messageId = crypto.randomUUID();
    
    const message = {
      id: messageId,
      senderId: user.id,
      senderName: profile?.name || user.email,
      recipientName: recipient,
      content,
      timestamp: new Date().toISOString(),
    };

    await kv.set(`message:${messageId}`, message);
    
    return c.json({ messageId, message });
  } catch (error) {
    console.log("Send message error:", error);
    return c.json({ error: "Failed to send message" }, 500);
  }
});

// Initialize with sample data
app.post("/make-server-d5b5d02c/init-sample-data", async (c) => {
  const user = await getAuthenticatedUser(c.req.header("Authorization"));
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    // Check if data already exists
    const existing = await kv.getByPrefix("knowledge:");
    if (existing.length > 0) {
      return c.json({ message: "Sample data already exists" });
    }

    // Add sample knowledge items
    const knowledgeItems = [
      {
        id: crypto.randomUUID(),
        type: "document",
        title: "API Integration Guidelines - Version 2.3",
        description: "Comprehensive guide for integrating with MRI APIs, including authentication, rate limiting, and best practices.",
        author: "Alex Chen",
        authorId: user.id,
        team: "Engineering",
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        tags: ["API", "Integration", "Documentation"],
        relevance: 98,
      },
      {
        id: crypto.randomUUID(),
        type: "discussion",
        title: "Multi-tenant Architecture Discussion Thread",
        description: "Active discussion about implementing multi-tenant architecture for the new client portal. Includes code examples and security considerations.",
        author: "Lisa Thompson",
        authorId: user.id,
        team: "Architecture",
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        tags: ["Architecture", "Multi-tenant", "Security"],
        relevance: 95,
      },
    ];

    for (const item of knowledgeItems) {
      await kv.set(`knowledge:${item.id}`, item);
    }

    // Add sample projects
    const sampleProjects = [
      {
        id: crypto.randomUUID(),
        name: "Client Portal Redesign",
        description: "Modern web portal for clients to manage their properties and view analytics",
        team: "Product & Engineering",
        status: "In Progress",
        progress: 68,
        members: 12,
        connectedProjects: ["Analytics Dashboard", "Mobile App"],
        tags: ["Frontend", "UX", "API"],
        timeline: "Q4 2025",
        createdBy: user.id,
        createdAt: new Date().toISOString(),
      },
    ];

    for (const project of sampleProjects) {
      await kv.set(`project:${project.id}`, project);
    }

    return c.json({ message: "Sample data initialized" });
  } catch (error) {
    console.log("Init sample data error:", error);
    return c.json({ error: "Failed to initialize sample data" }, 500);
  }
});

Deno.serve(app.fetch);