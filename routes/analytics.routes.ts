import express, { Request, Response } from 'express';
import Chatbox from '../models/chatbox.model';
import Conversation from '../models/conversation.model';
import User from '../models/user.model';

const router = express.Router();

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
    
    const newConversation = new Conversation({
      chatboxId: chatbox._id,
      chatboxName: chatbox.name,
      conversationId: conversationId,
      website: req.headers.origin || req.headers.referer || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      status: 'active'
    });

    await newConversation.save();

    // Update chatbox analytics
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

    // Find the conversation
    const conversation = await Conversation.findOne({ 
      chatboxName: name, 
      conversationId: conversationId 
    });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Calculate tokens for this message
    const tokensForMessage = calculateTokens(content);

    // Add message to conversation
    conversation.messages.push({
      role,
      content,
      timestamp: new Date(),
      tokensUsed: tokensForMessage
    });
    conversation.messageCount = conversation.messages.length;
    conversation.tokensUsed += tokensForMessage;
    await conversation.save();

    // Update chatbox analytics
    const analytics = ensureAnalytics(chatbox);
    analytics.totalTokenUsed = (analytics.totalTokenUsed || 0) + tokensForMessage;
    analytics.lastUpdated = new Date();

    // Update user's remaining tokens with retry logic
    const user = await User.findById(chatbox.createdBy);
    if (user && user.tokens) {
      const currentTokens = user.tokens.remaining || 0;
      console.log(`[Token Debug] User ${user._id}: Current tokens: ${currentTokens}, Tokens for message: ${tokensForMessage}`);
      
      if (currentTokens >= tokensForMessage) {
        // Use findByIdAndUpdate to avoid version conflicts
        try {
          await User.findByIdAndUpdate(
            user._id,
            {
              $inc: {
                'tokens.used': tokensForMessage,
                'tokens.remaining': -tokensForMessage
              }
            },
            { new: true }
          );
          console.log(`[Token Debug] User ${user._id}: Tokens deducted. New remaining: ${currentTokens - tokensForMessage}, New used: ${(user.tokens.used || 0) + tokensForMessage}`);
        } catch (userError) {
          console.error(`[Token Debug] Error updating user tokens:`, userError);
          // Continue with chatbox save even if user token update fails
        }
      } else {
        // Not enough tokens - could handle this case differently
        console.warn(`User ${user._id} has insufficient tokens for message. Available: ${currentTokens}, Required: ${tokensForMessage}`);
      }
    } else {
      console.warn(`[Token Debug] User ${chatbox.createdBy} not found or has no tokens object`);
    }

    // Save chatbox analytics
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

    // Find and update conversation
    const conversation = await Conversation.findOne({ 
      chatboxName: name, 
      conversationId: conversationId 
    });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Update conversation status and duration
    conversation.status = 'completed';
    conversation.duration = duration;
    await conversation.save();

    // Update chatbox analytics
    const analytics = ensureAnalytics(chatbox);
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

/**
 * GET /api/analytics/conversations/:name
 * Get all conversations for a specific chatbox
 */
