import { Request, Response } from 'express';
import Chatbox from '../models/chatbox.model';

// Create a new chatbox
export const createChatbox = async (req: Request, res: Response) => {
    try {
      const {
        organizationName,
        category,
        domainUrl,
        customContent,
        status,
        textFont,
        themeColor,
        displayName,
      } = req.body;
  
      const newChatbox = await Chatbox.create({
        name: `${organizationName}-${Date.now()}`,
        organizationName,
        category,
        domainUrl,
        status: status || 'active',
        customContent,
        ocrData: '',
        scrapedData: '',
  
        configuration: {
          textFont,
          themeColor,
          displayName,
          profileAvatar: '',
        },
      });
  
      res.status(201).json({ message: 'Chatbox created', chatbox: newChatbox });
    } catch (err) {
      console.error('[Create Chatbox Error]', err);
      res.status(500).json({ error: 'Failed to create chatbox', details: err });
    }
  };

// Get all chatboxes
export const getChatboxes = async (_req: Request, res: Response) => {
  try {
    const chatboxes = await Chatbox.find().sort({ createdAt: -1 });
    res.json(chatboxes);
  } catch (err) {
    console.error('[Get Chatboxes Error]', err);
    res.status(500).json({ error: 'Failed to fetch chatboxes' });
  }
};

// Get single chatbox by ID
export const getChatboxById = async (req: Request, res: Response) => {
  try {
    const chatbox = await Chatbox.findById(req.params.id);
    if (!chatbox) return res.status(404).json({ message: 'Chatbox not found' });
    res.json(chatbox);
  } catch (err) {
    console.error('[Get Chatbox By ID Error]', err);
    res.status(500).json({ error: 'Failed to fetch chatbox' });
  }
};

// Update chatbox
export const updateChatbox = async (req: Request, res: Response) => {
  try {
    const updated = await Chatbox.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: 'Chatbox not found' });
    res.json({ message: 'Updated successfully', chatbox: updated });
  } catch (err) {
    console.error('[Update Chatbox Error]', err);
    res.status(500).json({ error: 'Failed to update chatbox' });
  }
};

// Delete chatbox
export const deleteChatbox = async (req: Request, res: Response) => {
  try {
    const deleted = await Chatbox.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Chatbox not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('[Delete Chatbox Error]', err);
    res.status(500).json({ error: 'Failed to delete chatbox' });
  }
};
