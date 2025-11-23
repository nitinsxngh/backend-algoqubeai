import express, { Request, Response } from 'express';
import Chatbox from '../models/chatbox.model';
import Conversation from '../models/conversation.model';
import { authenticate } from '../middleware/auth';

// Extend Request type for authentication
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/conversations
 * Get all conversations for the authenticated user's chatboxes
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { page = 1, limit = 20, status, startDate, endDate, chatboxName } = req.query;

    // Build query for user's chatboxes
    const chatboxQuery: any = { createdBy: userId };
    if (chatboxName) {
      chatboxQuery.name = { $regex: chatboxName, $options: 'i' };
    }

    const chatboxes = await Chatbox.find(chatboxQuery).select('name organizationName');
    const chatboxNames = chatboxes.map(cb => cb.name);
    
    // Get all conversations for user's chatboxes
    const query: any = { chatboxName: { $in: chatboxNames } };
    
    // Apply filters
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
    }
    
    const allConversations = await Conversation.find(query)
      .sort({ timestamp: -1 });

    // Add organization names to conversations
    const conversationsWithOrg = allConversations.map(conv => {
      const chatbox = chatboxes.find(cb => cb.name === conv.chatboxName);
      return {
        ...conv.toObject(),
        organizationName: chatbox?.organizationName || 'Unknown'
      };
    });

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedConversations = conversationsWithOrg.slice(startIndex, endIndex);

    return res.status(200).json({
      conversations: paginatedConversations,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(conversationsWithOrg.length / limitNum),
        totalConversations: conversationsWithOrg.length,
        hasNext: endIndex < conversationsWithOrg.length,
        hasPrev: pageNum > 1
      }
    });
  } catch (err) {
    console.error('[Conversations] Get all conversations error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/conversations/:chatboxName
 * Get conversations for a specific chatbox (must belong to authenticated user)
 */
router.get('/:chatboxName', async (req: AuthenticatedRequest, res: Response) => {
  const { chatboxName } = req.params;
  const { page = 1, limit = 20, status, startDate, endDate } = req.query;

  try {
    const userId = req.user?.id;
    
    const chatbox = await Chatbox.findOne({ 
      name: chatboxName, 
      createdBy: userId 
    }).select('organizationName');
    
    if (!chatbox) {
      return res.status(404).json({ message: 'Chatbox not found or access denied' });
    }

    const query: any = { chatboxName };

    // Apply filters
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
    }
    
    const conversations = await Conversation.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit as string))
      .skip((parseInt(page as string) - 1) * parseInt(limit as string));

    const totalConversations = await Conversation.countDocuments(query);
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    return res.status(200).json({
      chatboxName: chatbox.name,
      organizationName: chatbox.organizationName,
      conversations: conversations,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalConversations / limitNum),
        totalConversations: totalConversations,
        hasNext: pageNum * limitNum < totalConversations,
        hasPrev: pageNum > 1
      }
    });
  } catch (err) {
    console.error(`[Conversations] Get conversations for "${chatboxName}" error:`, err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/conversations/:chatboxName/:conversationId
 * Get a specific conversation with all messages
 */
router.get('/:chatboxName/:conversationId', async (req: AuthenticatedRequest, res: Response) => {
  const { chatboxName, conversationId } = req.params;

  try {
    const userId = req.user?.id;
    
    const chatbox = await Chatbox.findOne({ 
      name: chatboxName, 
      createdBy: userId 
    }).select('organizationName');
    
    if (!chatbox) {
      return res.status(404).json({ message: 'Chatbox not found or access denied' });
    }

    const conversation = await Conversation.findOne({ 
      chatboxName, 
      conversationId 
    });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    return res.status(200).json({
      chatboxName: chatbox.name,
      organizationName: chatbox.organizationName,
      conversation: conversation
    });
  } catch (err) {
    console.error(`[Conversations] Get conversation "${chatboxName}/${conversationId}" error:`, err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/conversations/:chatboxName/:conversationId/status
 * Update conversation status
 */
router.put('/:chatboxName/:conversationId/status', async (req: AuthenticatedRequest, res: Response) => {
  const { chatboxName, conversationId } = req.params;
  const { status } = req.body;

  if (!['active', 'completed', 'abandoned'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status. Must be active, completed, or abandoned' });
  }

  try {
    const userId = req.user?.id;
    
    const chatbox = await Chatbox.findOne({ 
      name: chatboxName, 
      createdBy: userId 
    });
    
    if (!chatbox) {
      return res.status(404).json({ message: 'Chatbox not found or access denied' });
    }

    const conversation = await Conversation.findOne({ 
      chatboxName, 
      conversationId 
    });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    conversation.status = status;
    
    // If completing conversation, update duration if not already set
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
    console.error(`[Conversations] Update status "${chatboxName}/${conversationId}" error:`, err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * DELETE /api/conversations/:chatboxName/:conversationId
 * Delete a specific conversation
 */
router.delete('/:chatboxName/:conversationId', async (req: AuthenticatedRequest, res: Response) => {
  const { chatboxName, conversationId } = req.params;

  try {
    const userId = req.user?.id;
    
    const chatbox = await Chatbox.findOne({ 
      name: chatboxName, 
      createdBy: userId 
    });
    
    if (!chatbox) {
      return res.status(404).json({ message: 'Chatbox not found or access denied' });
    }

    const conversation = await Conversation.findOne({ 
      chatboxName, 
      conversationId 
    });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    await Conversation.findByIdAndDelete(conversation._id);

    return res.status(200).json({
      message: 'Conversation deleted successfully'
    });
  } catch (err) {
    console.error(`[Conversations] Delete "${chatboxName}/${conversationId}" error:`, err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/conversations/:chatboxName/export
 * Export conversations to JSON or CSV format
 */
router.post('/:chatboxName/export', async (req: AuthenticatedRequest, res: Response) => {
  const { chatboxName } = req.params;
  const { format = 'json', status, startDate, endDate } = req.body;

  if (!['json', 'csv'].includes(format)) {
    return res.status(400).json({ message: 'Invalid format. Must be json or csv' });
  }

  try {
    const userId = req.user?.id;
    
    const chatbox = await Chatbox.findOne({ 
      name: chatboxName, 
      createdBy: userId 
    }).select('organizationName');
    
    if (!chatbox) {
      return res.status(404).json({ message: 'Chatbox not found or access denied' });
    }

    const query: any = { chatboxName };

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
        chatboxName: chatbox.name,
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
      res.setHeader('Content-Disposition', `attachment; filename="${chatboxName}_conversations_${new Date().toISOString().split('T')[0]}.csv"`);
      
      return res.status(200).send(csvContent);
    }
  } catch (err) {
    console.error(`[Conversations] Export "${chatboxName}" error:`, err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/conversations/:chatboxName/stats
 * Get conversation statistics for a chatbox
 */
router.get('/:chatboxName/stats', async (req: AuthenticatedRequest, res: Response) => {
  const { chatboxName } = req.params;
  const { startDate, endDate } = req.query;

  try {
    const userId = req.user?.id;
    
    const chatbox = await Chatbox.findOne({ 
      name: chatboxName, 
      createdBy: userId 
    }).select('analytics');
    
    if (!chatbox) {
      return res.status(404).json({ message: 'Chatbox not found or access denied' });
    }

    const query: any = { chatboxName };

    // Filter by date range if provided
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate as string);
      if (endDate) query.timestamp.$lte = new Date(endDate as string);
    }
    
    const stats = await Conversation.aggregate([
      { $match: query },
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
    const conversations = await Conversation.find(query).select('timestamp');
    const dailyStats = conversations.reduce((acc, conv) => {
      const date = new Date(conv.timestamp).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return res.status(200).json({
      chatboxName: chatbox.name,
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
    console.error(`[Conversations] Get stats for "${chatboxName}" error:`, err);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;