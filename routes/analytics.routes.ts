import { Router, Request, Response } from 'express';
import Chatbox from '../models/chatbox.model';
import User from '../models/user.model';

const router = Router();

function ensureAnalytics(chatbox: any) {
  if (!chatbox.analytics) {
    chatbox.analytics = {
      lastUpdated: new Date(),
      totalToken: 0,
      totalTokenUsed: 0,
      dailyUsage: [],
      websiteVisits: 0,
      avgSessionTime: 0,
      conversationsInitiated: 0,
      totalConversations: 0,
      avgConversationTime: 0,
      leadsCollected: 0,
    };
  }
  return chatbox.analytics;
}

// Calculate tokens based on message length
function calculateTokens(text: string): number {
  if (!text) return 0;
  
  // Rough estimation: 1 token ≈ 4 characters for English text
  const charCount = text.length;
  const estimatedTokens = Math.ceil(charCount / 4);
  
  // Ensure minimum 1 token and maximum 5 tokens per message
  return Math.max(1, Math.min(5, estimatedTokens));
}

/**
 * POST /api/analytics/visit/:name
 * Increment website visit count.
 */
router.post('/visit/:name', async (req: Request, res: Response) => {
  const { name } = req.params;

  try {
    const chatbox = await Chatbox.findOne({ name });
    if (!chatbox) return res.status(404).json({ message: 'Chatbox not found' });

    const analytics = ensureAnalytics(chatbox);
    
    // Increment website visits
    analytics.websiteVisits = (analytics.websiteVisits || 0) + 1;
    analytics.lastUpdated = new Date();

    await chatbox.save();

    return res.status(200).json({
      visits: analytics.websiteVisits
    });
  } catch (err) {
    console.error(`[Analytics] Visit error for "${name}":`, err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/analytics/initiate/:name
 * Track conversation initiation and create new conversation.
 */
router.post('/initiate/:name', async (req: Request, res: Response) => {
  const { name } = req.params;

  try {
    const chatbox = await Chatbox.findOne({ name });
    if (!chatbox) return res.status(404).json({ message: 'Chatbox not found' });

    const analytics = ensureAnalytics(chatbox);
    
    // Increment conversations initiated
    analytics.conversationsInitiated = (analytics.conversationsInitiated || 0) + 1;
    analytics.lastUpdated = new Date();

    // Create new conversation
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newConversation = {
      id: conversationId,
      timestamp: new Date(),
      duration: 0,
      messageCount: 0,
      messages: [],
      tokensUsed: 0,
      website: req.headers.origin || req.headers.referer || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      status: 'active'
    };

    if (!chatbox.conversations) {
      chatbox.conversations = [] as any;
    }
    chatbox.conversations.push(newConversation);

    await chatbox.save();

    return res.status(200).json({
      conversationsInitiated: analytics.conversationsInitiated,
      conversationId: conversationId
    });
  } catch (err) {
    console.error(`[Analytics] Initiate error for "${name}":`, err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/analytics/message/:name
 * Add message to conversation and track message count and token usage.
 */
router.post('/message/:name', async (req: Request, res: Response) => {
  const { name } = req.params;
  const { conversationId, role, content } = req.body;

  try {
    const chatbox = await Chatbox.findOne({ name });
    if (!chatbox) return res.status(404).json({ message: 'Chatbox not found' });

    if (!chatbox.conversations) {
      chatbox.conversations = [] as any;
    }

    // Find the conversation
    const conversation = chatbox.conversations.find(conv => conv.id === conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Calculate tokens for this message
    const tokensForMessage = calculateTokens(content);

    // Add message
    conversation.messages.push({
      role,
      content,
      timestamp: new Date(),
      tokensUsed: tokensForMessage
    });

    // Update message count and total tokens used
    conversation.messageCount = conversation.messages.length;
    conversation.tokensUsed = (conversation.tokensUsed || 0) + tokensForMessage;

    // Update chatbox analytics
    const analytics = ensureAnalytics(chatbox);
    analytics.totalTokenUsed = (analytics.totalTokenUsed || 0) + tokensForMessage;
    analytics.lastUpdated = new Date();

    // Update user's remaining tokens
    const user = await User.findById(chatbox.createdBy);
    if (user && user.tokens) {
      const currentTokens = user.tokens.remaining || 0;
      console.log(`[Token Debug] User ${user._id}: Current tokens: ${currentTokens}, Tokens for message: ${tokensForMessage}`);
      
      if (currentTokens >= tokensForMessage) {
        user.tokens.remaining = currentTokens - tokensForMessage;
        user.tokens.used = (user.tokens.used || 0) + tokensForMessage;
        await user.save();
        console.log(`[Token Debug] User ${user._id}: Tokens deducted. New remaining: ${user.tokens.remaining}, New used: ${user.tokens.used}`);
      } else {
        // Not enough tokens - could handle this case differently
        console.warn(`User ${user._id} has insufficient tokens for message. Available: ${currentTokens}, Required: ${tokensForMessage}`);
      }
    } else {
      console.warn(`[Token Debug] User ${chatbox.createdBy} not found or has no tokens object`);
    }

    await chatbox.save();

    return res.status(200).json({
      message: 'Message saved',
      messageCount: conversation.messageCount,
      tokensUsed: conversation.tokensUsed,
      tokensForMessage: tokensForMessage
    });
  } catch (err) {
    console.error(`[Analytics] Message error for "${name}":`, err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/analytics/complete/:name
 * Track a completed conversation.
 * Body: { conversationId: string, duration: number }
 */
router.post('/complete/:name', async (req: Request, res: Response) => {
  const { name } = req.params;
  
  // Handle both JSON and string data from sendBeacon
  let conversationId, duration;
  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body);
      conversationId = parsed.conversationId;
      duration = parsed.duration;
    } catch (e) {
      return res.status(400).json({ message: 'Invalid request body' });
    }
  } else {
    conversationId = req.body.conversationId;
    duration = req.body.duration;
  }

  if (!conversationId || typeof duration !== 'number' || duration <= 0) {
    return res.status(400).json({ message: 'Invalid conversationId or duration' });
  }

  try {
    const chatbox = await Chatbox.findOne({ name });
    if (!chatbox) return res.status(404).json({ message: 'Chatbox not found' });

    const analytics = ensureAnalytics(chatbox);

    // Find and update conversation
    if (chatbox.conversations) {
      const conversation = chatbox.conversations.find(conv => conv.id === conversationId);
      if (conversation) {
        conversation.duration = duration;
        conversation.status = 'completed';
      }
    }

    // Update analytics
    const prevCount = analytics.totalConversations || 0;
    const prevAvg = analytics.avgConversationTime || 0;

    const newCount = prevCount + 1;
    const newAvg = (prevAvg * prevCount + duration) / newCount;

    analytics.totalConversations = newCount;
    analytics.avgConversationTime = newAvg;
    analytics.lastUpdated = new Date();

    await chatbox.save();

    return res.status(200).json({
      totalConversations: newCount,
      avgConversationTime: newAvg
    });
  } catch (err) {
    console.error(`[Analytics] Complete error for "${name}":`, err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/analytics/session/:name
 * Track user session duration.
 * Body: { duration: number }
 */
router.post('/session/:name', async (req: Request, res: Response) => {
  const { name } = req.params;
  
  // Handle both JSON and string data from sendBeacon
  let duration;
  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body);
      duration = parsed.duration;
    } catch (e) {
      return res.status(400).json({ message: 'Invalid request body' });
    }
  } else {
    duration = req.body.duration;
  }

  if (typeof duration !== 'number' || duration <= 0) {
    return res.status(400).json({ message: 'Invalid duration' });
  }

  try {
    const chatbox = await Chatbox.findOne({ name });
    if (!chatbox) return res.status(404).json({ message: 'Chatbox not found' });

    const analytics = ensureAnalytics(chatbox);

    const visits = analytics.websiteVisits || 1; // Avoid divide by 0
    const prevAvg = analytics.avgSessionTime || 0;

    const newAvg = (prevAvg * (visits - 1) + duration) / visits;

    analytics.avgSessionTime = newAvg;
    analytics.lastUpdated = new Date();

    await chatbox.save();

    return res.status(200).json({ avgSessionTime: newAvg });
  } catch (err) {
    console.error(`[Analytics] Session error for "${name}":`, err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
