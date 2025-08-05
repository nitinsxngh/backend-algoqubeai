import express from 'express';
import {
  createChatbox,
  getChatboxes,
  getChatboxById,
  updateChatbox,
  deleteChatbox,
  getChatboxByName,
  updateChatboxConfiguration,
  incrementWebsiteVisits,
  analyzeWebsiteColors,
} from '../controllers/chatbox.controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Public routes (no authentication required) - MUST come before parameterized routes
router.get('/analyze-colors', analyzeWebsiteColors);
router.post('/increment-visit', incrementWebsiteVisits);
router.get('/by-name/:name', getChatboxByName); // Public route for embed.js

// Protected routes (require authentication)
router.post('/', authenticate, createChatbox);
router.get('/', authenticate, getChatboxes);
router.get('/:id', authenticate, getChatboxById);
router.put('/:id', authenticate, updateChatbox);
router.delete('/:id', authenticate, deleteChatbox);
router.patch('/:id/configuration', authenticate, updateChatboxConfiguration);

export default router;
