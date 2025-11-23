import { Request, Response } from 'express';
import Lead from '../models/lead.model';
import Chatbox from '../models/chatbox.model';
import { AuthenticatedRequest } from '../middleware/auth';

const ALLOWED_STATUSES = ['new', 'in_progress', 'contacted', 'converted', 'closed'] as const;

export const createLead = async (req: Request, res: Response) => {
  try {
    const {
      chatboxId,
      name,
      email,
      phone,
      company,
      message,
      sourceMessage,
      conversationId,
      status,
    } = req.body;

    if (!chatboxId) {
      return res.status(400).json({ message: 'chatboxId is required' });
    }

    if (!name || !email || !phone || !company) {
      return res.status(400).json({ message: 'Missing required lead fields' });
    }

    const chatbox = await Chatbox.findById(chatboxId);

    if (!chatbox) {
      return res.status(404).json({ message: 'Chatbot not found' });
    }

    const isChatboxActive =
      typeof chatbox.status === 'string'
        ? chatbox.status.trim().toLowerCase() === 'active'
        : false;

    if (!isChatboxActive) {
      console.warn(
        `[LeadController] Chatbot ${chatbox._id} is not active (status: ${chatbox.status}). Capturing lead regardless.`
      );
    }

    const lead = await Lead.create({
      chatbox: chatbox._id,
      createdBy: chatbox.createdBy,
      chatbotName: chatbox.name,
      chatbotDisplayName: chatbox.configuration?.displayName,
      organizationName: chatbox.organizationName,
      name,
      email,
      phone,
      company,
      message,
      sourceMessage,
      conversationId,
      status: ALLOWED_STATUSES.includes(status) ? status : 'new',
    });

    await Chatbox.findByIdAndUpdate(chatbox._id, {
      $inc: { 'analytics.leadsCollected': 1 },
      $set: { 'analytics.lastUpdated': new Date() },
    });

    res.status(201).json({ message: 'Lead captured successfully', leadId: lead._id });
  } catch (error) {
    console.error('[Create Lead Error]', error);
    res.status(500).json({ message: 'Failed to capture lead' });
  }
};

export const getLeads = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { chatboxId } = req.query;

    const query: Record<string, unknown> = { createdBy: req.user.id };
    if (chatboxId) {
      query.chatbox = chatboxId;
    }

    const leads = await Lead.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ leads });
  } catch (error) {
    console.error('[Get Leads Error]', error);
    res.status(500).json({ message: 'Failed to fetch leads' });
  }
};

export const updateLead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { id } = req.params;
    const { status } = req.body as { status?: string };

    if (!status || !ALLOWED_STATUSES.includes(status as typeof ALLOWED_STATUSES[number])) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const updated = await Lead.findOneAndUpdate(
      { _id: id, createdBy: req.user.id },
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json({ message: 'Lead updated', lead: updated });
  } catch (error) {
    console.error('[Update Lead Error]', error);
    res.status(500).json({ message: 'Failed to update lead' });
  }
};