router.get('/conversations/:name', async (req: Request, res: Response) => {
  const { name } = req.params;
  const { page = 1, limit = 20, status, startDate, endDate } = req.query;

  try {
    const chatbox = await Chatbox.findOne({ name });
    if (!chatbox) return res.status(404).json({ message: 'Chatbox not found' });

    const options = {
      status,
      startDate,
      endDate,
      limit: parseInt(limit as string),
      skip: (parseInt(page as string) - 1) * parseInt(limit as string)
    };

    const query: any = { chatboxName: name };
    if (options.status && options.status !== 'all') {
      query.status = options.status;
    }
    if (options.startDate || options.endDate) {
      query.timestamp = {};
      if (options.startDate) query.timestamp.$gte = new Date(options.startDate as string);
      if (options.endDate) query.timestamp.$lte = new Date(options.endDate as string);
    }
    
    const conversations = await Conversation.find(query)
      .sort({ timestamp: -1 })
      .limit(options.limit || 20)
      .skip(options.skip || 0);
    const totalConversations = await Conversation.countDocuments({ 
      chatboxName: name,
      ...(status && status !== 'all' ? { status } : {}),
      ...(startDate || endDate ? {
        timestamp: {
          ...(startDate ? { $gte: new Date(startDate as string) } : {}),
          ...(endDate ? { $lte: new Date(endDate as string) } : {})
        }
      } : {})
    });

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    return res.status(200).json({
      conversations,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalConversations / limitNum),
        totalConversations,
        hasNext: pageNum * limitNum < totalConversations,
        hasPrev: pageNum > 1
      }
    });
  } catch (err) {
    console.error(`[Analytics] Get conversations error for "${name}":`, err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/analytics/conversation/:name/:conversationId
 * Get a specific conversation with all messages
 */
router.get('/conversation/:name/:conversationId', async (req: Request, res: Response) => {
  const { name, conversationId } = req.params;

  try {
    const chatbox = await Chatbox.findOne({ name });
    if (!chatbox) return res.status(404).json({ message: 'Chatbox not found' });

    const conversation = await Conversation.findOne({ 
      chatboxName: name, 
      conversationId: conversationId 
    });
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    return res.status(200).json({
      conversation: conversation
    });
  } catch (err) {
    console.error(`[Analytics] Get conversation error for "${name}/${conversationId}":`, err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/analytics/conversation/:name/:conversationId/status
 * Update conversation status (active, completed, abandoned)
 */
router.put('/conversation/:name/:conversationId/status', async (req: Request, res: Response) => {
  const { name, conversationId } = req.params;
  const { status } = req.body;

  if (!['active', 'completed', 'abandoned'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status. Must be active, completed, or abandoned' });
  }

  try {
    const chatbox = await Chatbox.findOne({ name });
    if (!chatbox) return res.status(404).json({ message: 'Chatbox not found' });

    const conversation = await Conversation.findOne({ 
      chatboxName: name, 
      conversationId: conversationId 
    });
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    conversation.status = status;
    if (status === 'completed' && conversation.duration === 0) {
      const startTime = new Date(conversation.timestamp);
      const endTime = new Date();
      conversation.duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    }
    await conversation.save();

    return res.status(200).json({
      message: 'Conversation status updated',
      conversation: {
        id: conversation.conversationId,
        status: conversation.status,
        duration: conversation.duration
      }
    });
  } catch (err) {
    console.error(`[Analytics] Update conversation status error for "${name}/${conversationId}":`, err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * DELETE /api/analytics/conversation/:name/:conversationId
 * Delete a specific conversation
 */
router.delete('/conversation/:name/:conversationId', async (req: Request, res: Response) => {
  const { name, conversationId } = req.params;

  try {
    const chatbox = await Chatbox.findOne({ name });
    if (!chatbox) return res.status(404).json({ message: 'Chatbox not found' });

    const conversation = await Conversation.findOne({ 
      chatboxName: name, 
      conversationId: conversationId 
    });
    if (!conversation) return res.status(404).json({ message: 'Conversation not found' });

    await Conversation.findByIdAndDelete(conversation._id);

    return res.status(200).json({
      message: 'Conversation deleted successfully'
    });
  } catch (err) {
    console.error(`[Analytics] Delete conversation error for "${name}/${conversationId}":`, err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/analytics/conversations/:name/export
 * Export conversations to JSON or CSV format
 */
router.post('/conversations/:name/export', async (req: Request, res: Response) => {
  const { name } = req.params;
  const { format = 'json', status, startDate, endDate } = req.body;

  if (!['json', 'csv'].includes(format)) {
    return res.status(400).json({ message: 'Invalid format. Must be json or csv' });
  }

  try {
    const chatbox = await Chatbox.findOne({ name }).select('organizationName');
    if (!chatbox) return res.status(404).json({ message: 'Chatbox not found' });

    const query: any = { chatboxName: name };
    
    // Apply filters
    if (status && status !== 'all') {
      query.status = status;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const conversations = await Conversation.find(query).sort({ timestamp: -1 });

    if (format === 'json') {
      return res.status(200).json({
        chatboxName: name,
        organizationName: chatbox.organizationName,
        exportDate: new Date().toISOString(),
        totalConversations: conversations.length,
        conversations: conversations
      });
    } else {
      // CSV format
      const csvHeaders = [
        'Conversation ID',
        'Timestamp',
        'Duration (seconds)',
        'Message Count',
        'Tokens Used',
        'Status',
        'Website',
        'User Agent',
        'IP Address'
      ];

      const csvRows = conversations.map(conv => [
        conv.conversationId,
        conv.timestamp,
        conv.duration,
        conv.messageCount,
        conv.tokensUsed,
        conv.status,
        conv.website || '',
        conv.userAgent || '',
        conv.ip || ''
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${name}_conversations_${new Date().toISOString().split('T')[0]}.csv"`);
      
      return res.status(200).send(csvContent);
    }
  } catch (err) {
    console.error(`[Analytics] Export conversations error for "${name}":`, err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/analytics/conversations/:name/stats
 * Get conversation statistics for a chatbox
 */
router.get('/conversations/:name/stats', async (req: Request, res: Response) => {
  const { name } = req.params;
  const { startDate, endDate } = req.query;

  try {
    const chatbox = await Chatbox.findOne({ name }).select('analytics');
    if (!chatbox) return res.status(404).json({ message: 'Chatbox not found' });

    const options = { startDate, endDate };
    const matchQuery: any = { chatboxName: name };
    if (options.startDate || options.endDate) {
      matchQuery.timestamp = {};
      if (options.startDate) matchQuery.timestamp.$gte = new Date(options.startDate as string);
      if (options.endDate) matchQuery.timestamp.$lte = new Date(options.endDate as string);
    }
    
    const stats = await Conversation.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalConversations: { $sum: 1 },
          activeConversations: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          completedConversations: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          abandonedConversations: { $sum: { $cond: [{ $eq: ['$status', 'abandoned'] }, 1, 0] } },
          totalMessages: { $sum: '$messageCount' },
          totalTokens: { $sum: '$tokensUsed' },
          avgDuration: { $avg: '$duration' },
          avgMessagesPerConversation: { $avg: '$messageCount' }
        }
      }
    ]);
    
    const statsData = stats[0] || {
      totalConversations: 0,
      activeConversations: 0,
      completedConversations: 0,
      abandonedConversations: 0,
      totalMessages: 0,
      totalTokens: 0,
      avgDuration: 0,
      avgMessagesPerConversation: 0
    };

    // Get daily conversation counts
    const query: any = { chatboxName: name };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
    }

    const conversations = await Conversation.find(query).select('timestamp');
    const dailyStats = conversations.reduce((acc, conv) => {
      const date = new Date(conv.timestamp).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return res.status(200).json({
      chatboxName: name,
      period: {
        startDate: startDate || null,
        endDate: endDate || null
      },
      overview: {
        totalConversations: statsData.totalConversations,
        activeConversations: statsData.activeConversations,
        completedConversations: statsData.completedConversations,
        abandonedConversations: statsData.abandonedConversations,
        completionRate: statsData.totalConversations > 0 ? (statsData.completedConversations / statsData.totalConversations) * 100 : 0
      },
      engagement: {
        totalMessages: statsData.totalMessages,
        totalTokens: statsData.totalTokens,
        avgMessagesPerConversation: Math.round(statsData.avgMessagesPerConversation * 100) / 100,
        avgDuration: Math.round(statsData.avgDuration * 100) / 100
      },
      dailyStats
    });
  } catch (err) {
    console.error(`[Analytics] Get conversation stats error for "${name}":`, err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
