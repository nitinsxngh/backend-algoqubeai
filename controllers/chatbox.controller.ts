import { Request, Response } from 'express';
import axios from 'axios';
import Chatbox from '../models/chatbox.model';
import { uploadTextToS3 } from '../utils/s3';
import jwt from 'jsonwebtoken';

// 🧠 Helper to extract user from JWT (cookie or header)
const getUserFromRequest = (req: Request) => {
  let token: string | undefined;

  // Try cookies first
  if (req.cookies?.token) {
    token = req.cookies.token;
    console.log('[Auth] Token found in cookie');
  }

  // Fallback to Authorization header
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
    console.log('[Auth] Token found in Authorization header');
  }

  if (!token) {
    console.warn('[Auth] No token found in request');
    throw new Error('Unauthorized: No token');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    console.log('[Auth] Token verified. User ID:', decoded.id);
    return decoded.id;
  } catch (err) {
    console.error('[Auth] Invalid token', err);
    throw new Error('Unauthorized: Invalid token');
  }
};

// 🆕 Create chatbox
export const createChatbox = async (req: Request, res: Response) => {
  try {
    const userId = getUserFromRequest(req);
    console.log('[CreateChatbox] User ID:', userId);

    const existing = await Chatbox.findOne({ createdBy: userId });
    if (existing) {
      return res.status(400).json({ error: 'You already created a chatbot' });
    }

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

    if (!organizationName) {
      return res.status(400).json({ error: 'organizationName is required' });
    }

    const filename = `${organizationName}-${Date.now()}.txt`;
    const s3Url = await uploadTextToS3(filename.replace('.txt', ''), customContent || '');

    const newChatbox = await Chatbox.create({
      name: filename.replace('.txt', ''),
      organizationName,
      category,
      domainUrl,
      status: status || 'active',
      customContent,
      ocrData: '',
      scrapedData: '',
      createdBy: userId,
      configuration: {
        textFont,
        themeColor,
        displayName,
        profileAvatar: '',
      },
    });

    try {
      await axios.post('https://sangam.xendrax.in/webhook/226d2eb3-8b2f-45fe-8c1f-eaa8276ae849', {
        filename,
      });
    } catch (webhookErr: unknown) {
      console.warn('[Webhook Warning]', webhookErr instanceof Error ? webhookErr.message : webhookErr);
    }

    res.status(201).json({
      message: 'Chatbox created',
      chatbox: newChatbox,
      contentFileUrl: s3Url,
    });
  } catch (err: any) {
    console.error('[Create Chatbox Error]', err);
    res.status(401).json({ error: err.message || 'Failed to create chatbox' });
  }
};

// 🔄 Get user's chatbox
export const getChatboxes = async (req: Request, res: Response) => {
  try {
    const userId = getUserFromRequest(req);
    console.log('[GetChatboxes] User ID:', userId);

    const chatbox = await Chatbox.findOne({ createdBy: userId }).sort({ createdAt: -1 }).populate('createdBy');
    if (!chatbox) {
      console.log('[GetChatboxes] No chatbox found');
      return res.json(null);
    }

    res.json(chatbox);
  } catch (err: any) {
    console.error('[Get Chatboxes Error]', err);
    res.status(401).json({ error: err.message || 'Failed to fetch chatbox' });
  }
};

// 🔍 Get chatbox by ID with auth check
export const getChatboxById = async (req: Request, res: Response) => {
  try {
    const userId = getUserFromRequest(req);
    console.log('[GetChatboxById] User ID:', userId, 'Chatbox ID:', req.params.id);

    const chatbox = await Chatbox.findById(req.params.id).populate('createdBy');

    if (!chatbox || chatbox.createdBy._id.toString() !== userId) {
      console.warn('[GetChatboxById] Access denied for user:', userId);
      return res.status(403).json({ message: 'Forbidden: Access denied' });
    }

    res.json(chatbox);
  } catch (err: any) {
    console.error('[Get Chatbox By ID Error]', err);
    res.status(401).json({ error: err.message || 'Failed to fetch chatbox' });
  }
};

// ✏️ Update chatbox
export const updateChatbox = async (req: Request, res: Response) => {
  try {
    const userId = getUserFromRequest(req);
    const { customContent } = req.body;

    console.log('[UpdateChatbox] User ID:', userId, 'Chatbox ID:', req.params.id);

    const chatbox = await Chatbox.findById(req.params.id);
    if (!chatbox || chatbox.createdBy.toString() !== userId) {
      console.warn('[UpdateChatbox] Unauthorized update attempt by user:', userId);
      return res.status(403).json({ message: 'Forbidden: Access denied' });
    }

    if (customContent !== undefined) {
      const filename = chatbox.name;
      await uploadTextToS3(filename, customContent);

      try {
        await axios.post('https://sangam.xendrax.in/webhook/226d2eb3-8b2f-45fe-8c1f-eaa8276ae849', {
          filename: `${filename}.txt`,
        });
      } catch (webhookErr: unknown) {
        console.warn('[Webhook Warning]', webhookErr instanceof Error ? webhookErr.message : webhookErr);
      }
    }

    const updated = await Chatbox.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    }).populate('createdBy');

    res.json({ message: 'Updated successfully', chatbox: updated });
  } catch (err: any) {
    console.error('[Update Chatbox Error]', err);
    res.status(401).json({ error: err.message || 'Failed to update chatbox' });
  }
};

// ❌ Delete chatbox
export const deleteChatbox = async (req: Request, res: Response) => {
  try {
    const userId = getUserFromRequest(req);
    console.log('[DeleteChatbox] User ID:', userId, 'Chatbox ID:', req.params.id);

    const chatbox = await Chatbox.findById(req.params.id);

    if (!chatbox || chatbox.createdBy.toString() !== userId) {
      console.warn('[DeleteChatbox] Unauthorized delete attempt by user:', userId);
      return res.status(403).json({ message: 'Forbidden: Access denied' });
    }

    await Chatbox.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err: any) {
    console.error('[Delete Chatbox Error]', err);
    res.status(401).json({ error: err.message || 'Failed to delete chatbox' });
  }
};

// 🔍 Get chatbox by name (publicly accessible)
export const getChatboxByName = async (req: Request, res: Response) => {
  const nameParam = req.params.name;
  console.log('[ROUTE HIT] by-name:', nameParam);

  try {
    const chatbox = await Chatbox.findOne({
      name: new RegExp(`^${nameParam}$`, 'i'),
    }).populate('createdBy');

    if (!chatbox) {
      console.warn('[NOT FOUND] Chatbox not found:', nameParam);
      return res.status(404).json({ message: 'Chatbox not found' });
    }

    res.json({ chatbox });
  } catch (err) {
    console.error('[ERROR] getChatboxByName:', err);
    res.status(500).json({ error: 'Failed to fetch chatbox by name' });
  }
};
